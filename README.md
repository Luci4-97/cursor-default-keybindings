# Cursor default keyboard shortcuts

This repository stores **Cursor** default keyboard shortcuts as JSON for **Windows**, **macOS**, and **Linux**, plus **negative** keybinding files derived from the same defaults (useful for bulk-unbinding defaults in a custom `keybindings.json` before layering your own bindings).

The layout and maintenance style follow the community project [codebling/vs-code-default-keybindings](https://github.com/codebling/vs-code-default-keybindings/commits/master/), which publishes **VS Code** default shortcuts per OS. Here the same idea is applied to **Cursor**, with GitHub Actions downloading the current **stable** Cursor build on the matching runner so you can refresh snapshots without a dedicated physical machine.

## What is in this repo

| File | Description |
|------|-------------|
| `windows.keybindings.json` / `macos.keybindings.json` / `linux.keybindings.json` | Full default shortcut lists (same idea as **Preferences: Open Default Keyboard Shortcuts (JSON)** inside the editor) |
| `windows.negative.keybindings.json` / `macos.negative.keybindings.json` / `linux.negative.keybindings.json` | Each `command` becomes `-command`, so you can strip defaults and then paste your own bindings |
| `custom-keybindings.json` | Optional: local merged or backup shortcut JSON (same array shape as the defaults; maintain as needed) |

Intermediate `*.keybindings.raw.json` files under `scripts/` are **not** meant to be committed by default (see `scripts/.gitignore`).

## Updating via GitHub Actions (recommended)

### Fully automated: open a PR with the refreshed files

The **Update Cursor default keybindings** workflow (`workflow_dispatch`) does the whole loop for you. Open the repo **Actions** tab, pick that workflow, and click **Run workflow**. It:

1. Exports the raw defaults on `windows-latest`, `macos-latest`, and `ubuntu-latest` (by reusing the three per-OS exporters below).
2. Downloads the raw artifacts, runs `scripts/process_json.py`, and regenerates every `*.keybindings.json` / `*.negative.keybindings.json` at the repo root.
3. If anything changed, commits to a new branch and opens a pull request titled `Update for Cursor <version>` (skipped when a PR with that title already exists).

> The PR step uses the built-in `GITHUB_TOKEN`. Enable **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests** for it to work.

### Per-OS exporters (artifact only)

Each platform also has a standalone exporter you can run on its own (also exposed as a reusable `workflow_call`, which is how the orchestrator above invokes them). Running one directly uploads just the raw artifact, which you then place under `scripts/` and process locally.

| Workflow | Runner | Artifact name | After unzip, place at (repo root relative) |
|----------|--------|-----------------|---------------------------------------------|
| **Export Cursor Windows default keybindings** | `windows-latest` | `cursor-windows-default-keybindings-raw` | `scripts/windows.keybindings.raw.json` |
| **Export Cursor macOS default keybindings** | `macos-latest` | `cursor-macos-default-keybindings-raw` | `scripts/macos.keybindings.raw.json` |
| **Export Cursor Linux default keybindings** | `ubuntu-latest` | `cursor-linux-default-keybindings-raw` | `scripts/linux.keybindings.raw.json` |

How it works, in short:

- Resolve the latest **stable** Cursor build via Cursor’s public download API (Windows: silent user setup; macOS: attach DMG; Linux: download the AppImage and `--appimage-extract` it since CI runners have no FUSE).
- Run the Node exporter under `scripts/get_default_keybindings` (`@vscode/test-electron` with `vscodeExecutablePath` pointing at Cursor), which opens the default keybindings document and writes the raw file. On Linux it runs under `xvfb-run` and adds `--no-sandbox`.
- On macOS CI, profile directories live under a short temp prefix to avoid Unix socket path length limits.

After you copy a raw file into `scripts/`, you can run `scripts/process_json.py` locally to regenerate normalized `*.keybindings.json` and `*.negative.keybindings.json` at the repository root (same “raw → polished JSON” idea as [codebling/vs-code-default-keybindings](https://github.com/codebling/vs-code-default-keybindings); script comments still describe the older VS Code copy-paste flow, but the processor works on Cursor exports too).

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
