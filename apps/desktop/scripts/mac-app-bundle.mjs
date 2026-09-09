import fs from 'node:fs'
import path from 'node:path'

export function newestValidMacAppPath(candidates, fallback) {
  let selected = null
  let selectedMtime = -Infinity
  let selectedPriority = -1

  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate.requiredFile, fs.constants.X_OK)
    } catch {
      continue
    }

    const mtime = fs.statSync(candidate.appPath).mtimeMs
    const priority = path.basename(candidate.appPath) === 'Lemon AI.app' ? 1 : 0
    if (selected === null || mtime > selectedMtime || (mtime === selectedMtime && priority > selectedPriority)) {
      selected = candidate.appPath
      selectedMtime = mtime
      selectedPriority = priority
    }
  }

  return selected ?? fallback
}
