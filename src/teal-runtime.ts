//
// A simplified wrapper for the teal runtime.
//

import * as vscode from 'vscode';
import { fileExists, readFile, writeFile } from "./lib/file";
import JSON5 from "json5";
import { IExecutionContext, ITealInterpreterConfig, loadValue, TealInterpreter } from "teal-interpreter";
import * as path from "path";
import * as fs from "fs-extra";

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
    // Saves the debugger confiugration.
    //
    private async saveConfiguration() {
        const fileInfo = path.parse(this.loadedTealFilePath!);
        const configDirPath = path.join(fileInfo.dir, this.tealConfigDir);
        await fs.ensureDir(configDirPath);

        if (this.loadedConfigurationFilePath === undefined) {
            // Find an untaken configuration file name.
            let attempt = 1;
            while (true) {
                this.loadedConfigurationFilePath = path.join(configDirPath, fileInfo.base + `-${attempt}.json`);
                if (await fs.pathExists(this.loadedConfigurationFilePath)) {
                    attempt += 1; // Try next one along.
                }
                else {
                    // Have a free file.
                    break;
                }
            }
        }

        await writeFile(this.loadedConfigurationFilePath, JSON.stringify(this.interpreter.context.serialize(), null, 4));
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
            await this.saveConfiguration();
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
    private async findConfigurationFiles(configDirPath: string, tealFileName: string): Promise<string[]> {

        tealFileName = tealFileName.toLowerCase();

        const matchingConfigFiles: string[] = [];

        const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(configDirPath));
        for (const [fileName, fileType] of files) {
            if (fileType === vscode.FileType.File) {
                if (fileName.toLowerCase().startsWith(tealFileName)) {
                    matchingConfigFiles.push(fileName);
                }
            }
        }
        
        return matchingConfigFiles;
    }

    //
    // Loads the TEAL debugger configuration file.
    //
    private async loadConfiguration(tealFilePath: string): Promise<ITealInterpreterConfig> {
        const fileInfo = path.parse(tealFilePath);
        const configDirPath = path.join(fileInfo.dir, this.tealConfigDir);
        const configFiles = await this.findConfigurationFiles(configDirPath, fileInfo.name);
        if (configFiles.length > 0) {
            const pick = await vscode.window.showQuickPick(configFiles, {
                title: "Pick a configuration file for the TEAL debugger:",                
            });
            if (pick !== undefined) {
                const configFilePath = path.join(configDirPath, pick);
                try {
                    const config = JSON5.parse(await readFile(configFilePath));    
                    vscode.window.showInformationMessage(`Loaded configuration file ${configFilePath}`);
                    this.loadedConfigurationFilePath = configFilePath;
                    return config;    
                }
                catch (err: any) {
                    const msg = `Failed to load TEAL debugger configuration file: ${configFilePath}`;
                    console.error(msg);
                    console.error(err && err.stack || err);
        
                    throw new Error(msg);
                }
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