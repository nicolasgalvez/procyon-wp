import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const releaseWorkflow = path.join(__dirname, '..', '.github', 'workflows', 'release.yml')

describe('release workflow', () => {
  // If this guard is ever removed, the workflow runs on every fork's `main`
  // and tries to publish under @procyon-creative — fails (or worse, succeeds
  // unexpectedly if the fork has its own NPM_TOKEN).
  it('is gated to the procyon-creative org so forks skip cleanly', () => {
    const source = readFileSync(releaseWorkflow, 'utf8')
    expect(source).toMatch(/if:\s*github\.repository_owner\s*==\s*['"]procyon-creative['"]/)
  })
})
