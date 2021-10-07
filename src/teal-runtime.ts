//
// A simplified wrapper for the teal runtime.
//

import { AccountStore, Interpreter, parser, Runtime, types } from "@algo-builder/runtime";
import { types as webTypes } from "@algo-builder/web";
import { Ctx } from "@algo-builder/runtime/build/ctx";
import { ALGORAND_ACCOUNT_MIN_BALANCE } from "@algo-builder/runtime/build/lib/constants";
import { readFile } from "./lib/file";
import cloneDeep from "lodash.clonedeep";

export class TealRuntime {

    //
    /// The path for the current loaded TEAL file.
    //
    private loadedTealFilePath?: string = undefined;

    //
    // Index of the next instruction to execute.
    //
    private nextInstructionIndex: number = 0;

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
    getCurrentLine(): number | undefined { 
        if (this.nextInstructionIndex >= 0 && this.nextInstructionIndex < this.instructions.length) {
            return this.instructions[this.nextInstructionIndex].line - 1; // Convert from 1-based to 0-based.
        }
        else {
            return undefined;
        }
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
        this.nextInstructionIndex = 0;

        const tealCode = await readFile(tealFilePath);
        const configuration = JSON.parse(await readFile(tealFilePath + ".json"));

        let accountMap = new Map<string, AccountStore>();
        let accounts: AccountStore[] = [];
        for (let accountName of Object.keys(configuration.accounts)) {
            const accountData = configuration.accounts[accountName];
            const account = new AccountStore(accountData.balance, accountData);
            accountMap.set(accountName, account);
            accounts.push(account);
        }
        
        const runtime = new Runtime(accounts);
        const lsig = runtime.getLogicSig(tealCode, []);
        const lsigAccount = runtime.getAccount(lsig.address());
        accountMap.set("$lsig", lsigAccount);

        const txnParameters: any = configuration.transactionParams;
        if (txnParameters.fromAccount) {
            txnParameters.fromAccountAddr = accountMap.get(txnParameters.fromAccount)?.address;
            delete txnParameters.fromAccount;
        }

        if (txnParameters.toAccount) {
            txnParameters.toAccountAddr = accountMap.get(txnParameters.toAccount)?.address;
            delete txnParameters.toAccount;
        }

        const [tx, gtxs] = runtime.createTxnContext([txnParameters]);

        const store = (runtime as any).store; //TODO: This is a bit ugly. Need to make a change to algo-builder/runtime if we need to keep this.
        runtime.ctx = new Ctx(cloneDeep(store), tx, gtxs, [], runtime, undefined);

        this.interpreter = new Interpreter();
        this.interpreter.runtime = runtime;
        this.instructions = parser(tealCode, types.ExecutionMode.SIGNATURE, this.interpreter);
        this.interpreter.mapLabelWithIndexes();
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
        if (this.nextInstructionIndex > this.instructions.length - 1) {
            //
            // Don't step beyond the end.
            //
            return false;
        }

        const instruction = this.instructions[this.nextInstructionIndex];
        instruction.execute(this.interpreter!.stack);
        this.nextInstructionIndex += 1;
        return true;
    }

}