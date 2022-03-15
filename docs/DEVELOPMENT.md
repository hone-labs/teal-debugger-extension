# Development guide

## Pre requisites

Have Node.js installed.

Install a single version: https://nodejs.org/

Or manage multiples versions using `nvm`:
- For Windows: https://github.com/coreybutler/nvm-windows
- For Linux/MacOS: https://github.com/nvm-sh/nvm

## Get the code

Clone this repo:

```bash
git clone git@github.com:optio-labs/teal-debugger-extension.git
```

## Setup

Install dependencies:

```bash
cd teal-debugger-extension
pnpm install
```

## Debug the debugger

Open the project in VS Code:

```bash
cd teal-debugger-extension
code .
```

Go to the debug panel and ensure `Run extension` is selected in the dropdown.

Now hit F5 to load a new instance of VS Code that loads the extenion for testing and debugging.

The new instance is automatically opened to the one of the test workspaces that's under the `test` directory.

Open a TEAL file that you would like to debug, then hit F5 to start debugging it.

Hit F10 to single step through the TEAL file. You can view the TEAL compute stack and variables in the debugger pane.

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

## Create an installable package for the extension

```bash
npm run package
```

Output is `teal-debugger-extension-<version>.vsix`.

Install the extension like this:

```bash
code --install-extension teal-debugger-extension-<version>.vsix
```

## Deployment

To deploy a new version of the TEAL debugger simply tag the commit for the new release with the version number in the following form:

```bash
v0.0.5
```

Don't forget to add the `v` to the tag, this is how the deployment pipeline knows the tag is a version (and not some other tag).

Now push tags:

```
git push --tags
```

The updated version will deploy automatically to npm (provided the automated tests pass).

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



