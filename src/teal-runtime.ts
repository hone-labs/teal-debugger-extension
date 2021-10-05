//
// A simplified wrapper for the teal runtime.
//

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
    // Starts a TEAL program in the runtime.
    //
    async start(tealFilePath: string, stopOnEntry: boolean): Promise<void> {

        this.loadedTealFilePath = tealFilePath;
        this.currentLine = 0;

        //todo: load source code.

        //todo: parse code to instructions, map instructions to source lines.
    }

    //
    // Continue running the TEAL program until a breakpoint or end of program.
    //
    continue() {
        //TODO: 
    }

    //
    // Steps the debugger to the next line of code.
    //
    step() {
        this.currentLine += 1;
    }

}