'use strict';
const os = require('os');
const path = require('path');
const fsPromises = require('fs/promises');
const vscode = require('vscode');

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

// The virtual document that backs "Open Default Keyboard Shortcuts (JSON)".
// Resolving it through the text-model content provider gives the exact same
// content as the editor without opening an editor at all.
const DEFAULT_KEYBINDINGS_URI = vscode.Uri.from({
    scheme: 'vscode',
    authority: 'defaultsettings',
    path: '/keybindings.json'
});

function isKeybindingsDocument(document) {
    const uri = document.uri;
    return uri.scheme === 'vscode' && path.basename(uri.path) === 'keybindings.json';
}

function findVisibleKeybindingsDocument() {
    for (const textEditor of vscode.window.visibleTextEditors) {
        if (isKeybindingsDocument(textEditor.document)) {
            return textEditor.document;
        }
    }
    return undefined;
}

// Preferred path: open the default keybindings as a text document directly.
// This avoids the editor/group machinery entirely, which is important on Cursor
// where opening any editor in the headless test host throws
// `Cannot read properties of undefined (reading 'activeEditor')`.
async function readViaTextDocument() {
    const document = await vscode.workspace.openTextDocument(DEFAULT_KEYBINDINGS_URI);
    let text = document.getText();
    for (let i = 0; i < 20 && text.trim().length === 0; i++) {
        await sleep(500);
        text = document.getText();
    }
    return text;
}

// Fallback path (stock VS Code): trigger the editor command and grab the
// document once it becomes visible, retrying until the editor area is ready.
async function readViaEditorCommand() {
    const overallTimeoutMs = 90 * 1000;
    const maxAttempts = 30;

    const document = await new Promise((resolve, reject) => {
        let settled = false;

        const finishResolve = doc => {
            if (settled) return;
            settled = true;
            listener.dispose();
            clearTimeout(timeout);
            resolve(doc);
        };
        const finishReject = err => {
            if (settled) return;
            settled = true;
            listener.dispose();
            clearTimeout(timeout);
            reject(err);
        };

        const listener = vscode.window.onDidChangeVisibleTextEditors(textEditors => {
            for (const textEditor of textEditors) {
                if (isKeybindingsDocument(textEditor.document)) {
                    finishResolve(textEditor.document);
                }
            }
        });

        const timeout = setTimeout(() => {
            console.error('Timed out waiting for default keybindings editor');
            finishReject(new Error('openDefaultKeybindingsFile timeout'));
        }, overallTimeoutMs);

        (async () => {
            const already = findVisibleKeybindingsDocument();
            if (already) {
                finishResolve(already);
                return;
            }

            for (let attempt = 1; attempt <= maxAttempts && !settled; attempt++) {
                try {
                    await vscode.commands.executeCommand('workbench.action.openDefaultKeybindingsFile');
                } catch (err) {
                    console.error(`openDefaultKeybindingsFile attempt ${attempt} failed: ${err && err.message}`);
                }
                await sleep(1000);
                const doc = findVisibleKeybindingsDocument();
                if (doc) {
                    finishResolve(doc);
                    return;
                }
            }
        })().catch(finishReject);
    });

    return document.getText();
}

async function getDefaultKeybindingsText() {
    try {
        const text = await readViaTextDocument();
        if (text && text.trim().length > 0) {
            return text;
        }
        console.error('Default keybindings text document was empty; falling back to editor command.');
    } catch (err) {
        console.error(`openTextDocument approach failed: ${err && err.message}; falling back to editor command.`);
    }
    return await readViaEditorCommand();
}

function makeHeader(platform) {
    const target = (
        platform === 'win32' ? 'Windows' :
        platform === 'darwin' ? 'macOS' :
        'Linux'
    );
    // `vscode.version` is the embedded VS Code engine version (e.g. 1.105.1),
    // not the Cursor app version. The workflow passes the real Cursor version
    // (e.g. 3.6.21) via CURSOR_VERSION; fall back to the engine version locally.
    const version = process.env.CURSOR_VERSION || vscode.version;
    const signature = `${vscode.env.appName} ${version} for ${target}`;
    const header = `// Default Keybindings of ${signature}\n`;
    return header;
}

function makeOutputFilePath(platform) {
    const prefix = (
        platform === 'win32' ? 'windows' :
        platform === 'darwin' ? 'macos' :
        'linux'
    );
    const outputPath = path.resolve(__dirname, `../${prefix}.keybindings.raw.json`);
    return outputPath;
}

async function run() {
    await sleep(2000);
    const json = await getDefaultKeybindingsText();
    if (!json || json.trim().length === 0) {
        throw new Error('Default keybindings content was empty');
    }
    const platform = os.platform();
    const header = makeHeader(platform);
    const outputPath = makeOutputFilePath(platform);
    await fsPromises.writeFile(outputPath, header + json);
    console.log(`The default keybindings JSON has been successfully saved to ${outputPath}.`);
}

module.exports = {
    run
};
