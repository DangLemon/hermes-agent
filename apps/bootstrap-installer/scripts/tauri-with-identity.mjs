#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { loadHarnessConfigInput } from '../../desktop/scripts/internal-desktop-harness.mjs'

const LEMON_TAURI_CONFIG = {
  productName: 'Lemon AI Setup',
  identifier: 'com.lemondigital.lemonai.setup',
  mainBinaryName: 'Lemon AI Setup',
  app: {
    windows: [
      {
        label: 'main',
        title: 'Lemon AI Setup'
      }
    ]
  },
  bundle: {
    shortDescription: 'Lemon AI Setup',
    longDescription: 'Installs Lemon AI on your machine. Drives scripts/install.ps1 (Windows) and scripts/install.sh (macOS/Linux).',
    publisher: 'Lemon Digital',
    copyright: 'Copyright © 2026 Lemon Digital',
    macOS: {
      infoPlist: 'Info.lemon.plist',
      signingIdentity: '-'
    },
    icon: [
      'icons/lemon-32x32.png',
      'icons/lemon-128x128.png',
      'icons/lemon-128x128@2x.png',
      'icons/lemon-icon.icns',
      'icons/lemon-icon.ico'
    ]
  }
}

export function internalDesktopBuild(env = process.env, loadConfig = loadHarnessConfigInput) {
  if (String(env.HERMES_DESKTOP_INTERNAL || '').trim() === '1') return true
  try {
    return Boolean(loadConfig(env))
  } catch {
    return false
  }
}

export function withIdentityConfig(args, envInput = process.env, loadConfig = loadHarnessConfigInput) {
  if (!internalDesktopBuild(envInput, loadConfig)) return { args, env: envInput }
  const config = JSON.stringify(LEMON_TAURI_CONFIG)
  const env = { ...envInput, HERMES_INSTALLER_BRAND: 'lemon' }
  if (args[0] === 'build' || args[0] === 'dev') {
    return { args: [args[0], '--config', config, ...args.slice(1)], env }
  }
  return { args: [...args, '--config', config], env }
}

export function isDirectRun(metaUrl, argv1 = process.argv[1], {
  resolve = path.resolve,
  pathToFileURLHref = value => pathToFileURL(value).href
} = {}) {
  return Boolean(argv1) && metaUrl === pathToFileURLHref(resolve(argv1))
}

export function main() {
  const { args, env } = withIdentityConfig(process.argv.slice(2))
  const bin = process.platform === 'win32' ? 'tauri.cmd' : 'tauri'
  const result = spawnSync(bin, args, { env, stdio: 'inherit', shell: false })

  if (result.error) {
    console.error(`[tauri-with-identity] failed to launch ${bin}: ${result.error.message}`)
    process.exit(1)
  }

  process.exit(result.status ?? 1)
}

if (isDirectRun(import.meta.url)) {
  main()
}
