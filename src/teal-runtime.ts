//
// A simplified wrapper for the teal runtime.
//

import { readFile } from "./lib/file";
import JSON5 from "json5";
import { TealInterpreter } from "teal-interpreter";
import { ITealInterpreterConfig } from "teal-interpreter/build/lib/interpreter";
import { ITypedValue } from "teal-interpreter/build/lib/context";

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
    // Get the contents of the data stack.
    //
    getDataStack(): ITypedValue[] {
        return this.interpreter.context.stack;
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
    // Configures the algo-builder interpreter and parses the TEAL code to be debugged.
    //
    private configureInterpreter(configuration: ITealInterpreterConfig, tealCode: string) {
        this.interpreter = new TealInterpreter();
        this.interpreter.load(tealCode, configuration);
    }

    //
    // Loads the TEAL debugger configuration file.
    //
    private async loadConfiguration(tealFilePath: string): Promise<ITealInterpreterConfig> {
        const configFilePath = tealFilePath + ".json";
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

    //
    // Continue running the TEAL program until a breakpoint or end of program.
    //
    continue() {
        while (this.step()) {
            // Continue until we need to stop.
        }
    }

    //
    // Steps the debugger to the next line of code.
    // Returns true to continue or false to end debugging.
    //
    step(): boolean {
        return this.interpreter.step();
    }

}