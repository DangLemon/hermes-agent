# Residual Desktop Display Copy

## Scope

- Worktree: `/Users/dang/Documents/ChatGPT/lemon-hermes/hermes-agent`
- Branch: `codex/lemon-update-repository`
- Scope: residual desktop display-copy branding outside stream/update/installer-owned surfaces.

## Changes

- Routed renderer gateway/project fallback errors through display-brand rewriting.
- Threaded the active desktop app name into Electron secure-storage guidance, connection-registry generated cloud labels, POSIX SSH lifecycle errors, Windows SSH lifecycle errors, and the main-process call sites that own runtime identity.
- Preserved technical contracts: `hermes` CLI names, `HERMES_*` env vars, IPC names, remote probes, `~/.hermes` compatibility paths, and existing user-supplied connection labels.

## Validation

- `git diff --check -- <scoped files>` passed.
- `npx vitest run --project ui src/lib/error-surface.test.ts src/lib/app-brand.test.ts src/store/projects.test.ts src/store/gateway-profile-request.test.ts` passed: 89 tests.
- `npx vitest run --project electron electron/hardening.test.ts electron/connection-registry.test.ts electron/remote-lifecycle.test.ts electron/windows-remote-lifecycle.test.ts electron/native-oauth-login.test.ts electron/mcp-oauth-callback-ipc.test.ts` passed: 269 tests.
- `npx vitest run --project electron electron/remote-lifecycle.test.ts electron/windows-remote-lifecycle.test.ts electron/connection-registry.test.ts electron/hardening.test.ts` passed after the final POSIX home-probe edit: 253 tests.
- `npm run typecheck` passed.

## Unresolved

- None.
