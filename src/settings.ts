import {getInput} from '@actions/core'
import crypto from 'crypto'
import path from 'path'
import os from 'os'

export const TURBO_LOCAL_SERVER_PID = 'TURBO_LOCAL_SERVER_PID'

export const turboToken = crypto.randomUUID()

export const serverPort = Number(getInput('port') || '9081')

export const cacheItemPrefix: string = getInput('cache-prefix') || 'turborepo_'

export const cacheDir = path.join(
  process.env.RUNNER_TEMP || os.tmpdir(),
  'turborepo_cache'
)
