# Lemon AI Desktop

Desktop app nội bộ cho nhân viên Lemon Digital. Bản build nội bộ dùng tiếng Việt mặc định, logo/style Lemon, provider/MCP seed từ `lemon-ai-desktop.config.json`, và runtime path Lemon riêng để không lẫn với upstream install.

## Path và file chính

- App name/product/executable: `Lemon AI`
- App ID: `com.lemondigital.lemonai`
- macOS/Linux home: `~/.lemon-ai`
- Windows home: `%LOCALAPPDATA%\Lemon AI`
- Runtime checkout: `lemon-agent`
- Harness resource: `lemon-ai-harness.json`
- Config source: `apps/desktop/lemon-ai-desktop.config.json`
- Config export trong UI nội bộ: `lemon-ai-config.json`

## Build local

macOS arm64 DMG:

```bash
cd apps/desktop
LEMON_AI_DESKTOP_HARNESS_CONFIG=./lemon-ai-desktop.config.json npm run dist:mac:dmg -- --arm64
```

Windows x64 NSIS:

```powershell
cd apps/desktop
$env:LEMON_AI_DESKTOP_HARNESS_CONFIG = ".\lemon-ai-desktop.config.json"
npm run dist:win:nsis -- --x64
```

## CI artifacts

Workflow `.github/workflows/lemon-desktop-installers.yml` upload artifact:

- `lemon-desktop-installer-mac-arm64`
- `lemon-desktop-installer-win-x64`

## Compatibility contract

Desktop vẫn gọi backend Python qua `hermes_cli` và CLI `hermes`. Không rename các contract này nếu chưa làm migration đầy đủ cho Python package, command entrypoints, IPC bridge, storage keys và deep links.
