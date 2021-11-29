import * as vscode from 'vscode';
const fs = vscode.workspace.fs;

//
// Returns true if a file exists.
//
export async function fileExists(path: string): Promise<boolean> {
    try {
        await fs.stat(vscode.Uri.file(path));
        return true;
    } 
    catch {
        try {
            await fs.stat(vscode.Uri.parse(path));
            return true;    
        }
        catch {
            return false;
        }
    }
}

//
// Reads a file from the VS Code workspace.
//
export async function readFile(path: string): Promise<string> {
    try {
        const uri = vscode.Uri.file(path);
        const bytes = await fs.readFile(uri);
        const contents = Buffer.from(bytes).toString('utf8');
        return contents;
    } 
    catch (err) {
        const uri = vscode.Uri.parse(path);
        const bytes = await fs.readFile(uri);
        const contents = Buffer.from(bytes).toString('utf8');
        return contents;
    }
}
