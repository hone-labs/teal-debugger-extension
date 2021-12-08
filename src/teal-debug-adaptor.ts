//
// Provides TEAL debugging capabilities to VS Code.
//

import * as vscode from 'vscode';
import { ContinuedEvent, InitializedEvent, LoggingDebugSession, Scope, Source, StackFrame, StoppedEvent, TerminatedEvent, Thread } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { TealRuntime } from './teal-runtime';
import * as path from "path";
import { isTypedValue } from "teal-interpreter";

/**
 * This interface describes the specific launch attributes.
 * (which are not part of the Debug Adapter Protocol).
 * The schema for these attributes lives in the package.json of this extension.
 * The interface should always match this schema.
 */
interface ILaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	//
    // An absolute path to the "program" to debug.
    //
	program: string;

	//
    // Automatically stop target after launch. If not specified, target does not stop. 
    //
	stopOnEntry?: boolean;
}

//
// Don't support multiple threads, so we can use a hardcoded ID for the default thread
//
const THREAD_ID = 1;

export class TealDebugAdaptor extends LoggingDebugSession {

    //
    // Runtime for compiling, running and debugging TEAL code.
    //
    private tealRuntime = new TealRuntime();

    //
    // Cache of breakpoints that have been set.
    // Because they can be set before the interprter is initialised.
    //
    private breakpointsSet: { [index: string]: number[] } = {};
    
    //
    // Set to true when running code.
    //
    private running: boolean = false;

	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor() {
		super("teal-debugger.txt");

        console.log(`Created Teal debug adaptor.`);

        //
		// This debugger uses zero-based lines and columns.
        //
		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);
	}

    //
    // The ‘initialize’ request is sent as the first request from the client to the debug adapter 
    // in order to configure it with client capabilities and to retrieve capabilities from the debug adapter.
    //
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Initialize
    // 
    protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        response.body = response.body || {};

        this.sendResponse(response);

        //
        // This event indicates that the debug adapter is ready to accept configuration requests (e.g. SetBreakpointsRequest, SetExceptionBreakpointsRequest).
        //
        // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Initialize
        // 
		this.sendEvent(new InitializedEvent());
    }

    //
    // Start a debugging session.
    // 
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Launch
    //
	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: ILaunchRequestArguments) {

        console.log(`Launch request:`);
        console.log(args);

        try {
            await this.tealRuntime.start(args.program);
            this.updateBreakpoints();
    
            if (args.stopOnEntry) {
                //
                // Tells VS Code that we have stopped on entry.
                // https://microsoft.github.io/debug-adapter-protocol/specification#Events_Stopped
                //
                this.sendEvent(new StoppedEvent('entry', THREAD_ID));
            }
            else {
                await this.tealRuntime.continue();
    
                //
                // Debugging session has ended.
                //
                // https://microsoft.github.io/debug-adapter-protocol/specification#Events_Terminated
                //
                this.sendEvent(new TerminatedEvent());
            }
    
            this.sendResponse(response);
        }
        catch (err: any) {    
            console.error(`An error occured starting the TEAL debugger:`);
            console.error(err && err.stack || err);

            const msg = err.message || err.toString();

            this.sendErrorResponse(response, {
                id: 1001,
                format: msg,
                showUser: false
            });

            await vscode.window.showErrorMessage(msg);
        }
	}

    //
    // Updates breakpoints into the interpreter.
    //
    private updateBreakpoints(): void {
        const path = this.tealRuntime.getLoadedFilePath();
        if (path === undefined) {
            // No file is loaded yet.
            return;
        }

        const lines = this.breakpointsSet[path];
        if (lines) {
            this.tealRuntime.setBreakpoints(lines);
        }
    }

    //
    // Sets multiple breakpoints for a single source and clears all previous breakpoints in that source.
    //
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_SetBreakpoints
    //
    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
        if (args.source.path !== undefined) {
            if (args.lines === undefined || args.lines.length === 0) {
                delete this.breakpointsSet[args.source.path];
            }
            else {
                this.breakpointsSet[args.source.path] = args.lines;
            }

            this.updateBreakpoints();
        }
    }

    // 
    // The request retrieves a list of all threads.
    // We supports no threads so just return a default thread.
    // 
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Threads
    // 
	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		response.body = {
			threads: [
				new Thread(THREAD_ID, "thread 1"),
			],
		};
		this.sendResponse(response);
	}

    //
    // The request returns a stacktrace from the current execution state of a given thread.
    //
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_StackTrace
    //
	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {

        const filePath = this.tealRuntime.getLoadedFilePath();
        if (filePath) {
            // https://microsoft.github.io/debug-adapter-protocol/specification#Types_Source
            const source = new Source(path.basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, undefined);
            const line = this.tealRuntime.getCurrentLine() !== undefined && this.convertDebuggerLineToClient(this.tealRuntime.getCurrentLine()!) || undefined;
    
            // https://microsoft.github.io/debug-adapter-protocol/specification#Types_StackFrame
            const stackFrame = new StackFrame(0, "main", source, line);
    
            response.body = {
                stackFrames: [ stackFrame ], // No function calls yet, so hardcoded to a single stack frame.
                totalFrames: 1,
            };
        }
        else {
            response.body = {
                stackFrames: [],
                totalFrames: 0,
            };
        }
         
		this.sendResponse(response);
	}

    //
    // Caches variables requests by id.
    //
    private dynamicVariableRequests: { [index: number]: string } = {};

    //
    // Starting point for dynamic variable requests.
    //
    private nextDynamicVariableRequestId = 20000;

    //
    // The request returns the variable scopes for a given stackframe ID.
    //
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Scopes
    // 
	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {

        //
        // Reset the request cache.
        //
        this.dynamicVariableRequests = {};
        this.nextDynamicVariableRequestId = 20000;


		response.body = {
			scopes: [
                new Scope("Data stack", this.registerVariableRequest("stack"), false),
                new Scope("Scratch memory", this.registerVariableRequest("scratch"), false),
                new Scope("Global state", this.registerVariableRequest("appGlobals"), false),
                new Scope("Global fields", this.registerVariableRequest("globals"), false),
                new Scope("Accounts", this.registerVariableRequest("accounts"), false),
                new Scope("Asset params", this.registerVariableRequest("assetParams"), false),
                new Scope("App params", this.registerVariableRequest("appParams"), false),
                new Scope("Txn", this.registerVariableRequest("txn"), false),
                new Scope("Gtxn", this.registerVariableRequest("Gtxn"), false),
                new Scope("Itxn", this.registerVariableRequest("Itxn"), false),
                new Scope("Last itxn", this.registerVariableRequest("lastItxn"), false),
                new Scope("Txn side effects", this.registerVariableRequest("txnSideEffects"), false),
                new Scope("Gaid", this.registerVariableRequest("gaid"), false),
			],
		};
		this.sendResponse(response);
	}

    //
    // Registers a variable request.
    //
    private registerVariableRequest(requestPath: string): number {
        const dynamicRequestId = this.nextDynamicVariableRequestId++;
        this.dynamicVariableRequests[dynamicRequestId] = requestPath;
        return dynamicRequestId;
    }

    //
    // Retrieves all child variables for the given variable reference.
    //
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Variables
    //
	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request): Promise<void> {

        const context = this.tealRuntime.getContext();

        const requestPath = this.dynamicVariableRequests[args.variablesReference];
        if (requestPath) {
            const parts = requestPath.split("/");
            let working = context as any;
            for (const part of parts) {
                working = working[part];
            }

            const variables: DebugProtocol.Variable[] = [];
            if (working) {
                for (const [name, value] of Object.entries<any>(working)) {
                    const valueType = typeof value;
                    if (valueType === "number") {
                        variables.push({
                            name: name,
                            value: value.toString(),
                            type: "number",
                            variablesReference: 0,
                        });
                    }
                    else {
                        const isValue = isTypedValue(value);
                        if (isValue) {
                            variables.push({
                                name: name,
                                value: value.value.toString(),
                                type: value.type,
                                variablesReference: 0,
                            });
                        }
                        else {
                            variables.push({
                                name: name,
                                value: "",
                                variablesReference: this.registerVariableRequest(`${requestPath}/${name}`),
                            });
                        }    
                    }
                }
            }

            response.body = { variables: variables };            
        }

		this.sendResponse(response);
	}

    //
    // Continue running.
    //
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Continue
	protected async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): Promise<void> {

        if (this.running) {
            //
            // Already running, ignore other requests.
            //
            this.sendEvent(new StoppedEvent('step', THREAD_ID));
            this.sendResponse(response);
            return;
        }

        try {
            this.running = true;

            if (await this.tealRuntime.continue()) {
                //
                // Debugging can continue.
                //
                // Tells VS Code that we have hit a breakpoint.
                //
                // https://microsoft.github.io/debug-adapter-protocol/specification#Events_Stopped
                //
                this.sendEvent(new StoppedEvent('breakpoint', THREAD_ID));
            }
            else {
                //
                // Debugging session has ended.
                //
                // https://microsoft.github.io/debug-adapter-protocol/specification#Events_Terminated
                //
                this.sendEvent(new TerminatedEvent());
            }
    
            this.sendResponse(response);
        }
        catch (err: any) {    
            console.error(`An error occured in the TEAL debugger:`);
            console.error(err && err.stack || err);
    
            const msg = err.message || err.toString();
    
            this.sendErrorResponse(response, {
                id: 1001,
                format: msg,
                showUser: false
            });
    
            await vscode.window.showErrorMessage(msg);
        }
        finally {
            this.running = false;
        }
    }

    //
    // Run another step.
    //
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Next
    //
	protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): Promise<void> {

        if (this.running) {
            //
            // Already running, ignore other requests.
            //
            this.sendEvent(new StoppedEvent('step', THREAD_ID));
            this.sendResponse(response);
            return;
        }

        try {
            this.running = true;

            if (await this.tealRuntime.step()) {
                //
                // Debugging can continue.
                //
                // Tells VS Code that we have stopped ater a step.
                //
                // https://microsoft.github.io/debug-adapter-protocol/specification#Events_Stopped
                //
                this.sendEvent(new StoppedEvent('step', THREAD_ID));
            }
            else {
                //
                // Debugging session has ended.
                //
                // https://microsoft.github.io/debug-adapter-protocol/specification#Events_Terminated
                //
                this.sendEvent(new TerminatedEvent());
            }
    
            this.sendResponse(response);
        }
        catch (err: any) {    
            console.error(`An error occured stepping the TEAL debugger:`);
            console.error(err && err.stack || err);

            const msg = err.message || err.toString();

            this.sendErrorResponse(response, {
                id: 1001,
                format: msg,
                showUser: false
            });

            vscode.window.showErrorMessage(msg);
        }
        finally {
            this.running = false;
        }
	}
}

