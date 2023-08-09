import {getState, info, setFailed} from '@actions/core'
import {TURBO_LOCAL_SERVER_PID, serverLogFile} from './settings'
import fs from 'fs-extra'

function pidIsRunning(pid: string): boolean {
  try {
    process.kill(+pid, 0)
    return true
  } catch (e) {
    return false
  }
}

function stopServer(): void {
  const serverPID = getState(TURBO_LOCAL_SERVER_PID)

  if (!serverPID) {
    info('No server pid was found in state.')
  }

  if (pidIsRunning(serverPID)) {
    info(`Killing server pid: ${serverPID}`)
    process.kill(+serverPID)
  } else {
    info(`Server with pid: ${serverPID} is not running.`)
  }

  info('Server log:')
  info(fs.readFileSync(serverLogFile, {encoding: 'utf8', flag: 'r'}))
}

try {
  stopServer()
} catch (error: unknown) {
  setFailed((error as Error).message)
}
