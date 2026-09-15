from pathlib import Path


def test_windows_native_install_path_docs_match_installer() -> None:
    doc = Path("website/docs/user-guide/windows-native.md").read_text()
    install = Path("scripts/install.ps1").read_text()

    # The launchers live in the managed binary dir OUTSIDE the git checkout
    # (HERMES_HOME\bin, next to the managed uv) — NOT the whole venv\Scripts
    # (which would shadow the user's python, #83797) and NOT a dir inside
    # the checkout (which `hermes update`'s autostash swept off disk).
    assert "%LOCALAPPDATA%\\hermes\\bin" in doc
    assert (
        "Get-Command hermes        # should print "
        "C:\\Users\\<you>\\AppData\\Local\\hermes\\bin\\hermes.cmd"
    ) in doc
    # Installer exposes $HermesHome\bin through repository-aware .cmd wrappers.
    # The executable launchers stay inside venv\Scripts so PATH never exposes
    # that whole directory (and therefore never shadows the user's Python).
    assert '$hermesBin = "$HermesHome\\bin"' in install
    assert 'foreach ($launcher in @("hermes", "hermes-acp"))' in install
    assert '$cmd = Join-Path $Destination "$launcher.cmd"' in install
    assert '$shadowingExe = Join-Path $Destination "$launcher.exe"' in install
    # Guard against regressions to either legacy layout.
    assert '$hermesBin = "$InstallDir\\venv\\Scripts"' not in install
    assert '$hermesBin = "$InstallDir\\bin"' not in install
