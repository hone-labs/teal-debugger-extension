//
// A simplified wrapper for the teal runtime.
//

import * as vscode from 'vscode';
import { fileExists, readFile, writeFile } from "./lib/file";
import JSON5 from "json5";
import { IExecutionContext, ITealInterpreterConfig, loadValue, TealInterpreter } from "teal-interpreter";
import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";
import { config } from 'process';

export class TealRuntime {

    //
    /// The path for the current loaded TEAL file.
    //
    private loadedTealFilePath?: string = undefined;

    //
    // The name of the configuration that is loaded.
    //
    private loadedConfigurationFilePath?: string = undefined;;

    //
    // The TEAL interpreter.
    //
    private interpreter = new TealInterpreter();

    //
    // The name of the directory that contains TEAL debugger configuration files.
    //
    private readonly tealConfigDir = ".teal-debugger";

    //
    // Gets the file path for the currently loaded TEAL file.
    //
    getLoadedFilePath(): string | undefined {
        return this.loadedTealFilePath;
    }

    //
    // Get the current line of the debugger.
    //
    getCurrentLine(): number | undefined { 
        let curLineNo = this.interpreter.getCurLineNo();
        if (curLineNo !== undefined) {
            curLineNo = curLineNo - 1; // Convert from 1-based to 0-based.
        }
        
        return curLineNo;
    }

    //
    // Sets breakpoints on the debugger.
    // Clears previously set breakpoints.
    //
    setBreakpoints(lines: number[]): void {
        this.interpreter.setBreakpoints(lines);
    }

    //
    // Get the execution context of the interpreter.
    //
    getContext(): IExecutionContext {
        return this.interpreter.context;
    }

    //
    // Starts a TEAL program in the runtime.
    //
    async start(tealFilePath: string): Promise<void> {

        this.loadedTealFilePath = tealFilePath;

        const tealCode = await readFile(tealFilePath);
        const configuration = await this.loadConfiguration(tealFilePath);

        await this.configureInterpreter(configuration, tealCode);
    }

    //
    // Finds an untaken file name. 
    //
    private async chooseNextAvailableFileName(dirPath: string, baseName: string, ext: string): Promise<string> {
        let attempt = 0;
        while (true) {
            const nextPath = attempt === 0
                ? path.join(dirPath, `${baseName}.${ext}`)
                : path.join(dirPath, `${baseName}-${attempt}.${ext}`)
            if (await fs.pathExists(nextPath)) {
                attempt += 1; // Try next one along.
            }
            else {
                // Have a free file.
                return nextPath;
            }
        }
    }

    //
    // Saves the debugger confiugration.
    //
    private async saveConfiguration(config: ITealInterpreterConfig) {
        const fileInfo = path.parse(this.loadedTealFilePath!);
        const configDirPath = path.join(fileInfo.dir, this.tealConfigDir);
        await fs.ensureDir(configDirPath);

        if (this.loadedConfigurationFilePath === undefined) {
            // Find an untaken configuration file name.
            this.loadedConfigurationFilePath = await this.chooseNextAvailableFileName(configDirPath, fileInfo.base, "json");
        }

        await writeFile(this.loadedConfigurationFilePath, JSON.stringify(config, null, 4));
        vscode.window.showInformationMessage(`Saved configuration file ${this.loadedConfigurationFilePath}`);
    }

    //
    // Prompts the user to save their configuration.
    //
    private async promptSaveConfiguration(): Promise<void> {
        const response = await vscode.window.showInformationMessage(
            `Your configuration was updated.\r\nWould you like to save it?`,
            "Yes",
            "No"
        );
        
        if (response === "Yes") {
            await this.saveConfiguration(this.interpreter.context.serialize());
        }
    }

    //
    // Configures the algo-builder interpreter and parses the TEAL code to be debugged.
    //
    private async configureInterpreter(configuration: ITealInterpreterConfig, tealCode: string) {

        this.interpreter = new TealInterpreter();
        this.interpreter.load(tealCode, configuration);
        this.interpreter.context.onConfigNotFound = async (fieldPath: string) => {
            const response = await vscode.window.showInformationMessage(
                `Field "${fieldPath}" is not defined in your configuration. Do you want to create it?`,
                "Yes",
                "No"
            );
            
            if (response === "Yes") {
                let defaultValue = this.interpreter.context.getDefaultValue(fieldPath);
                if (defaultValue === undefined) {
                    defaultValue = "int:0";
                }
                else if (typeof defaultValue === "number") {
                    defaultValue = "int:" + defaultValue;
                }

                let userValue: string | undefined = await vscode.window.showInputBox({
                    title: "Provide default field value",
                    prompt: `Please provide a value for field ${fieldPath}`,
                    value: defaultValue,
                });

                if (userValue === undefined) {
                    userValue = defaultValue;
                }

                this.interpreter.context.autoCreateField(fieldPath, loadValue(userValue!));
                await this.promptSaveConfiguration();
            }
        };
    }

    //
    // Find configuration files that match the TEAL file.
    //
    private async findConfigurationFiles(configDirPath: string, tealFileName?: string): Promise<string[]> {

        await fs.ensureDir(configDirPath);

        if (tealFileName !== undefined) {
            tealFileName = tealFileName.toLowerCase();
        }

        const matchingConfigFiles: string[] = [];

        const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(configDirPath));
        for (const [fileName, fileType] of files) {
            if (fileType !== vscode.FileType.File) {
                continue; // Skip sub-directories.
            }

            const fileNameLwr = fileName.toLowerCase();
            if (tealFileName !== undefined) {
                if (!fileNameLwr.startsWith(tealFileName)) {
                    continue; // Skip this file.
                }
            }

            if (!fileNameLwr.endsWith(".json")) {
                continue; // Skip non-JSON files.
            }

            // Found a matching configuration file.
            matchingConfigFiles.push(fileName);
        }
        
        return matchingConfigFiles;
    }

    //
    // Loads a specific configuration file.
    //
    private async loadSpecificConfiguration(configFilePath: string, loadedConfigurationFilePath: string): Promise<ITealInterpreterConfig> {
        try {
            const config = JSON5.parse(await readFile(configFilePath));    
            vscode.window.showInformationMessage(`Loaded configuration file ${configFilePath}`);
            this.loadedConfigurationFilePath = loadedConfigurationFilePath;
            return config;    
        }
        catch (err: any) {
            const msg = `Failed to load TEAL debugger configuration file: ${configFilePath}`;
            console.error(msg);
            console.error(err && err.stack || err);

            throw new Error(msg);
        }
    }

    //
    // Allows the user to pick a default configuration, then starts a new configuration file from that one.
    //
    private async createNewConfigurationFromDefault(configDirPath: string, tealFileName: string): Promise<ITealInterpreterConfig> {
        const defaultConfigDirPath = path.join(os.homedir(), this.tealConfigDir);
        const defaultConfigFiles: string[] = await this.findConfigurationFiles(defaultConfigDirPath);
        if (defaultConfigFiles.length === 0) {
            throw new Error(`No default configuration files were found at ${defaultConfigDirPath}. You should generate a new configuration and copy it there to create a default.`);
        }

        const createEmptyPrompt = "Create an empty configuration file";
        defaultConfigFiles.push(createEmptyPrompt);

        const defaultPick = await vscode.window.showQuickPick(defaultConfigFiles, {
            title: "Pick a default configuration file to start with:",
        });

        if (defaultPick === undefined) {
            // Fallback: return default configuration.
            const defaultConfig: ITealInterpreterConfig = {};
            return defaultConfig;
        }

        let config: ITealInterpreterConfig;
        const loadedConfigurationFilePath = await this.chooseNextAvailableFileName(configDirPath, tealFileName, "json");

        if (defaultPick === createEmptyPrompt) {
            config = {}; // Empty configuration!
            this.loadedConfigurationFilePath = loadedConfigurationFilePath;
        }
        else {
            const configFilePath = path.join(defaultConfigDirPath, defaultPick);
            config = await this.loadSpecificConfiguration(configFilePath, loadedConfigurationFilePath);
        }

        await this.saveConfiguration(config);
        return config;
    }

    //
    // Loads the TEAL debugger configuration file.
    //
    private async loadConfiguration(tealFilePath: string): Promise<ITealInterpreterConfig> {
        const fileInfo = path.parse(tealFilePath);
        const configDirPath = path.join(fileInfo.dir, this.tealConfigDir);
        const configFiles = await this.findConfigurationFiles(configDirPath, fileInfo.name);
        const proceedWithNonePrompt = "Proceed with no configuration file";
        configFiles.push(proceedWithNonePrompt);
        const createNewPrompt = "Create a new configuration file...";
        configFiles.push(createNewPrompt);

        const pick = await vscode.window.showQuickPick(configFiles, {
            title: "Pick a configuration file for the TEAL debugger:",                
        });
        if (pick !== undefined && pick !== proceedWithNonePrompt) {
            if (pick === createNewPrompt) {
                return await this.createNewConfigurationFromDefault(configDirPath, fileInfo.base);        
            }
            else {
                const configFilePath = path.join(configDirPath, pick);
                return await this.loadSpecificConfiguration(configFilePath, configFilePath);
            }
        }

        // Fallback: return default configuration.
        const defaultConfig: ITealInterpreterConfig = {};
        return defaultConfig;
    }

    //
    // Continue running the TEAL program until a breakpoint or end of program.
    //
    async continue(): Promise<boolean> {
        return this.interpreter.continue();
    }

    //
    // Steps the debugger to the next line of code.
    // Returns true to continue or false to end debugging.
    //
    async step(): Promise<boolean> {
        return this.interpreter.step();
    }

}