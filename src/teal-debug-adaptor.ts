//
// Provides TEAL debugging capabilities to VS Code.
//

import * as vscode from 'vscode';
import { LoggingDebugSession, Scope, Source, StackFrame, StoppedEvent, TerminatedEvent, Thread } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { TealRuntime } from './teal-runtime';
import * as path from "path";

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
    // Start a debugging session.
    // 
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Launch
    //
	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: ILaunchRequestArguments) {

        console.log(`Launch request:`);
        console.log(args);

        try {
            await this.tealRuntime.start(args.program);
    
            if (args.stopOnEntry) {
                //
                // Tells VS Code that we have stopped on entry.
                // https://microsoft.github.io/debug-adapter-protocol/specification#Events_Stopped
                //
                this.sendEvent(new StoppedEvent('entry', THREAD_ID));
            }
            else {
                this.tealRuntime.continue();
    
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
    // The request returns the variable scopes for a given stackframe ID.
    //
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Scopes
    // 
	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {

		response.body = {
			scopes: [
                new Scope("Data stack", 1, false),
			],
		};
		this.sendResponse(response);
	}

    //
    // Retrieves all child variables for the given variable reference.
    //
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Variables
    //
	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, request?: DebugProtocol.Request): Promise<void> {

        if (args.variablesReference === 1) {

            //
            // Data stack variables request.
            //
            response.body = {
                //
                // TODO: Return a variable for each stack entry.
                //
                // https://microsoft.github.io/debug-adapter-protocol/specification#Types_Variable
                //
                variables: this.tealRuntime.getDataStack().map((value, index): DebugProtocol.Variable => {
                    return {
                        name: `[${index}]`,
                        value: `${value.value.toString()} (${value.type})`,
                        variablesReference: 0, // This can be used to indicate the variable has sub-variables.
                    };
                }),
            };
        }
        else {
            //
            // TODO: Add support for scratch, local and global variables.
            //
        }

		this.sendResponse(response);
	}

    //
    // Continue running.
    //
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Continue
	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {

        this.tealRuntime.continue();

        //
        // Debugging session has ended.
        //
        // https://microsoft.github.io/debug-adapter-protocol/specification#Events_Terminated
        //
        this.sendEvent(new TerminatedEvent());

		this.sendResponse(response);
	}

    //
    // Run another step.
    //
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Next
    //
	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {

        if (this.tealRuntime.step()) {
            //
            // Debugging can continue.
            //
            // Tells VS Code that we have stopped ater a step.
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
}

