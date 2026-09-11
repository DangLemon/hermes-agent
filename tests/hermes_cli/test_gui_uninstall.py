"""Tests for hermes_cli.gui_uninstall — GUI-only uninstall + install discovery.

Covers the cross-platform artifact discovery, the agent/GUI detection the
desktop UI gates options on, and that ``uninstall_gui`` removes only GUI
artifacts (built renderer/release/node_modules, packaged bundle, Electron
userData) while leaving the Python agent + config/sessions/.env intact.
"""

import sys
from pathlib import Path

import pytest

import hermes_cli.gui_uninstall as gu

VALID_INTERNAL_HARNESS_JSON = '{\n  "schemaVersion": 1,\n  "profile": "internal",\n  "ui": {\n    "agents": false,\n    "cron": true,\n    "messaging": false,\n    "terminal": true,\n    "webhooks": false\n  }\n}\n'


def _write_internal_harness(path: Path) -> None:
    path.write_text(VALID_INTERNAL_HARNESS_JSON, encoding="utf-8")


def _make_agent(hermes_home: Path) -> Path:
    """Create a fake agent install: source package + venv."""
    agent_root = hermes_home / "hermes-agent"
    (agent_root / "hermes_cli").mkdir(parents=True)
    (agent_root / "hermes_cli" / "__init__.py").write_text("")
    (agent_root / "venv" / "bin").mkdir(parents=True)
    return agent_root


def _make_gui_build(hermes_home: Path) -> None:
    """Create the source-built GUI artifacts a `hermes desktop` run produces."""
    desktop = hermes_home / "hermes-agent" / "apps" / "desktop"
    (desktop / "dist").mkdir(parents=True)
    (desktop / "dist" / "index.html").write_text("<html>")
    (desktop / "release" / "linux-unpacked").mkdir(parents=True)
    (desktop / "node_modules").mkdir(parents=True)
    (hermes_home / "hermes-agent" / "node_modules").mkdir(parents=True)
    (hermes_home / "desktop-build-stamp.json").write_text("{}")


def _make_user_data(hermes_home: Path) -> None:
    (hermes_home / "config.yaml").write_text("x: 1\n")
    (hermes_home / ".env").write_text("KEY=secret\n")
    (hermes_home / "sessions").mkdir()


def test_gui_install_summary_shape(tmp_path, monkeypatch):
    hermes_home = tmp_path / ".hermes"
    _make_agent(hermes_home)
    _make_gui_build(hermes_home)
    monkeypatch.setattr(gu, "packaged_gui_app_paths", lambda: [])
    monkeypatch.setattr(gu, "desktop_userdata_dir", lambda: tmp_path / "none")

    summary = gu.gui_install_summary(hermes_home)
    # JSON-serializable primitives the desktop UI gates on.
    assert summary["agent_installed"] is True
    assert summary["gui_installed"] is True
    assert isinstance(summary["source_built_artifacts"], list)
    assert all(isinstance(p, str) for p in summary["source_built_artifacts"])
    assert summary["hermes_home"] == str(hermes_home)
    assert summary["platform"] == sys.platform


def test_invalid_internal_env_keeps_uninstall_identity_ordinary(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(tmp_path / "missing.json"))

    assert gu._desktop_product_names() == ["Hermes"]
    assert gu._runtime_root_names() == ["hermes-agent"]


def test_internal_source_built_gui_artifacts_scope_to_lemon_root_by_default(
    tmp_path, monkeypatch
):
    config = tmp_path / "internal.json"
    _write_internal_harness(config)
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(config))
    hermes_home = tmp_path / ".lemon-ai"

    artifacts = gu.source_built_gui_artifacts(hermes_home)

    assert hermes_home / "lemon-agent" / "apps" / "desktop" / "release" in artifacts
    assert hermes_home / "hermes-agent" / "apps" / "desktop" / "release" not in artifacts


def test_internal_source_built_gui_artifacts_include_legacy_root_for_explicit_migration(
    tmp_path, monkeypatch
):
    config = tmp_path / "internal.json"
    _write_internal_harness(config)
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(config))
    monkeypatch.setenv("HERMES_DESKTOP_LEGACY_MIGRATION", "1")
    hermes_home = tmp_path / ".lemon-ai"

    artifacts = gu.source_built_gui_artifacts(hermes_home)

    assert hermes_home / "lemon-agent" / "apps" / "desktop" / "release" in artifacts
    assert hermes_home / "hermes-agent" / "apps" / "desktop" / "release" in artifacts


def test_internal_agent_detection_accepts_lemon_runtime_root(tmp_path, monkeypatch):
    config = tmp_path / "internal.json"
    _write_internal_harness(config)
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(config))
    hermes_home = tmp_path / ".lemon-ai"
    (hermes_home / "lemon-agent" / "hermes_cli").mkdir(parents=True)

    assert gu.agent_is_installed(hermes_home) is True


def test_ordinary_agent_detection_ignores_lemon_runtime_root(tmp_path, monkeypatch):
    monkeypatch.delenv("HERMES_DESKTOP_HARNESS_CONFIG", raising=False)
    hermes_home = tmp_path / ".hermes"
    (hermes_home / "lemon-agent" / "hermes_cli").mkdir(parents=True)

    assert gu.agent_is_installed(hermes_home) is False


def test_linux_discovery_includes_launcher_entry(tmp_path, monkeypatch):
    """The launcher entry that `hermes desktop` installs is removable."""
    monkeypatch.setattr(gu.sys, "platform", "linux")
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path / "xdg"))

    from hermes_cli import linux_desktop_entry as lde

    assert lde.desktop_entry_path() in gu.packaged_gui_app_paths()


@pytest.mark.macos_only
def test_macos_packaged_gui_paths_are_hermes_for_ordinary_build(monkeypatch):
    monkeypatch.delenv("HERMES_DESKTOP_HARNESS_CONFIG", raising=False)

    paths = gu.packaged_gui_app_paths()

    assert paths[:2] == [
        Path("/Applications/Hermes.app"),
        Path.home() / "Applications" / "Hermes.app",
    ]


@pytest.mark.macos_only
def test_macos_packaged_gui_paths_scope_to_lemon_by_default(tmp_path, monkeypatch):
    config = tmp_path / "internal.json"
    _write_internal_harness(config)
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(config))

    paths = gu.packaged_gui_app_paths()

    assert paths == [
        Path("/Applications/Lemon AI.app"),
        Path.home() / "Applications" / "Lemon AI.app",
    ]


@pytest.mark.windows_only
def test_windows_packaged_gui_paths_are_hermes_for_ordinary_build(
    tmp_path, monkeypatch
):
    monkeypatch.delenv("HERMES_DESKTOP_HARNESS_CONFIG", raising=False)
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "local"))
    monkeypatch.setenv("ProgramFiles", str(tmp_path / "program-files"))

    paths = gu.packaged_gui_app_paths()

    assert paths == [
        tmp_path / "local" / "Programs" / "Hermes",
        tmp_path / "local" / "hermes-desktop",
        tmp_path / "program-files" / "Hermes",
    ]


@pytest.mark.macos_only
def test_macos_packaged_gui_paths_include_legacy_for_explicit_migration(tmp_path, monkeypatch):
    config = tmp_path / "internal.json"
    _write_internal_harness(config)
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(config))
    monkeypatch.setenv("HERMES_DESKTOP_LEGACY_MIGRATION", "1")

    paths = gu.packaged_gui_app_paths()

    assert paths == [
        Path("/Applications/Lemon AI.app"),
        Path.home() / "Applications" / "Lemon AI.app",
        Path("/Applications/Hermes.app"),
        Path.home() / "Applications" / "Hermes.app",
    ]


@pytest.mark.windows_only
def test_windows_packaged_gui_paths_scope_to_lemon_by_default(
    tmp_path, monkeypatch
):
    config = tmp_path / "internal.json"
    _write_internal_harness(config)
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(config))
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "local"))
    monkeypatch.setenv("ProgramFiles", str(tmp_path / "program-files"))

    paths = gu.packaged_gui_app_paths()

    assert paths == [
        tmp_path / "local" / "Programs" / "Lemon AI",
        tmp_path / "program-files" / "Lemon AI",
    ]


def test_windows_lemon_uninstall_ignores_existing_legacy_desktop_without_migration(
    tmp_path, monkeypatch
):
    config = tmp_path / "internal.json"
    _write_internal_harness(config)
    monkeypatch.setattr(gu.sys, "platform", "win32")
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(config))
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "local"))
    monkeypatch.setenv("ProgramFiles", str(tmp_path / "program-files"))
    legacy_path = tmp_path / "local" / "hermes-desktop"
    legacy_path.mkdir(parents=True)

    paths = gu.packaged_gui_app_paths()

    assert legacy_path not in paths
    assert paths == [
        tmp_path / "local" / "Programs" / "Lemon AI",
        tmp_path / "program-files" / "Lemon AI",
    ]


def test_windows_lemon_uninstall_includes_existing_legacy_desktop_for_explicit_migration(
    tmp_path, monkeypatch
):
    config = tmp_path / "internal.json"
    _write_internal_harness(config)
    monkeypatch.setattr(gu.sys, "platform", "win32")
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(config))
    monkeypatch.setenv("HERMES_DESKTOP_LEGACY_MIGRATION", "1")
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "local"))
    legacy_path = tmp_path / "local" / "hermes-desktop"
    legacy_path.mkdir(parents=True)

    assert legacy_path in gu.packaged_gui_app_paths()


@pytest.mark.windows_only
def test_windows_packaged_gui_paths_include_legacy_for_explicit_migration(
    tmp_path, monkeypatch
):
    config = tmp_path / "internal.json"
    _write_internal_harness(config)
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(config))
    monkeypatch.setenv("HERMES_DESKTOP_LEGACY_MIGRATION", "1")
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path / "local"))
    monkeypatch.setenv("ProgramFiles", str(tmp_path / "program-files"))

    paths = gu.packaged_gui_app_paths()

    assert paths == [
        tmp_path / "local" / "Programs" / "Lemon AI",
        tmp_path / "local" / "Programs" / "Hermes",
        tmp_path / "program-files" / "Lemon AI",
        tmp_path / "program-files" / "Hermes",
    ]


def test_internal_linux_discovery_scopes_to_lemon_entry_and_icon_by_default(
    tmp_path, monkeypatch
):
    monkeypatch.setattr(gu.sys, "platform", "linux")
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path / "xdg"))
    config = tmp_path / "internal.json"
    _write_internal_harness(config)
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(config))

    paths = gu.packaged_gui_app_paths()

    assert tmp_path / "xdg" / "applications" / "lemon-ai.desktop" in paths
    assert tmp_path / "xdg" / "applications" / "hermes.desktop" not in paths
    assert (
        tmp_path / "xdg" / "icons" / "hicolor" / "256x256" / "apps" / "lemon-ai.png"
        in paths
    )
    assert tmp_path / "xdg" / "icons" / "hicolor" / "256x256" / "apps" / "hermes.png" not in paths


def test_internal_linux_discovery_includes_legacy_entries_for_explicit_migration(
    tmp_path, monkeypatch
):
    monkeypatch.setattr(gu.sys, "platform", "linux")
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path / "xdg"))
    config = tmp_path / "internal.json"
    _write_internal_harness(config)
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(config))
    monkeypatch.setenv("HERMES_DESKTOP_LEGACY_MIGRATION", "1")

    paths = gu.packaged_gui_app_paths()

    assert tmp_path / "xdg" / "applications" / "hermes.desktop" in paths
    assert tmp_path / "xdg" / "icons" / "hicolor" / "256x256" / "apps" / "hermes.png" in paths


def test_uninstall_removes_launcher_entry_and_refreshes_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(gu.sys, "platform", "linux")
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path / "xdg"))

    from hermes_cli import linux_desktop_entry as lde

    entry = lde.desktop_entry_path()
    entry.parent.mkdir(parents=True, exist_ok=True)
    entry.write_text("x", encoding="utf-8")

    refreshed: list[Path] = []
    monkeypatch.setattr(
        lde,
        "refresh_desktop_databases",
        lambda d: refreshed.append(d) or ["kbuildsycoca6"],
    )

    hermes_home = tmp_path / ".hermes"
    _make_agent(hermes_home)
    icon = lde.icon_path(hermes_home / "hermes-agent")
    icon.parent.mkdir(parents=True, exist_ok=True)
    icon.write_bytes(b"\x89PNG")
    monkeypatch.setattr(gu, "desktop_userdata_dir", lambda: tmp_path / "none")

    removed = gu.uninstall_gui(hermes_home)

    assert entry in removed and not entry.exists()
    assert refreshed == [entry.parent]
    # The icon lives in the checkout. A GUI uninstall must not delete it.
    assert lde.icon_path(hermes_home / "hermes-agent").exists()
    # The agent itself survives a GUI uninstall.
    assert (hermes_home / "hermes-agent" / "hermes_cli").is_dir()


def test_uninstall_skips_cache_refresh_when_no_launcher_entry(tmp_path, monkeypatch):
    monkeypatch.setattr(gu.sys, "platform", "linux")
    monkeypatch.setenv("XDG_DATA_HOME", str(tmp_path / "xdg"))

    from hermes_cli import linux_desktop_entry as lde

    refreshed: list[Path] = []
    monkeypatch.setattr(
        lde, "refresh_desktop_databases", lambda d: refreshed.append(d) or []
    )
    monkeypatch.setattr(gu, "desktop_userdata_dir", lambda: tmp_path / "none")

    gu.uninstall_gui(tmp_path / ".hermes")

    assert refreshed == []


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX symlink semantics")
def test_remove_path_handles_symlink(tmp_path):
    target = tmp_path / "real"
    target.mkdir()
    link = tmp_path / "link"
    link.symlink_to(target)
    assert gu._remove_path(link) is True
    assert not link.exists()
    # The symlink is gone but its target is untouched.
    assert target.exists()


class _Args:
    """Minimal argparse-Namespace stand-in for run_uninstall."""

    def __init__(self, *, yes=False, full=False, gui=False, gui_summary=False):
        self.yes = yes
        self.full = full
        self.gui = gui
        self.gui_summary = gui_summary


def test_uninstall_args_namespace_mode_mapping():
    """_UninstallArgs maps mode → the gui/full flags run_uninstall reads."""
    import hermes_cli.uninstall as uninstall

    gui = uninstall._UninstallArgs(mode="gui")
    assert gui.gui is True and gui.full is False and gui.yes is True

    lite = uninstall._UninstallArgs(mode="lite")
    assert lite.gui is False and lite.full is False and lite.yes is True

    full = uninstall._UninstallArgs(mode="full")
    assert full.gui is False and full.full is True and full.yes is True
