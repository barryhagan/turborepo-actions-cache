import * as core from '@actions/core'
import {spawn} from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import waitOn from 'wait-on'
import {
  TURBO_LOCAL_SERVER_PID,
  cacheDir,
  cacheItemPrefix,
  serverLogFile,
  serverPort,
  turboToken
} from './settings'

function exportVariable(name: string, value: string): void {
  core.exportVariable(name, value)
  core.info(`  ${name}=${value}`)
}

async function run(): Promise<void> {
  core.debug(`Using cache location ${cacheDir} and prefix ${cacheItemPrefix}`)

  fs.ensureDirSync(cacheDir)

  const out = fs.openSync(serverLogFile, 'a')
  const err = fs.openSync(serverLogFile, 'a')

  exportVariable('TURBO_API', `http://localhost:${serverPort}`)
  exportVariable('TURBO_TOKEN', turboToken)
  exportVariable('TURBO_TEAM', 'turborepo-actions-cache')

  const serverProcess = spawn(
    'node',
    [path.resolve(__dirname, '../server/index.js')],
    {
      detached: true,
      stdio: ['ignore', out, err],
      env: process.env
    }
  )

  serverProcess.unref()

  core.info(`${TURBO_LOCAL_SERVER_PID}: ${serverProcess.pid}`)
  core.saveState(TURBO_LOCAL_SERVER_PID, serverProcess.pid)

  await waitOn({
    resources: [`http-get://localhost:${serverPort}`],
    timeout: 10000
  })
  core.info('Turbo cache server is up and running.')
}

// eslint-disable-next-line github/no-then
run().catch(error => {
  if (error instanceof Error) {
    core.setFailed(error.message)
  }
})
