#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import process from 'node:process'

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
    icon: [
      'icons/lemon-32x32.png',
      'icons/lemon-128x128.png',
      'icons/lemon-128x128@2x.png',
      'icons/lemon-icon.icns',
      'icons/lemon-icon.ico'
    ]
  }
}

function internalDesktopBuild(env = process.env) {
  if (String(env.HERMES_DESKTOP_INTERNAL || '').trim() === '1') return true
  try {
    return Boolean(loadHarnessConfigInput(env))
  } catch {
    return false
  }
}

function withIdentityConfig(args) {
  if (!internalDesktopBuild()) return { args, env: process.env }
  const config = JSON.stringify(LEMON_TAURI_CONFIG)
  const env = { ...process.env, HERMES_INSTALLER_BRAND: 'lemon' }
  if (args[0] === 'build' || args[0] === 'dev') {
    return { args: [args[0], '--config', config, ...args.slice(1)], env }
  }
  return { args: [...args, '--config', config], env }
}

const { args, env } = withIdentityConfig(process.argv.slice(2))
const bin = process.platform === 'win32' ? 'tauri.cmd' : 'tauri'
const result = spawnSync(bin, args, { env, stdio: 'inherit', shell: false })

if (result.error) {
  console.error(`[tauri-with-identity] failed to launch ${bin}: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
