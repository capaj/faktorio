import cp from 'child_process'
import fs from 'fs'

export function getGitHash() {
  let gitSha: string | undefined
  try {
    gitSha = fs.readFileSync('git-commit-hash', 'utf8').trim() // on deployed docker image
  } catch (err) {}

  if (gitSha) {
    return gitSha.substring(0, 8) // we cut to 8 chars because we don't care about hash collisions and whatnot
  }

  try {
    gitSha = cp.execSync('git rev-parse HEAD').toString().trim() // on local dev machine
  } catch (err) {}

  if (!gitSha) {
    console.warn('Could not get git commit hash') // TODO this happens on lambdas for now. Ideally we should copy git-commit-hash file inside the lambda package
  }

  return gitSha?.substring(0, 8) ?? 'UNKNOWN' // fallback to unknown when we can't get the git hash from either git or the file
}
