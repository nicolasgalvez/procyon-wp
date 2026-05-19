import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workflowsDir = path.join(__dirname, '..', '.github', 'workflows')

const workflowFiles = readdirSync(workflowsDir).filter(
  (f) => f.endsWith('.yml') || f.endsWith('.yaml')
)

// Policy: any workflow triggered by `pull_request_target` must stay
// metadata-only. It runs in the base-branch context with secrets exposed
// even when the PR head is a fork, so executing PR-supplied code there is
// the classic GitHub Actions privilege-escalation bug. We enforce two
// signals of "executing fork code" — checkout of any ref, and reference
// to the PR head SHA/ref (which is only useful if you're about to act on it).
//
// If you need to run fork-supplied code (lint, test, build), use
// `pull_request` instead — GitHub strips secrets from that trigger when
// the head is a fork, which is exactly what we want.

const FORK_HEAD_REFS = [
  /github\.event\.pull_request\.head\b/,
  /github\.head_ref\b/,
]

const usesPullRequestTarget = (source) => /^\s*pull_request_target\s*:/m.test(source)
const referencesCheckout = (source) => /uses:\s*actions\/checkout(?:@|\s|$)/m.test(source)
const referencesForkHead = (source) => FORK_HEAD_REFS.some((re) => re.test(source))

describe('workflow-policy: pull_request_target jobs must be metadata-only', () => {
  for (const file of workflowFiles) {
    const source = readFileSync(path.join(workflowsDir, file), 'utf8')
    if (!usesPullRequestTarget(source)) continue

    describe(file, () => {
      it('does not use actions/checkout (would let fork-supplied code execute with secrets)', () => {
        expect(referencesCheckout(source)).toBe(false)
      })

      it('does not reference the PR head SHA/ref (those only matter if you intend to act on fork content)', () => {
        for (const re of FORK_HEAD_REFS) {
          expect(source, `matched ${re}`).not.toMatch(re)
        }
      })
    })
  }
})

describe('workflow-policy: jira workflow', () => {
  const source = readFileSync(path.join(workflowsDir, 'jira.yml'), 'utf8')

  // Positive assertion so a future "simplify" PR doesn't silently revert to
  // pull_request and break QA/Done transitions for every fork-based PR.
  it('uses pull_request_target so fork PRs receive JIRA_* secrets', () => {
    expect(usesPullRequestTarget(source)).toBe(true)
  })

  it('does not subscribe to pull_request (would duplicate runs and waste cycles)', () => {
    expect(source).not.toMatch(/^\s*pull_request\s*:/m)
  })
})
