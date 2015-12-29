'use strict'

import { find as pkFind } from 'pkginfo'
import { isString, trim, isNull } from 'lodash'
import { execSync } from 'child_process'
import { hostname } from 'os'
import { dirname as dir, basename as base } from 'path'

export function projectVersion() {
  try {
    let version = require(pkFind(module)).version
    if (isString(version) && (trim(version).length > 0)) {
      return trim(version)
    } else {
      throw new Error('empty projectVersion')
    }
  } catch (_err) {
    return 'unknown version'
  }
}

export function projectHost() {
  try {
    let params = { encoding: 'utf8', timeout: 1e3 }
    let cmd = 'hostname -f'
    return execSync(cmd, params).replace(/[\n|\r]/g, '')
  } catch (_err) {
    return hostname()
  }
}

export function projectName() {
  try {
    let name = require(pkFind(module)).name
    if (isString(name) && (trim(name).length > 0)) {
      return trim(name)
    } else {
      throw new Error('empty projectName')
    }
  } catch (_err) {
    return projectDir()
  }
}

export function projectDir() {
  try {
    let cwd = process.cwd()
    return (function _(module) {
      return isNull(module.parent)
        ? `${base(cwd)}${dir(module.filename).replace(cwd, '')}`
        : _(module.parent)
    })(module)
  } catch (err) {
    return `[REPL on ${projectHost()}]`
  }
}
