@echo off
REM ============================================================================
REM Hermes Agent Installer for Windows (CMD wrapper)
REM ============================================================================
REM This batch file launches the PowerShell installer for users running CMD.
REM
REM Usage:
REM   curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.cmd -o install.cmd && install.cmd && del install.cmd
REM
REM Or if you're already in PowerShell, use the direct command instead:
REM   iex (irm https://hermes-agent.nousresearch.com/install.ps1)
REM ============================================================================

echo.
echo  Hermes Agent Installer
echo  Launching PowerShell installer...
echo.

powershell -ExecutionPolicy ByPass -NoProfile -Command "$repo = [string]$env:HERMES_INSTALL_REPOSITORY; $installerUrl = 'https://hermes-agent.nousresearch.com/install.ps1'; $installerArgs = @(); if (-not [string]::IsNullOrWhiteSpace($repo)) { if (($repo -notmatch '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?/[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98}[A-Za-z0-9])?$') -or $repo.Contains('..') -or $repo.EndsWith('.git') -or $repo.StartsWith('-') -or ($repo -match '^(https?:|git@)')) { throw 'HERMES_INSTALL_REPOSITORY must be a safe GitHub owner/repo identity' }; $installerUrl = 'https://raw.githubusercontent.com/' + $repo + '/main/scripts/install.ps1'; $installerArgs = @('-Repository', $repo) }; $installer = [scriptblock]::Create((irm $installerUrl)); & $installer @installerArgs"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  Installation failed. Please try running PowerShell directly:
    echo    powershell -ExecutionPolicy ByPass -NoProfile -Command "$repo = [string]$env:HERMES_INSTALL_REPOSITORY; $installerUrl = 'https://hermes-agent.nousresearch.com/install.ps1'; $installerArgs = @(); if (-not [string]::IsNullOrWhiteSpace($repo)) { if (($repo -notmatch '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?/[A-Za-z0-9](?:[A-Za-z0-9._-]{0,98}[A-Za-z0-9])?$') -or $repo.Contains('..') -or $repo.EndsWith('.git') -or $repo.StartsWith('-') -or ($repo -match '^(https?:|git@)')) { throw 'HERMES_INSTALL_REPOSITORY must be a safe GitHub owner/repo identity' }; $installerUrl = 'https://raw.githubusercontent.com/' + $repo + '/main/scripts/install.ps1'; $installerArgs = @('-Repository', $repo) }; $installer = [scriptblock]::Create((irm $installerUrl)); & $installer @installerArgs"
    echo.
    pause
    exit /b 1
)
