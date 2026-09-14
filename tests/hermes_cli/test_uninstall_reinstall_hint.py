from pathlib import Path

import pytest

from hermes_cli import uninstall


def _run_keep_data_uninstall(monkeypatch, capsys, tmp_path: Path, *, windows: bool) -> str:
    project_root = tmp_path / "checkout"
    hermes_home = tmp_path / "home"
    project_root.mkdir()
    hermes_home.mkdir()

    monkeypatch.setattr(uninstall, "uninstall_gateway_service", lambda: True)
    monkeypatch.setattr(uninstall, "remove_path_from_shell_configs", lambda: [])
    monkeypatch.setattr(uninstall, "remove_wrapper_script", lambda: [])
    monkeypatch.setattr(uninstall, "remove_node_symlinks", lambda _home: [])
    monkeypatch.setattr(uninstall, "remove_windows_bin_launchers", lambda windows=False: [])
    monkeypatch.setattr(uninstall, "remove_hermes_env_vars_windows", lambda _home=None: [])
    monkeypatch.setattr(uninstall, "_rmtree_step", lambda _path: None)
    monkeypatch.setattr(uninstall, "_remove_step", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(uninstall, "_is_windows", lambda: windows)

    uninstall._perform_uninstall(
        project_root=project_root,
        hermes_home=hermes_home,
        full_uninstall=False,
        named_profiles=[],
        remove_profiles=False,
    )

    return capsys.readouterr().out


@pytest.mark.parametrize(
    ("windows", "expected"),
    [
        (False, "curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"),
        (True, "iex (irm https://hermes-agent.nousresearch.com/install.ps1)"),
    ],
)
def test_keep_data_uninstall_preserves_public_reinstall_hint(
    windows, expected, monkeypatch, capsys, tmp_path
):
    monkeypatch.delenv("HERMES_UPDATE_REPOSITORY", raising=False)
    monkeypatch.delenv("HERMES_INSTALL_REPOSITORY", raising=False)

    out = _run_keep_data_uninstall(monkeypatch, capsys, tmp_path, windows=windows)

    assert expected in out
    assert "raw.githubusercontent.com" not in out


@pytest.mark.parametrize(
    ("repository", "windows", "expected"),
    [
        (
            "DangLemon/hermes-agent",
            False,
            "curl -fsSL https://raw.githubusercontent.com/DangLemon/hermes-agent/main/scripts/install.sh | bash -s -- --repo DangLemon/hermes-agent",
        ),
        (
            "DangLemon/hermes-agent",
            True,
            "& ([scriptblock]::Create((irm https://raw.githubusercontent.com/DangLemon/hermes-agent/main/scripts/install.ps1))) -Repository 'DangLemon/hermes-agent'",
        ),
        (
            "ExampleOrg/runtime-agent",
            False,
            "curl -fsSL https://raw.githubusercontent.com/ExampleOrg/runtime-agent/main/scripts/install.sh | bash -s -- --repo ExampleOrg/runtime-agent",
        ),
    ],
)
def test_keep_data_uninstall_uses_configured_reinstall_hint(
    repository, windows, expected, monkeypatch, capsys, tmp_path
):
    monkeypatch.setenv("HERMES_UPDATE_REPOSITORY", repository)

    out = _run_keep_data_uninstall(monkeypatch, capsys, tmp_path, windows=windows)

    assert expected in out
    assert "https://hermes-agent.nousresearch.com" not in out
