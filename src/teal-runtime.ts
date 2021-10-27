//
// A simplified wrapper for the teal runtime.
//

import { AccountStore, Interpreter, LogicSigAccount, parser, Runtime, types } from "@algo-builder/runtime";
import { types as webTypes, parsing } from "@algo-builder/web";
import { Ctx } from "@algo-builder/runtime/build/ctx";
import { readFile } from "./lib/file";
import cloneDeep from "lodash.clonedeep";
import { AccountAddress, AppDeploymentFlags, ExecutionMode } from "@algo-builder/runtime/build/types";
import JSON5 from "json5";

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

        this.configureInterpreter(configuration, tealCode);
    }

    //
    // Configures the algo-builder interpreter and parses the TEAL code to be debugged.
    //
    private configureInterpreter(configuration: any, tealCode: string) {

        //
        // Load accounts from configuration.
        //
        let accountMap = new Map<string, AccountStore>();
        let accounts: AccountStore[] = [];
        for (let accountName of Object.keys(configuration.accounts)) {
            const accountData = configuration.accounts[accountName];
            const account = new AccountStore(accountData.balance, this.createAccountConfig(accountData));
            accountMap.set(accountName, account);
            accounts.push(account);
        }

        // 
        // Resolve named accounts in transactions.
        //

        if (configuration.txns) {
            for (const txn of configuration.txns) {
                this.resolveAddress(txn, "fromAccount", accountMap);
                this.resolveAddress(txn, "toAccount", accountMap);
            }
        }

        const runtime = new Runtime(accounts);

        //
        // Load transactions.
        //
        const txns: webTypes.ExecParams[] = [];

        if (configuration.txns) {
            for (const txnConfig of configuration.txns) {
                txns.push(this.createTransaction(txnConfig, runtime, accountMap));
            }
        }

        //
        // Load app arguments.
        //
        const appArgs: Uint8Array[] = [];

        if (configuration.args) {
            for (const argConfig of configuration.args) {
                appArgs.push(this.parseArg(argConfig, accountMap));
            }
        }

        const [tx, gtxs] = runtime.createTxnContext(txns);
        runtime.validateTxRound(gtxs);

        const store = (runtime as any).store; //TODO: This is a bit ugly. Need to make a change to algo-builder/runtime if we need to keep this.
        runtime.ctx = new Ctx(cloneDeep(store), tx, gtxs, appArgs, runtime, undefined);

        const txnIndex = configuration.groupIndex || 0;
        runtime.ctx.tx = runtime.ctx.gtxs[txnIndex];

        runtime.ctx.verifyMinimumFees();

        const currentTxn = txns[txnIndex];       
        runtime.ctx.deductFee(currentTxn.fromAccountAddr!, 0, currentTxn.payFlags);

        if (currentTxn.type === webTypes.TransactionType.DeployApp) {
            const senderAcc = runtime.ctx.getAccount(currentTxn.fromAccountAddr!);
            const flags: AppDeploymentFlags = {
                sender: senderAcc.account,
                localInts: currentTxn.localInts,
                localBytes: currentTxn.localBytes,
                globalInts: currentTxn.globalInts,
                globalBytes: currentTxn.globalBytes
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
        this.interpreter.instructions = parser(tealCode, this.convertMode(configuration.mode), this.interpreter);
        this.interpreter.mapLabelWithIndexes();
    }

    //
    // Resolves an address by name in a transactions.
    //
    private resolveAddress(txn: any, fieldName: string, accountMap: Map<string, AccountStore>) {
        const accountName = txn && txn[fieldName];
        if (accountName !== undefined) {
            const account = accountMap.get(accountName);
            if (!account) {
                throw new Error(`Failed to find account ${accountName} in the configuration.`);
            }
            txn[`${fieldName}Addr`] = account.address;
            delete txn[fieldName];
        }
    }

    //
    // Parses an argument for use by algo-builder/runtime.
    //
    private parseArg(argConfig: any, accountMap: Map<string, AccountStore>): Uint8Array {
        switch (argConfig.type) {
            case "int": {
                return parsing.uint64ToBigEndian(argConfig.value);
            }

            case "str": {
                return parsing.stringToBytes(argConfig.value);
            }

            case "addr": {
                const account = accountMap.get(argConfig.value);
                if (!account) {
                    throw new Error(`Failed to find account ${argConfig.value} request in "args".`);
                }

                return parsing.addressToPk(account.account.addr);                                    
            }

            default: {
                throw new Error(`Unexpected arg type ${argConfig.type}`);
            }
        }
    }

    //
    // Creates a algo-builder/runtime transaction from a configuration object.
    //
    private createTransaction(txnConfig: any, runtime: Runtime, accountMap: Map<string, AccountStore>): webTypes.ExecParams {
        switch (txnConfig.type) {
            case "appl": {
                let sign: webTypes.SignType;
                if (txnConfig.sign === "secretkey") {
                    sign = webTypes.SignType.SecretKey;
                }
                else if (txnConfig.sign === "logicsig") {
                    sign = webTypes.SignType.LogicSignature;
                }
                else {
                    throw new Error(`Unexpected signature type "${txnConfig.sign}", should be one of "secretkey" or "logicsig"`);
                }

                if (!txnConfig.fromAccountAddr) {
                    throw new Error(`fromAccount/fromAccountAddr is required`);
                }

                if (!txnConfig.apid) {
                    const fromAccount = runtime.getAccount(txnConfig.fromAccountAddr);
                    if (!fromAccount) {
                        throw new Error(`Failed to find from account "${txnConfig.fromAccountAddr}`);
                    }

                    const txn: any = { // It's too difficult to type this with "DeployAppParams".
                        type: webTypes.TransactionType.DeployApp,
                        sign: sign,
                        fromAccountAddr: txnConfig.fromAccountAddr,
                        lsig: runtime.getLogicSig("int 1", []), //todo: is this needed?
                        approvalProgram: txnConfig.approvalProgram || "",
                        clearProgram: txnConfig.clearProgram || "",
                        localInts: txnConfig.localInts || 1,
                        localBytes: txnConfig.localBytes || 1,
                        globalInts: txnConfig.globalInts || 1,
                        globalBytes: txnConfig.globalBytes || 1,
                        //TODO: Options from AppOptionalFlags could go here.
                        payFlags: txnConfig.payFlags,
                    };
                    return txn;
                }
                else {
                    if (!txnConfig.appId) {
                        throw new Error(`appId is required`);
                    }

                    const txn: any = { // It's too difficult to type this as "AppCallsParam".
                        type: webTypes.TransactionType.CallApp,
                        appId: txnConfig.appId as number,
                        sign: sign,
                        fromAccountAddr: txnConfig.fromAccountAddr,
                        lsig: runtime.getLogicSig("", []),
                        //TODO: Options from AppOptionalFlags could go here.
                        payFlags: txnConfig.payFlags || {},
                    };
                    return txn;
                }
            }
        
            default: {
                throw new Error(`Unhandled transaction type ${txnConfig.type}`);
            }
        }
    }

    //
    // Converts a string to an algo-builder/runtime execution mode.
    //
    private convertMode(mode: string | undefined): ExecutionMode {
        if (!mode) {
            throw new Error(`TEAL execution mode not supplied, should be one of one of "signature" or "application"`);
        }

        if (mode === "signature") {
            return ExecutionMode.SIGNATURE;
        }
        else if (mode === "application") {
            return ExecutionMode.APPLICATION;
        }
        else {
            throw new Error(`Unknown TEAL execution mode "${mode}, expected one of "signature" or "application"`);
        }
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