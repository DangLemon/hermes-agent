"""Failed shell-state serialization must retain the last usable snapshot."""

import shlex
import subprocess

import pytest

from tools.environments import base_session_env


def test_failed_export_dump_preserves_snapshot_and_command_status(tmp_path, monkeypatch):
    snapshot = tmp_path / "session.sh"
    original = "export SURVIVOR=before\n"
    snapshot.write_text(original)
    monkeypatch.setattr(base_session_env, "_export_dump_excluding_session_vars", lambda *_: "false")
    script = base_session_env._wrap_command_script(
        "printf command-ok; false",
        quoted_cwd=shlex.quote(str(tmp_path)),
        quoted_snap=shlex.quote(str(snapshot)),
        snap_tmp_template=shlex.quote(str(tmp_path / "snapshot.tmp.XXXXXXXXXX")),
        passthrough_names=(),
        snapshot_ready=True,
        cwd_marker="SNAPSHOT_TEST_CWD",
    )
    result = subprocess.run(["bash", "-c", script], capture_output=True, text=True, timeout=10)
    assert result.returncode == 1
    assert "command-ok" in result.stdout
    assert snapshot.read_text() == original
    assert not list(tmp_path.glob("snapshot.tmp.*"))


@pytest.mark.parametrize("existing_snapshot", [False, True])
def test_failed_bootstrap_reports_failure_and_preserves_existing_snapshot(
    tmp_path, monkeypatch, existing_snapshot
):
    snapshot = tmp_path / "session.sh"
    original = "export SURVIVOR=before\n"
    if existing_snapshot:
        snapshot.write_text(original)
    monkeypatch.setattr(base_session_env, "_export_dump_excluding_session_vars", lambda *_: "false")
    script = base_session_env._snapshot_bootstrap_script(
        quoted_cwd=shlex.quote(str(tmp_path)),
        quoted_snap=shlex.quote(str(snapshot)),
        snap_tmp_template=shlex.quote(str(tmp_path / "snapshot.tmp.XXXXXXXXXX")),
        excluded_names=(),
        cwd_marker="SNAPSHOT_TEST_CWD",
    )
    result = subprocess.run(["bash", "-c", script], capture_output=True, text=True, timeout=10)
    assert result.returncode != 0
    assert snapshot.exists() == existing_snapshot
    if existing_snapshot:
        assert snapshot.read_text() == original
    assert not list(tmp_path.glob("snapshot.tmp.*"))
