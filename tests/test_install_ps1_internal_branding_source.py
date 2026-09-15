"""Source-level regressions for Windows Lemon AI installer identity.

PowerShell is not available on every development host. These tests lock the
contract that matters for fresh internal Windows installs without needing to
execute install.ps1 locally.
"""

from __future__ import annotations

import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
INSTALL_PS1 = REPO_ROOT / "scripts" / "install.ps1"


def _source() -> str:
    return INSTALL_PS1.read_text(encoding="utf-8")


def _function_body(source: str, name: str) -> str:
    match = re.search(
        rf"function {re.escape(name)} \{{(?P<body>.*?)\n\}}\n", source, re.S
    )
    assert match, f"Expected function {name} in scripts/install.ps1"
    return match.group("body")


def test_explicit_lemon_repository_selects_internal_identity_before_checkout_detection() -> None:
    source = _source()
    detector = _function_body(source, "Test-InternalHarnessConfig")

    assert "function Test-RepositorySelectsInternalBuild" in source
    assert '"DangLemon/hermes-agent"' in _function_body(
        source, "Test-RepositorySelectsInternalBuild"
    )
    assert "Test-RepositorySelectsInternalBuild" in detector
    assert detector.index("Test-RepositorySelectsInternalBuild") < detector.index(
        "Test-CheckoutInternalHarnessConfig"
    )


def test_internal_persona_seed_uses_lemon_identity_variables() -> None:
    source = _source()
    config_stage = _function_body(source, "Copy-ConfigTemplates")

    assert "-AgentName $InstallerAgentName" in config_stage
    assert "-CompanyName $InstallerCompanyName" in config_stage
    assert "You are Hermes Agent, built by Nous Research." not in config_stage


def test_fresh_internal_desktop_build_requires_lemon_executable_only() -> None:
    candidates = _function_body(_source(), "Get-DesktopExecutableCandidates")

    assert (
        '$executableName = if ($InternalBuild) { "Lemon AI.exe" } else { "Hermes.exe" }'
        in candidates
    )
    assert "Hermes.exe" not in candidates.split('"Lemon AI.exe"', 1)[0]


def test_internal_shortcut_creation_never_targets_legacy_hermes_exe() -> None:
    source = _source()
    identity = _function_body(source, "Get-DesktopShortcutIdentity")
    shortcuts = _function_body(source, "New-DesktopShortcuts")

    assert "Internal desktop shortcut creation requires Lemon AI.exe" in identity
    assert "'Lemon AI.lnk'" in identity
    assert "'Hermes.lnk'" in identity
    assert "$legacyTargets = @(" in shortcuts
    assert "Test-ShortcutOwnsTarget -Shortcut $legacy -TargetExe $TargetExe -WorkDir $workDir" in shortcuts
