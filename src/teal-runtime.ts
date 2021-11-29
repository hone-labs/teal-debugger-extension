//
// A simplified wrapper for the teal runtime.
//

import * as vscode from 'vscode';
import { fileExists, readFile, writeFile } from "./lib/file";
import JSON5 from "json5";
import { Account, IExecutionContext, ITealInterpreterConfig, TealInterpreter } from "teal-interpreter";

export class TealRuntime {

    //
    /// The path for the current loaded TEAL file.
    //
    private loadedTealFilePath?: string = undefined;

    //
    // The TEAL interpreter.
    //
    private interpreter = new TealInterpreter();

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

        this.configureInterpreter(configuration, tealCode);
    }

    //
    // Saves the debugger confiugration.
    //
    private async saveConfiguration() {
        const configFilePath = this.loadedTealFilePath + ".json";
        await writeFile(configFilePath, JSON5.stringify(this.interpreter.context.serialize(), null, 4));
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
    private configureInterpreter(configuration: ITealInterpreterConfig, tealCode: string) {
        this.interpreter = new TealInterpreter();
        this.interpreter.load(tealCode, configuration);
        this.interpreter.context.onAccountNotFound = async (accountName: string) => {
            const response = await vscode.window.showInformationMessage(
                `Account "${accountName}" is not defined in your configuration. Do you want to create it?`,
                "Yes",
                "No"
            );
            
            if (response === "Yes") {
                this.interpreter.context.accounts[accountName] = new Account({
                    balance: 0,
                    minBalance: 0,
                    appLocals: {},
                    appsOptedIn: [],
                    assetHoldings: {},
                });

                await this.promptSaveConfiguration();
            }
        };
    }

    //
    // Loads the TEAL debugger configuration file.
    //
    private async loadConfiguration(tealFilePath: string): Promise<ITealInterpreterConfig> {
        const configFilePath = tealFilePath + ".json";
        if (await fileExists(configFilePath)) {
            try {
                return JSON5.parse(await readFile(configFilePath));
            }
            catch (err: any) {
                const msg = `Failed to load TEAL debugger configuration file: ${configFilePath}`;
                console.error(msg);
                console.error(err && err.stack || err);
    
                throw new Error(msg);
            }
        }
        else {
            const defaultConfig: ITealInterpreterConfig = {};
            return defaultConfig;
        }
    }

    //
    // Continue running the TEAL program until a breakpoint or end of program.
    //
    async continue(): Promise<void> {
        while (await this.step()) {
            // Continue until we need to stop.
        }
    }

    //
    // Steps the debugger to the next line of code.
    // Returns true to continue or false to end debugging.
    //
    async step(): Promise<boolean> {
        return this.interpreter.step();
    }

}