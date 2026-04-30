# Cursor default keyboard shortcuts

This repository stores **Cursor** default keyboard shortcuts as JSON for **Windows** and **macOS**, plus **negative** keybinding files derived from the same defaults (useful for bulk-unbinding defaults in a custom `keybindings.json` before layering your own bindings).

The layout and maintenance style follow the community project [codebling/vs-code-default-keybindings](https://github.com/codebling/vs-code-default-keybindings/commits/master/), which publishes **VS Code** default shortcuts per OS. Here the same idea is applied to **Cursor**, with GitHub Actions downloading the current **stable** Cursor build on the matching runner so you can refresh snapshots without a dedicated physical machine.

## What is in this repo

| File | Description |
|------|-------------|
| `windows.keybindings.json` / `macos.keybindings.json` | Full default shortcut lists (same idea as **Preferences: Open Default Keyboard Shortcuts (JSON)** inside the editor) |
| `windows.negative.keybindings.json` / `macos.negative.keybindings.json` | Each `command` becomes `-command`, so you can strip defaults and then paste your own bindings |
| `custom-keybindings.json` | Optional: local merged or backup shortcut JSON (same array shape as the defaults; maintain as needed) |

Intermediate `*.keybindings.raw.json` files under `scripts/` are **not** meant to be committed by default (see `scripts/.gitignore`).

## Updating via GitHub Actions (recommended)

Both workflows use **manual** dispatch (`workflow_dispatch`). Open the repo **Actions** tab, pick the workflow, click **Run workflow**, then download the **Artifacts** zip from the completed run.

| Workflow | Runner | Artifact name | After unzip, place at (repo root relative) |
|----------|--------|-----------------|---------------------------------------------|
| **Export Cursor macOS default keybindings** | `macos-latest` | `cursor-macos-default-keybindings-raw` | `scripts/macos.keybindings.raw.json` |
| **Export Cursor Windows default keybindings** | `windows-latest` | `cursor-windows-default-keybindings-raw` | `scripts/windows.keybindings.raw.json` |

How it works, in short:

- Resolve the latest **stable** Cursor installer via Cursor’s public download API (macOS: attach DMG; Windows: silent user setup).
- Run the Node exporter under `scripts/get_default_keybindings` (`@vscode/test-electron` with `vscodeExecutablePath` pointing at Cursor), which opens the default keybindings document and writes the raw file.
- On macOS CI, profile directories live under a short temp prefix to avoid Unix socket path length limits.

After you copy the raw file into `scripts/`, you can run `scripts/process_json.py` locally to regenerate normalized `*.keybindings.json` and `*.negative.keybindings.json` at the repository root (same “raw → polished JSON” idea as [codebling/vs-code-default-keybindings](https://github.com/codebling/vs-code-default-keybindings); script comments still describe the older VS Code copy-paste flow, but the processor works on Cursor exports too).

## Local scripts (optional)

### `scripts/get_default_keybindings/`

- **Install**: `npm ci` in that directory.
- **Against local Cursor**: set `CURSOR_EXECUTABLE_PATH` to your Cursor binary, then run `node main.js`. This writes the current platform’s `*.keybindings.raw.json` under `scripts/`.
- **Without** `CURSOR_EXECUTABLE_PATH`: `@vscode/test-electron` downloads **VS Code** as the test host (upstream-style). For Cursor snapshots, always set `CURSOR_EXECUTABLE_PATH` locally or rely on the workflows above.

### `scripts/process_json.py`

Reads whichever of `scripts/{linux,windows,macos}.keybindings.raw.json` exist and writes cleaned `*.keybindings.json` and `*.negative.keybindings.json` to the **parent** directory (repo root). Linux is supported if you add a Linux raw file; CI in this repo currently only automates Windows and macOS.

## Acknowledgements

- Repository structure and the “defaults + negatives” pairing are inspired by [codebling/vs-code-default-keybindings](https://github.com/codebling/vs-code-default-keybindings/commits/master/).
- Export mechanics rely on the VS Code / Cursor extension test host and the **Open Default Keyboard Shortcuts (JSON)** behavior.

## Disclaimer

Cursor is a product of Anysphere and others. This repository only hosts shortcut data extracted from official installers for personal or team keymap work and comparison. It is **not** an official Cursor release artifact. Bindings change with Cursor versions—regenerate via Actions or your local Cursor when you upgrade.
