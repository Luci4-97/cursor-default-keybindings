'use strict';
const os = require('os');
const path = require('path');
const fsPromises = require('fs/promises');
const vscode = require('vscode');

const sleep = msec => new Promise(resolve => setTimeout(resolve, msec));

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

// Cursor (unlike stock VS Code) can throw `Cannot read properties of undefined
// (reading 'activeEditor')` from `openDefaultKeybindingsFile` when the editor
// area is not ready yet. So we warm the editor area up and retry the command,
// catching rejections, until the default keybindings document shows up.
async function openDefaultKeybindingsFile() {
    const overallTimeoutMs = 90 * 1000;
    const maxAttempts = 30;

    return await new Promise((resolve, reject) => {
        let settled = false;

        const finishResolve = document => {
            if (settled) return;
            settled = true;
            listener.dispose();
            clearTimeout(timeout);
            resolve(document);
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
            // Force the editor area to initialize before opening the special editor.
            try {
                await vscode.commands.executeCommand('workbench.action.files.newUntitledFile');
            } catch (err) {
                console.error(`Warm-up newUntitledFile failed: ${err && err.message}`);
            }
            await sleep(1000);

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
                const document = findVisibleKeybindingsDocument();
                if (document) {
                    finishResolve(document);
                    return;
                }
            }
        })().catch(finishReject);
    });
}

function makeHeader(platform) {
    const target = (
        platform === 'win32' ? 'Windows' :
        platform === 'darwin' ? 'macOS' :
        'Linux'
    );
    const signature = `${vscode.env.appName} ${vscode.version} for ${target}`;
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
    await sleep(4000);
    const document = await openDefaultKeybindingsFile();
    const json = document.getText();
    const platform = os.platform();
    const header = makeHeader(platform);
    const outputPath = makeOutputFilePath(platform);
    await fsPromises.writeFile(outputPath, header + json);
    console.log(`The default keybindings JSON has been successfully saved to ${outputPath}.`);
}

module.exports = {
    run
};
