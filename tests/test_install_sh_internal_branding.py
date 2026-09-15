"""Regression tests for install.sh Lemon AI user-facing copy."""

from __future__ import annotations

import os
import subprocess
import tempfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
INSTALL_SH = REPO_ROOT / "scripts" / "install.sh"
INSTALL_PS1 = REPO_ROOT / "scripts" / "install.ps1"


def test_internal_install_sh_copy_uses_dynamic_product_identity() -> None:
    text = INSTALL_SH.read_text()

    assert 'INSTALLER_PRODUCT_NAME="Lemon AI"' in text
    assert 'INSTALLER_AGENT_NAME="Lemon AI"' in text
    assert 'INSTALLER_COMPANY_NAME="Lemon Digital"' in text
    assert 'INSTALLER_DESKTOP_APP_NAME="Lemon AI.app"' in text
    assert "apps/desktop -> $INSTALLER_DESKTOP_APP_NAME" in text
    assert 'repository_title="Tải Lemon AI"' in text
    assert 'complete_title="Hoàn tất cài Lemon AI"' in text
    assert 'done_title="✓ Cài đặt Lemon AI hoàn tất!"' in text
    assert 'commands_title="🚀 Lệnh kỹ thuật:"' in text
    assert 'cmd_update="Cập nhật phiên bản mới nhất"' in text
    assert "log_installer_diagnostics \"$stage\"" in text
    assert 'printf \'%s CLI command: hermes %s\\n\' "$INSTALLER_PRODUCT_NAME" "$cli_args"' in text

    stale_user_facing_literals = [
        "apps/desktop -> Lemon AI.app or Hermes.app",
        "Hermes install may complete",
        "Hermes launcher prerequisites not found",
        "Hermes requires Python",
        "Hermes requires Node",
        "Hermes behaves unexpectedly",
        "running for Hermes to send/receive messages",
        "installing Hermes-managed Node",
        "found (Hermes-managed)",
    ]

    for literal in stale_user_facing_literals:
        assert literal not in text


def test_install_ps1_internal_copy_uses_dynamic_product_identity() -> None:
    text = INSTALL_PS1.read_text()

    assert '$InstallerProductName = if ($InternalDesktopBuild) { "Lemon AI" } else { "Hermes" }' in text
    assert '$InstallerManagedRuntimeLabel = "$InstallerProductName-managed"' in text
    assert 'Write-Info "Installing $InstallerManagedRuntimeLabel Node.js $NodeVersion LTS..."' in text
    assert 'Write-Warn "Node.js $version is unsupported ($InstallerProductName requires Node 22.22+, 24.11+, or 26+)"' in text
    assert 'throw "$InstallerManagedRuntimeLabel Python is unavailable. Run install.ps1 -Stage python first."' in text
    assert 'Write-Warn "Review git diff / git status if $InstallerProductName behaves unexpectedly."' in text

    stale_user_facing_literals = [
        "Hermes-managed Node.js is in use",
        "Failed to resolve Hermes-managed Python",
        "Trying a Hermes-managed PortableGit install",
        "Hermes requires Node",
        "Hermes requirement",
        "Using a Hermes-managed Node.js installation",
        "found (Hermes-managed)",
        "Installing Hermes-managed Node.js",
        "Hermes behaves unexpectedly",
        "Hermes-managed Python is unavailable",
        "Hermes.app or Lemon AI.app",
        "Lemon AI.app or Hermes.app",
    ]

    non_comment_lines = "\n".join(
        line for line in text.splitlines() if not line.lstrip().startswith("#")
    )
    for literal in stale_user_facing_literals:
        assert literal not in non_comment_lines


def test_internal_install_sh_desktop_build_does_not_fallback_to_hermes_artifacts() -> None:
    text = INSTALL_SH.read_text()
    resolver_start = text.index('    local app=""')
    internal_macos_start = text.index('    elif [ "$INTERNAL_DESKTOP_BUILD" = true ]; then', resolver_start)
    internal_macos_end = text.index('    else\n        app="$(select_newest_macos_app', internal_macos_start)
    internal_macos_block = text[internal_macos_start:internal_macos_end]
    linux_block = text[resolver_start:internal_macos_start]

    assert 'Lemon AI.app' in internal_macos_block
    assert 'Hermes.app' not in internal_macos_block
    assert '[ "$INTERNAL_DESKTOP_BUILD" != true ] && [ -x "$desktop_dir/release/linux-unpacked/hermes" ]' in linux_block
    assert '[ "$INTERNAL_DESKTOP_BUILD" != true ] && [ -x "$desktop_dir/release/linux-unpacked/Hermes" ]' in linux_block
    assert 'Desktop build completed but no Lemon AI app was found' in text


def test_install_sh_preserves_hermes_as_technical_cli_command() -> None:
    text = INSTALL_SH.read_text()

    assert 'CLI command: hermes' in text
    assert "Run 'hermes setup' after install." in text
    assert "Run 'hermes gateway install' later." in text
    assert 'HERMES_HOME="${HERMES_DESKTOP_HOME_OVERRIDE:-$DEFAULT_HERMES_HOME}"' in text


def test_install_sh_config_stage_emits_lemon_diagnostics_and_seed() -> None:
    with tempfile.TemporaryDirectory() as raw_tmp:
        tmp = Path(raw_tmp)
        home = tmp / "home"
        install_dir = tmp / "install"
        hermes_home = home / ".lemon-ai"
        install_dir.mkdir(parents=True)
        home.mkdir()
        (install_dir / (".env" + ".example")).write_text("DUMMY_KEY=\n", encoding="utf-8")
        (install_dir / "cli-config.yaml.example").write_text("profiles: {}\n", encoding="utf-8")

        env = os.environ.copy()
        env.update({"HOME": str(home), "HERMES_INSTALLER_BRAND": "lemon"})

        result = subprocess.run(
            [
                "bash",
                str(INSTALL_SH),
                "--stage",
                "config",
                "--non-interactive",
                "--json",
                "--dir",
                str(install_dir),
                "--hermes-home",
                str(hermes_home),
            ],
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=True,
        )

        assert f"Lemon AI home: {hermes_home}" in result.stdout
        assert f"Lemon AI install root: {install_dir}" in result.stdout
        assert "Lemon AI runtime dir: lemon-agent" in result.stdout
        assert "Lemon AI CLI command: hermes config" in result.stdout
        assert '"ok":true' in result.stdout.replace(" ", "")

        soul = (hermes_home / "SOUL.md").read_text(encoding="utf-8")
        assert "You are Lemon AI, built by Lemon Digital." in soul
        assert "Hermes Agent" not in soul
        assert "Nous Research" not in soul


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print(f"PASS {name}")
