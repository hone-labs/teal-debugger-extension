//
// A simplified wrapper for the teal runtime.
//

import { Interpreter, parser, types } from "@algo-builder/runtime";
import { setgroups } from "process";
import { readFile } from "./lib/file";

export class TealRuntime {

    //
    /// The path for the current loaded TEAL file.
    //
    private loadedTealFilePath?: string = undefined;

    //
    // Current line of the debugger.
    //
    private currentLine: number = 0;

    //
    // The TEAL interpreter.
    //
    private interpreter = new Interpreter();

    //
    // Instructions parsed from the TEAL code.
    //
    instructions: types.Operator[] = [];

    //
    // Gets the file path for the currently loaded TEAL file.
    //
    getLoadedFilePath(): string | undefined {
        return this.loadedTealFilePath;
    }

    //
    // Get the current line of the debugger.
    //
    getCurrentLine(): number { 
        return this.currentLine;
    }

    //
    // Get the contents of the data stack.
    //
    getDataStack(): number[] {
        //TODO: Need to open up this data properly in algo-builder/runtime.
        const stackValues = (this.interpreter.stack as any)._store;
        return stackValues;
    }

    //
    // Starts a TEAL program in the runtime.
    //
    async start(tealFilePath: string): Promise<void> {

        this.loadedTealFilePath = tealFilePath;
        this.currentLine = 0;

        const contents = await readFile(tealFilePath);

        this.interpreter = new Interpreter();
        this.instructions = parser(contents, types.ExecutionMode.APPLICATION, this.interpreter);
    }

    //
    // Continue running the TEAL program until a breakpoint or end of program.
    //
    continue() {
        while (this.currentLine < this.instructions.length - 1) {
            this.step();
        }
    }

    //
    // Steps the debugger to the next line of code.
    // Returns true to continue or false to end debugging.
    //
    step(): boolean {
        if (this.currentLine > this.instructions.length - 1) {
            //
            // Don't step beyond the end.
            //
            return false;
        }

        const instruction = this.instructions[this.currentLine];
        instruction.execute(this.interpreter!.stack);
        this.currentLine += 1;
        return true;
    }

}