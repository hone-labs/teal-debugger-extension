import * as vscode from 'vscode';

//
// Reads a file from the VS Code workspace.
//
export async function readFile(path: string): Promise<string> {
    try {
        const uri = vscode.Uri.file(path);
        const bytes = await vscode.workspace.fs.readFile(uri);
        const contents = Buffer.from(bytes).toString('utf8');
        return contents;
    } 
    catch (err) {
        try {
            const uri = vscode.Uri.parse(path);
            const bytes = await vscode.workspace.fs.readFile(uri);
            const contents = Buffer.from(bytes).toString('utf8');
            return contents;
        } 
        catch (err) {
            return `cannot read '${path}'`;
        }
    }
}
