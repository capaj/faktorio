import { spawn } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

const platformPackages: Record<string, string> = {
  'linux:x64': '@sqld/linux-x64',
  'linux:arm64': '@sqld/linux-arm64',
  'darwin:x64': '@sqld/darwin-x64',
  'darwin:arm64': '@sqld/darwin-arm64'
}

const key = `${process.platform}:${process.arch}`
const pkg = platformPackages[key]
if (!pkg) {
  throw new Error(`Unsupported platform/arch for sqld: ${key}`)
}

const pkgJsonPath = require.resolve(`${pkg}/package.json`)
const binPath = resolve(dirname(pkgJsonPath), 'sqld')

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../..')
const dataPath = resolve(repoRoot, 'e2e-data')
const httpAddr = process.env.SQLD_HTTP_LISTEN_ADDR ?? '127.0.0.1:8080'

if (existsSync(dataPath)) {
  rmSync(dataPath, { recursive: true, force: true })
}

const child = spawn(
  binPath,
  ['--db-path', dataPath, '--http-listen-addr', httpAddr],
  { stdio: 'inherit' }
)

const forward = (signal: NodeJS.Signals) => {
  child.kill(signal)
}

process.on('SIGINT', () => forward('SIGINT'))
process.on('SIGTERM', () => forward('SIGTERM'))

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
