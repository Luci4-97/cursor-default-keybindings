'use strict';
const os = require('os');
const path = require('path');
const fsPromises = require('fs/promises');
const { runTests } = require('@vscode/test-electron');

async function main() {
    try {
        // Keep profile paths very short; long unix socket paths can break startup on macOS CI.
        const emptyDir1 = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'ckb-ext-'));
        const emptyDir2 = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'ckb-user-'));

        // Path to the script that retrieves and saves the default keybindings JSON to a file.
        const scriptPath = path.resolve(__dirname, 'main_impl.js');

        const launchArgs = [
            '--extensions-dir',
            emptyDir1,
            '--user-data-dir',
            emptyDir2
        ];

        // The Electron sandbox cannot start under headless CI (xvfb) / extracted AppImage on Linux.
        if (os.platform() === 'linux') {
            launchArgs.push('--no-sandbox');
        }

        const testOptions = {
            extensionDevelopmentPath: __dirname,
            extensionTestsPath: scriptPath,
            launchArgs
        };

        // Allow CI to run tests against a preinstalled Cursor executable.
        if (process.env.CURSOR_EXECUTABLE_PATH) {
            testOptions.vscodeExecutablePath = process.env.CURSOR_EXECUTABLE_PATH;
        }

        // If no executable path is provided, vscode-test downloads VS Code by default.
        await runTests(testOptions);
    } catch (err) {
        console.error('Failed to run');
        process.exit(1);
    }
}

main();