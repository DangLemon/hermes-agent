"""Installer source-repository behavior for internal Desktop builds."""

from __future__ import annotations

import os
import shutil
import stat
import subprocess
import textwrap
import zipfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
INSTALL_SH = REPO_ROOT / "scripts" / "install.sh"
INSTALL_PS1 = REPO_ROOT / "scripts" / "install.ps1"
REAL_GIT = shutil.which("git")


def run(cmd: list[str], *, cwd: Path | None = None, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, cwd=cwd, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=True)


def git(cmd: list[str], *, cwd: Path, env: dict[str, str] | None = None) -> str:
    return run([REAL_GIT or "git", *cmd], cwd=cwd, env=env).stdout.strip()


def origin_url(cwd: Path) -> str:
    return git(["config", "--get", "remote.origin.url"], cwd=cwd)


def create_remote(tmp_path: Path, repository: str, *, marker: str, tag: str | None = None) -> tuple[Path, str]:
    work = tmp_path / "work" / repository.replace("/", "__")
    bare = tmp_path / "remotes" / f"{repository}.git"
    work.mkdir(parents=True)
    bare.parent.mkdir(parents=True)

    git(["init", "-b", "main"], cwd=work)
    git(["config", "user.email", "installer-test@example.com"], cwd=work)
    git(["config", "user.name", "Installer Test"], cwd=work)
    (work / "README.md").write_text(f"{marker}\n", encoding="utf-8")
    git(["add", "README.md"], cwd=work)
    git(["commit", "-m", "initial"], cwd=work)
    if tag:
        git(["tag", tag], cwd=work)
    commit = git(["rev-parse", "HEAD"], cwd=work)
    run([REAL_GIT or "git", "clone", "--bare", str(work), str(bare)])
    return bare, commit


def write_gitconfig(tmp_path: Path, remotes: dict[str, Path]) -> Path:
    config = tmp_path / "gitconfig"
    lines: list[str] = []
    for repository, bare in remotes.items():
        lines.extend(
            [
                f'[url "file://{bare}"]',
                f"    insteadOf = https://github.com/{repository}.git",
                f"    insteadOf = git@github.com:{repository}.git",
            ]
        )
    config.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return config


def installer_env(tmp_path: Path, gitconfig: Path, *, extra_path: Path | None = None) -> dict[str, str]:
    env = os.environ.copy()
    env.update(
        {
            "GIT_CONFIG_GLOBAL": str(gitconfig),
            "HOME": str(tmp_path / "home"),
            "HERMES_HOME": str(tmp_path / "hermes-home"),
        }
    )
    if extra_path:
        env["PATH"] = f"{extra_path}{os.pathsep}{env['PATH']}"
    return env


def run_repository_stage(
    tmp_path: Path,
    *,
    gitconfig: Path,
    install_dir: Path,
    repository: str | None = None,
    commit: str | None = None,
    tag: str | None = None,
    extra_path: Path | None = None,
    extra_env: dict[str, str] | None = None,
    check: bool = False,
) -> subprocess.CompletedProcess[str]:
    cmd = [
        "bash",
        str(INSTALL_SH),
        "--stage",
        "repository",
        "--non-interactive",
        "--json",
        "--dir",
        str(install_dir),
        "--hermes-home",
        str(tmp_path / "hermes-home"),
    ]
    if repository:
        cmd.extend(["--repo", repository])
    if commit:
        cmd.extend(["--commit", commit])
    if tag:
        cmd.extend(["--tag", tag])

    env = installer_env(tmp_path, gitconfig, extra_path=extra_path)
    env.update(extra_env or {})
    result = subprocess.run(
        cmd,
        cwd=tmp_path,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if check and result.returncode != 0:
        raise AssertionError(result.stdout)
    return result


def test_install_sh_fresh_clone_defaults_to_upstream_without_network(tmp_path: Path) -> None:
    upstream, _ = create_remote(tmp_path, "NousResearch/hermes-agent", marker="upstream")
    gitconfig = write_gitconfig(tmp_path, {"NousResearch/hermes-agent": upstream})
    install_dir = tmp_path / "install"

    result = run_repository_stage(tmp_path, gitconfig=gitconfig, install_dir=install_dir, check=True)

    assert '"ok":true' in result.stdout.replace(" ", "")
    assert (install_dir / "README.md").read_text(encoding="utf-8") == "upstream\n"
    assert origin_url(install_dir) == "https://github.com/NousResearch/hermes-agent.git"


def test_install_sh_internal_fresh_clone_defaults_to_lemon_repository(tmp_path: Path) -> None:
    internal, _ = create_remote(tmp_path, "DangLemon/hermes-agent", marker="internal")
    gitconfig = write_gitconfig(tmp_path, {"DangLemon/hermes-agent": internal})
    install_dir = tmp_path / "install"

    result = run_repository_stage(
        tmp_path,
        gitconfig=gitconfig,
        install_dir=install_dir,
        extra_env={"HERMES_DESKTOP_INTERNAL": "1"},
        check=True,
    )

    assert '"ok":true' in result.stdout.replace(" ", "")
    assert (install_dir / "README.md").read_text(encoding="utf-8") == "internal\n"
    assert origin_url(install_dir) == "https://github.com/DangLemon/hermes-agent.git"


def test_install_sh_internal_help_reports_only_lemon_default_paths(tmp_path: Path) -> None:
    env = os.environ.copy()
    env.update({"HOME": str(tmp_path / "home"), "HERMES_DESKTOP_INTERNAL": "1"})

    result = subprocess.run(
        ["bash", str(INSTALL_SH), "--help"],
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=True,
    )

    assert f"default (non-root):  {tmp_path / 'home' / '.lemon-ai' / 'lemon-agent'}" in result.stdout
    assert "default: DangLemon/hermes-agent" in result.stdout
    assert ".hermes/hermes-agent" not in result.stdout


def test_install_sh_rejects_traversal_runtime_dir_name(tmp_path: Path) -> None:
    env = os.environ.copy()
    env.update({"HOME": str(tmp_path / "home"), "HERMES_INSTALL_RUNTIME_DIR_NAME": "../hermes-agent"})

    result = subprocess.run(
        ["bash", str(INSTALL_SH), "--help"],
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )

    assert result.returncode != 0
    assert "must be a safe directory name" in result.stdout


def test_install_sh_custom_repo_clone_and_existing_update_use_selected_repo(tmp_path: Path) -> None:
    internal, _ = create_remote(tmp_path, "DangLemon/hermes-agent", marker="internal")
    gitconfig = write_gitconfig(tmp_path, {"DangLemon/hermes-agent": internal})
    install_dir = tmp_path / "install"

    first = run_repository_stage(
        tmp_path,
        gitconfig=gitconfig,
        install_dir=install_dir,
        repository="DangLemon/hermes-agent",
        check=True,
    )
    second = run_repository_stage(
        tmp_path,
        gitconfig=gitconfig,
        install_dir=install_dir,
        repository="DangLemon/hermes-agent",
        check=True,
    )

    assert '"ok":true' in first.stdout.replace(" ", "")
    assert '"ok":true' in second.stdout.replace(" ", "")
    assert (install_dir / "README.md").read_text(encoding="utf-8") == "internal\n"
    assert origin_url(install_dir) == "https://github.com/DangLemon/hermes-agent.git"


def test_install_sh_existing_checkout_mismatched_origin_fails_before_update_and_keeps_dirty_edits(tmp_path: Path) -> None:
    other, _ = create_remote(tmp_path, "OtherOrg/hermes-agent", marker="other")
    internal, _ = create_remote(tmp_path, "DangLemon/hermes-agent", marker="internal")
    gitconfig = write_gitconfig(tmp_path, {"OtherOrg/hermes-agent": other, "DangLemon/hermes-agent": internal})
    install_dir = tmp_path / "install"
    env = installer_env(tmp_path, gitconfig)
    run(
        [REAL_GIT or "git", "clone", "https://github.com/OtherOrg/hermes-agent.git", str(install_dir)],
        cwd=tmp_path,
        env=env,
    )
    (install_dir / "local-note.txt").write_text("keep me\n", encoding="utf-8")

    result = run_repository_stage(
        tmp_path,
        gitconfig=gitconfig,
        install_dir=install_dir,
        repository="DangLemon/hermes-agent",
    )

    assert result.returncode != 0
    assert "does not match selected --repo DangLemon/hermes-agent" in result.stdout
    assert (install_dir / "local-note.txt").read_text(encoding="utf-8") == "keep me\n"
    assert origin_url(install_dir) == "https://github.com/OtherOrg/hermes-agent.git"


def write_fake_clone_fail_tools(tmp_path: Path, archive_zip: Path) -> Path:
    bin_dir = tmp_path / "fake-bin"
    bin_dir.mkdir()
    git_wrapper = bin_dir / "git"
    git_wrapper.write_text(
        textwrap.dedent(
            f"""
            #!/bin/sh
            printf '%s\n' "$*" >> "{tmp_path / 'git.log'}"
            if [ "$1" = "clone" ]; then
                exit 42
            fi
            exec "{REAL_GIT}" "$@"
            """
        ).lstrip(),
        encoding="utf-8",
    )
    curl_wrapper = bin_dir / "curl"
    curl_wrapper.write_text(
        textwrap.dedent(
            f"""
            #!/bin/sh
            printf '%s\n' "$*" >> "{tmp_path / 'curl.log'}"
            out=""
            while [ "$#" -gt 0 ]; do
                if [ "$1" = "-o" ]; then
                    shift
                    out="$1"
                fi
                shift || true
            done
            if [ -z "$out" ]; then
                exit 2
            fi
            cp "{archive_zip}" "$out"
            """
        ).lstrip(),
        encoding="utf-8",
    )
    sleep_wrapper = bin_dir / "sleep"
    sleep_wrapper.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
    for executable in (git_wrapper, curl_wrapper, sleep_wrapper):
        executable.chmod(executable.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    return bin_dir


def make_archive_zip(tmp_path: Path, *, prefix: str = "hermes-agent-main") -> Path:
    archive = tmp_path / "archive.zip"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr(f"{prefix}/README.md", "archive fallback\n")
    return archive


def test_install_sh_archive_fallback_uses_validated_repo_and_commit_precedence(tmp_path: Path) -> None:
    internal, commit = create_remote(tmp_path, "DangLemon/hermes-agent", marker="internal", tag="v1.0.0")
    gitconfig = write_gitconfig(tmp_path, {"DangLemon/hermes-agent": internal})
    archive_zip = make_archive_zip(tmp_path)
    fake_bin = write_fake_clone_fail_tools(tmp_path, archive_zip)
    install_dir = tmp_path / "install"

    result = run_repository_stage(
        tmp_path,
        gitconfig=gitconfig,
        install_dir=install_dir,
        repository="DangLemon/hermes-agent",
        commit=commit,
        tag="v1.0.0",
        extra_path=fake_bin,
        check=True,
    )

    assert '"ok":true' in result.stdout.replace(" ", "")
    assert "https://github.com/DangLemon/hermes-agent/archive/" + commit + ".zip" in (tmp_path / "curl.log").read_text(encoding="utf-8")
    assert git(["rev-parse", "HEAD"], cwd=install_dir) == commit
    assert origin_url(install_dir) == "https://github.com/DangLemon/hermes-agent.git"


def test_install_sh_rejects_invalid_repo_identity_before_network(tmp_path: Path) -> None:
    gitconfig = write_gitconfig(tmp_path, {})

    result = run_repository_stage(
        tmp_path,
        gitconfig=gitconfig,
        install_dir=tmp_path / "install",
        repository="https://github.com/DangLemon/hermes-agent",
    )

    assert result.returncode != 0
    assert "--repo expects a GitHub owner/repo identity" in result.stdout


def test_install_ps1_source_repository_contracts_are_bounded_and_repo_aware() -> None:
    source = INSTALL_PS1.read_text(encoding="utf-8")

    assert '[string]$Repository = ""' in source
    assert 'elseif ($env:HERMES_INSTALL_REPOSITORY)' in source
    assert 'elseif ($InternalDesktopBuild)' in source
    assert '"DangLemon/hermes-agent"' in source
    assert '"NousResearch/hermes-agent"' in source
    assert 'function Test-RepositoryIdentity' in source
    assert 'function Test-SafeFileName' in source
    assert 'HERMES_INSTALL_RUNTIME_DIR_NAME must be a safe directory name' in source
    assert 'HERMES_BOOTSTRAP_MARKER_NAME must be a safe file name' in source
    assert 'function Get-GitHubRepositoryIdentity' in source
    assert 'function Ensure-ManagedOrigin' in source
    assert 'does not match selected -Repository' in source
    assert 'git@github.com:$Repository.git' in source
    assert 'https://github.com/$Repository.git' in source
    assert 'https://github.com/$Repository/archive/$Commit.zip' in source
    assert 'https://github.com/$Repository/archive/refs/tags/$Tag.zip' in source
    assert 'https://github.com/$Repository/archive/refs/heads/$Branch.zip' in source
    assert '$Value -match "^(https?:|git@)"' in source
    assert '$Value -like "*.git"' in source
