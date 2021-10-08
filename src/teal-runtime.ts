//
// A simplified wrapper for the teal runtime.
//

import { AccountStore, Interpreter, parser, Runtime, types } from "@algo-builder/runtime";
import { types as webTypes } from "@algo-builder/web";
import { Ctx } from "@algo-builder/runtime/build/ctx";
import { readFile } from "./lib/file";
import cloneDeep from "lodash.clonedeep";
import { AppDeploymentFlags } from "@algo-builder/runtime/build/types";

export class TealRuntime {

    //
    /// The path for the current loaded TEAL file.
    //
    private loadedTealFilePath?: string = undefined;

    //
    // The TEAL interpreter.
    //
    private interpreter = new Interpreter();

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
        if (this.interpreter && 
            this.interpreter.instructionIndex >= 0 && 
            this.interpreter.instructionIndex < this.interpreter.instructions.length) {
            return this.interpreter.instructions[this.interpreter.instructionIndex].line - 1; // Convert from 1-based to 0-based.
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

        const tealCode = await readFile(tealFilePath);
        const configuration = await this.loadConfiguration(tealFilePath);

        let accountMap = new Map<string, AccountStore>();
        let accounts: AccountStore[] = [];
        for (let accountName of Object.keys(configuration.accounts)) {
            const accountData = configuration.accounts[accountName];
            const account = new AccountStore(accountData.balance, this.createAccountConfig(accountData));            
            accountMap.set(accountName, account);
            accounts.push(account);
        }
        
        const txnParameters: any = configuration.transactionParams;
        if (txnParameters.fromAccount) {
            const account = accountMap.get(txnParameters.fromAccount);
            if (!account) {
                throw new Error(`Failed to find account ${txnParameters.fromAccount} in the configuration.`);
            }
            txnParameters.fromAccountAddr = account.address;
            delete txnParameters.fromAccount;
        }

        if (txnParameters.toAccount) {
            const account = accountMap.get(txnParameters.toAccount);
            if (!account) {
                throw new Error(`Failed to find account ${txnParameters.toAccount} in the configuration.`);
            }
            txnParameters.toAccountAddr = account.address;
            delete txnParameters.toAccount;
        }

        const runtime = new Runtime(accounts);

        if (txnParameters.sign === webTypes.SignType.LogicSignature) { 
            const lsig = runtime.getLogicSig(tealCode, []);
            const lsigAccount = runtime.getAccount(lsig.address());
            accountMap.set("$lsig", lsigAccount);
        }

        const [tx, gtxs] = runtime.createTxnContext([txnParameters]);
        runtime.validateTxRound(gtxs);

        const store = (runtime as any).store; //TODO: This is a bit ugly. Need to make a change to algo-builder/runtime if we need to keep this.
        runtime.ctx = new Ctx(cloneDeep(store), tx, gtxs, configuration.args || [], runtime, undefined);

        runtime.ctx.tx = runtime.ctx.gtxs[0];

        runtime.ctx.verifyMinimumFees();

        runtime.ctx.deductFee(txnParameters.fromAccountAddr, 0, txnParameters.payFlags);

        if (txnParameters.type === webTypes.TransactionType.DeployApp) {
            const senderAcc = runtime.ctx.getAccount(txnParameters.fromAccountAddr);
            const flags: AppDeploymentFlags = {
                sender: senderAcc.account,
                localInts: txnParameters.localInts,
                localBytes: txnParameters.localBytes,
                globalInts: txnParameters.globalInts,
                globalBytes: txnParameters.globalBytes
            };        
    
            //
            // Create app with id = 0 in globalApps for teal execution
            //
            const app = senderAcc.addApp(0, flags, tealCode, "");
            (runtime.ctx as any).assertAccBalAboveMin(senderAcc.address); //TODO: Do I need official access to this function?
            runtime.ctx.state.accounts.set(senderAcc.address, senderAcc);
            runtime.ctx.state.globalApps.set(app.id, senderAcc.address);
        }                 

        this.interpreter = new Interpreter();
        this.interpreter.runtime = runtime;
        this.interpreter.instructions = parser(tealCode, configuration.mode, this.interpreter);
        this.interpreter.mapLabelWithIndexes();
    }

    //
    // Helper function to create an account "configuration" for Algo-builder/runtime.
    //
    private createAccountConfig(accountData: any): any | undefined {
        if (!accountData.addr && !accountData.sk) {
            return undefined; // No configuration, just let Algo-builder/runtime generate address/sk.
        }

        return {
            addr: accountData,
            sk: accountData.sk,
        };
    }

    //
    // Loads the TEAL debugger configuration file.
    //
    private async loadConfiguration(tealFilePath: string) {
        const configFilePath = tealFilePath + ".json";
        try {
            return JSON.parse(await readFile(configFilePath));
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
        if (!this.interpreter || this.interpreter.instructionIndex > this.interpreter.instructions.length - 1) {
            //
            // Don't step beyond the end.
            //
            return false;
        }

        const instruction = this.interpreter.instructions[this.interpreter.instructionIndex];
        instruction.execute(this.interpreter!.stack);
        this.interpreter.instructionIndex += 1;
        return true;
    }

}