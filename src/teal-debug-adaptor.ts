//
// Provides TEAL debugging capabilities to VS Code.
//

import { InitializedEvent, LoggingDebugSession, Scope, Thread } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';

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

	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor() {
		super("teal-debugger.txt");

        console.log(`Created Teal debug adaptor.`);

		// This debugger uses zero-based lines and columns
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

        this.sendResponse(response);
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

        console.log(`Stack request:`);
        console.log(args);

		response.body = {
			stackFrames: [
                //TODO: Add stackframes here.
            ],
            totalFrames: 0,
		};
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
                variables: [
                    
                ],
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
		//TODO;
		this.sendResponse(response);
	}

    //
    // Run another step.
    //
    // https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Next
    //
	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		//TODO:
		this.sendResponse(response);
	}
}

