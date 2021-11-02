import * as vscode from 'vscode';
import { logCalls } from './lib/log-calls';
import { TealDebugAdaptor as TealDebugAdaptor } from './teal-debug-adaptor';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log(`Teal-debugger-extension is activated`);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('teal-debugger-extension.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from teal-debugger-extension!');
	});

    //
    // Register a configuration provider.
    // This allows us to start debuging without having a debug configuration in the project.
    //
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('teal', new DebugConfigurationProvider));

    //
    // Register the factory that creates the debugger session for the 'teal' debugger.
    //
    context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('teal', new DebugAdapterFactory()));

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}

class DebugAdapterFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(_session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
		//return new vscode.DebugAdapterInlineImplementation(logCalls(new TealDebugAdaptor()));
        return new vscode.DebugAdapterInlineImplementation(new TealDebugAdaptor());
	}
}

class DebugConfigurationProvider implements vscode.DebugConfigurationProvider {

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration> {
		
		if (!config.type && !config.request && !config.name) {
            //
            // Launch.json is missing or empty.
            //
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId === 'teal') {
				config.type = 'teal';
				config.name = 'Launch';
				config.request = 'launch';
				config.program = '${file}';
				config.stopOnEntry = true;
			}
		}

		if (!config.program) {
			return vscode.window.showInformationMessage("Cannot find a program to debug")
                .then(_ => {
				    return undefined;	// abort launch
			    });
		}

		return config;
	}
}