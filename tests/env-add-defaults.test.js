import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const fs = require('fs')
const path = require('path')
const os = require('os')

const enquirer = require('enquirer')
let asked = []
let sourceChoice
let typed

// Answers each field prompt with `typed[field]` or else its pre-filled value,
// and the source prompt with `sourceChoice`.
Object.defineProperty(enquirer, 'prompt', {
  configurable: true,
  value: async (questions) => {
    const list = Array.isArray(questions) ? questions : [questions]
    asked.push(...list)
    return Object.fromEntries(list.map(q =>
      [q.name, q.name === 'source' ? sourceChoice : (typed[q.name] ?? q.initial)]
    ))
  }
})

const store = require('../src/config/store')
const env = require('../commands/env')

const LIVE = {
  host: 'live.example.com',
  user: 'deploy',
  port: 2222,
  path: '/var/www/live',
  domain: 'example.com',
  identityFile: '~/.ssh/live'
}
const DEV = {
  host: 'dev.example.com',
  user: 'devuser',
  port: 22,
  path: '/var/www/dev'
}

let tmpDir, origProcyonDir, origProjectsDir

function seedProject (environments) {
  store.saveProject('site', {
    name: 'site',
    projectPath: tmpDir,
    localPath: tmpDir,
    environments
  })
}

function addEnv (name, flags = {}) {
  return env.handler({ action: 'add', name, project: { name: 'site' }, ...flags })
}

function initialFor (field) {
  return asked.find(q => q.name === field).initial
}

describe('env add defaults', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'procyon-env-add-'))
    origProcyonDir = store.paths.procyonDir
    origProjectsDir = store.paths.projectsDir
    store.paths.procyonDir = path.join(tmpDir, '.procyon')
    store.paths.projectsDir = path.join(tmpDir, '.procyon', 'projects')
    asked = []
    sourceChoice = undefined
    typed = {}
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    store.paths.procyonDir = origProcyonDir
    store.paths.projectsDir = origProjectsDir
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('pre-fills every prompt from the only existing environment', async () => {
    seedProject({ live: LIVE })

    await addEnv('staging')

    expect(initialFor('host')).toBe(LIVE.host)
    expect(initialFor('user')).toBe(LIVE.user)
    expect(initialFor('port')).toBe(String(LIVE.port))
    expect(initialFor('path')).toBe(LIVE.path)
    expect(initialFor('domain')).toBe(LIVE.domain)
    expect(initialFor('identityFile')).toBe(LIVE.identityFile)
    expect(asked.some(q => q.name === 'source')).toBe(false)
  })

  it('saves the copied values as a new environment without changing the source', async () => {
    seedProject({ live: LIVE })

    await addEnv('staging')

    const project = store.getProject('site')
    expect(project.environments.staging).toEqual(LIVE)
    expect(project.environments.live).toEqual(LIVE)
  })

  it('asks which environment to copy when there are several', async () => {
    seedProject({ live: LIVE, dev: DEV })
    sourceChoice = 'dev'

    await addEnv('staging')

    const source = asked.find(q => q.name === 'source')
    expect(source.choices).toEqual(['live', 'dev'])
    expect(initialFor('host')).toBe(DEV.host)
    expect(initialFor('user')).toBe(DEV.user)
  })

  it('prompts with blank fields and port 22 when there are no environments', async () => {
    seedProject({})
    typed = { host: 'live.example.com', user: 'deploy', path: '/var/www/live' }

    await addEnv('live')

    expect(initialFor('host')).toBe('')
    expect(initialFor('user')).toBe('')
    expect(initialFor('port')).toBe('22')
    expect(initialFor('path')).toBe('')
    expect(asked.some(q => q.name === 'source')).toBe(false)
  })

  it('lets flag values override copied values', async () => {
    seedProject({ live: LIVE })

    await addEnv('staging', { host: 'staging.example.com' })

    expect(initialFor('host')).toBe('staging.example.com')
    expect(initialFor('user')).toBe(LIVE.user)
  })

  it('does not prompt when host, user, and path are all given as flags', async () => {
    seedProject({ live: LIVE, dev: DEV })

    await addEnv('staging', { host: 'staging.example.com', user: 'stage', path: '/srv/staging' })

    expect(asked).toEqual([])
    expect(store.getProject('site').environments.staging).toEqual({
      host: 'staging.example.com',
      user: 'stage',
      path: '/srv/staging',
      port: 22
    })
  })
})
