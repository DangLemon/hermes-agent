from __future__ import annotations

from pathlib import Path

from hermes_cli.desktop_identity import (
    internal_desktop_build,
    valid_internal_harness_config,
)

VALID = """{
  "schemaVersion": 1,
  "profile": "internal",
  "ui": {
    "agents": false,
    "cron": true,
    "messaging": false,
    "terminal": true,
    "webhooks": false
  }
}
"""


def test_internal_desktop_build_requires_valid_harness_config(tmp_path, monkeypatch):
    invalid = tmp_path / "invalid.json"
    invalid.write_text("{}", encoding="utf-8")
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(invalid))
    monkeypatch.delenv("HERMES_DESKTOP_INTERNAL", raising=False)

    assert valid_internal_harness_config(invalid) is False
    assert internal_desktop_build() is False

    valid = tmp_path / "internal.json"
    valid.write_text(VALID, encoding="utf-8")
    monkeypatch.setenv("HERMES_DESKTOP_HARNESS_CONFIG", str(valid))

    assert valid_internal_harness_config(valid) is True
    assert internal_desktop_build() is True


def test_internal_desktop_build_accepts_explicit_desktop_child_signal(monkeypatch):
    monkeypatch.delenv("HERMES_DESKTOP_HARNESS_CONFIG", raising=False)
    monkeypatch.setenv("HERMES_DESKTOP_INTERNAL", "1")

    assert internal_desktop_build() is True
