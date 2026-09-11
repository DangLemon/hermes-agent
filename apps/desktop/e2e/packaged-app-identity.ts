import fs from 'node:fs'
import path from 'node:path'

export type PackagedAppProductName = 'Hermes' | 'Lemon AI'

interface PackagedAppIdentity {
  binaryPath: string
  productName: PackagedAppProductName
}

interface ResolvePackagedAppIdentityOptions {
  arch?: string
  exists?: (candidate: string) => boolean
  platform?: NodeJS.Platform
  releaseRoot: string
}

export function resolvePackagedAppIdentity({
  arch = process.arch,
  exists = candidate => {
    try {
      fs.accessSync(candidate, fs.constants.X_OK)

      return true
    } catch {
      return false
    }
  },
  platform = process.platform,
  releaseRoot
}: ResolvePackagedAppIdentityOptions): PackagedAppIdentity {
  const identities: Array<{ linuxExecutable: string; productName: PackagedAppProductName }> = [
    { linuxExecutable: 'Lemon AI', productName: 'Lemon AI' },
    { linuxExecutable: 'hermes', productName: 'Hermes' }
  ]

  const candidates: PackagedAppIdentity[] = []

  if (platform === 'darwin') {
    const normalizedArch = arch === 'arm64' ? 'arm64' : 'x64'

    for (const identity of identities) {
      for (const directory of [`mac-${normalizedArch}`, 'mac']) {
        candidates.push({
          binaryPath: path.join(
            releaseRoot,
            directory,
            `${identity.productName}.app`,
            'Contents',
            'MacOS',
            identity.productName
          ),
          productName: identity.productName
        })
      }
    }
  } else if (platform === 'win32') {
    for (const identity of identities) {
      for (const directory of ['win-unpacked', 'win-arm64-unpacked']) {
        candidates.push({
          binaryPath: path.join(releaseRoot, directory, `${identity.productName}.exe`),
          productName: identity.productName
        })
      }
    }
  } else {
    for (const identity of identities) {
      candidates.push({
        binaryPath: path.join(releaseRoot, 'linux-unpacked', identity.linuxExecutable),
        productName: identity.productName
      })
    }
  }

  return candidates.find(candidate => exists(candidate.binaryPath)) ?? candidates[0]
}
