import assert from 'node:assert/strict'
import fs from 'node:fs'

const readJson = file => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), 'utf8'))
const readText = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8')
const hermes = readJson('../src-tauri/tauri.conf.json')
const lemon = readJson('../src-tauri/tauri.lemon.conf.json')
assert.equal(hermes.productName, 'Hermes')
assert.equal(hermes.identifier, 'com.nousresearch.hermes.setup')
assert.equal(lemon.productName, 'Lemon AI Setup')
assert.equal(lemon.identifier, 'com.lemondigital.lemonai.setup')
assert.equal(lemon.mainBinaryName, 'Lemon AI Setup')
assert.equal(lemon.app.windows[0].title, 'Lemon AI Setup')
assert.equal(lemon.bundle.publisher, 'Lemon Digital')
assert.deepEqual(lemon.bundle.icon, [
  'icons/lemon-32x32.png',
  'icons/lemon-128x128.png',
  'icons/lemon-128x128@2x.png',
  'icons/lemon-icon.icns',
  'icons/lemon-icon.ico'
])
const hermesManifest = readText('../src-tauri/hermes-setup.manifest')
const lemonManifest = readText('../src-tauri/lemon-ai-setup.manifest')
assert.match(hermesManifest, /NousResearch\.Hermes\.Setup/)
assert.match(lemonManifest, /LemonDigital\.LemonAI\.Setup/)
assert.match(lemonManifest, /<description>Lemon AI Setup<\/description>/)
const buildScript = readText('../src-tauri/build.rs')
assert.match(buildScript, /HERMES_INSTALLER_BRAND/)
assert.match(buildScript, /lemon-ai-setup\.manifest/)
console.log('bootstrap installer branding profiles: ok')
