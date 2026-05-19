import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const indexPath = path.join(__dirname, '..', 'index.js')

describe('CLI entry point', () => {
  // yargs 17's `./yargs` subpath resolves to an extensionless file under a
  // package with `"type": "module"`. Node 26 parses that as ESM and the
  // file's inline `require()` throws. Use the package main (`./index.cjs`) instead.
  it('does not import the extensionless yargs/yargs subpath', () => {
    const source = readFileSync(indexPath, 'utf8')
    expect(source).not.toMatch(/require\(['"]yargs\/yargs['"]\)/)
  })
})
