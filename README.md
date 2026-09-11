# Lemon AI

Lemon AI là bản desktop nội bộ của Lemon Digital, đóng gói từ Hermes Agent nhưng dùng nhận diện, cấu hình mặc định và runtime path riêng cho công ty.

## Runtime mặc định

- macOS/Linux: `~/.lemon-ai/lemon-agent`
- Windows: `%LOCALAPPDATA%\Lemon AI\lemon-agent`
- Log desktop/runtime: thư mục `logs` bên trong Lemon AI home ở trên
- Config nội bộ đóng gói: `apps/desktop/lemon-ai-desktop.config.json`
- Harness resource trong app: `lemon-ai-harness.json`

## Build bộ cài nội bộ

GitHub Actions workflow `Lemon Desktop Installers` build sẵn:

- macOS arm64 DMG: artifact `lemon-desktop-installer-mac-arm64`
- Windows x64 NSIS: artifact `lemon-desktop-installer-win-x64`

Build local từ checkout:

```bash
cd apps/desktop
LEMON_AI_DESKTOP_HARNESS_CONFIG=./lemon-ai-desktop.config.json npm run dist:mac:dmg -- --arm64
```

Trên Windows PowerShell:

```powershell
cd apps/desktop
$env:LEMON_AI_DESKTOP_HARNESS_CONFIG = ".\lemon-ai-desktop.config.json"
npm run dist:win:nsis -- --x64
```

## Compatibility contract còn giữ nguyên

Một số tên kỹ thuật vẫn giữ để không phá backend và migration path: Python module `hermes_cli`, CLI command `hermes`, IPC bridge `window.hermesDesktop`, TypeScript alias `@hermes/*`, deep-link scheme `hermes`, và source repository hiện tại `DangLemon/hermes-agent`.

Các tên người dùng thấy trong app/bộ cài nội bộ phải là Lemon AI, gồm app name, Dock/Start menu shortcut, runtime home, runtime root, installer artifact, log path hiển thị và config export.
