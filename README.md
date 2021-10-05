# teal-debugger-extension

This is TEAL debugger VS Code extension.

## Run it

Clone this repo:

```bash
git clone git@github.com:sovereign-labs/teal-debugger-extension.git
```

Then install dependencies:

```bash
cd teal-debugger-extension
npm install
```

Open the project in VS Code:

```bash
code .
```

Go to the debug panel and ensure `Run extension` is selected in the dropdown.

Now hit F5 to load a new instance of VS Code that loads the extenion for testing and debugging.

The new instance is automatically opened to the example workspace that's under `./test-workspace`.

## Rebuild and reload

While debugging the extension (from the previous section) change code in the extension (it will be built automatically using Webpack watch), then in the new instance run `Developer: Reload Window` to load the new code.


## Run tests

Open the project in VS Code.

Go to the debug panel and ensure `Extension Tests` is selected in the dropdown.

Now hit F5 to run the tests. The outcome will be reported in the debug console.

You can also run in the console, but only if no VS Code instance is open:

```bash
npm test
```

## Resources

- This code developed from the VS Code "your first extension" tutorial:
    - https://code.visualstudio.com/api/get-started/your-first-extension
- VS Code API reference:
    - https://code.visualstudio.com/api/references/vscode-api
- Implementing a VS Code debugger extension:
    - https://code.visualstudio.com/api/extension-capabilities/overview#debugging
- List of debugger adaptors:
    - https://microsoft.github.io/debug-adapter-protocol/implementors/adapters/
- Debugger API reference:
    - https://code.visualstudio.com/api/references/vscode-api#debug
- Debug Adaptor Protocol (this protocol is independent of VS Code):
    - https://microsoft.github.io/debug-adapter-protocol/
    - https://microsoft.github.io/debug-adapter-protocol/overview