import {setFailed} from '@actions/core'
import * as console from 'console'
import express, {NextFunction, Request, RequestHandler, Response} from 'express'
import fs from 'fs-extra'
import path from 'path'
import {cacheDir, serverPort} from './settings'
import {restoreCache, saveCache} from '@actions/cache'
import {pipeline} from 'stream/promises'

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>

const handleAsync = (handler: AsyncRequestHandler): RequestHandler => {
  return async (req, res, next) => {
    // eslint-disable-next-line github/no-then
    return handler(req, res, next).catch(next)
  }
}

async function startServer(): Promise<void> {
  fs.ensureDirSync(cacheDir)

  const app = express()

  app.get('/', (req, res) => {
    res.status(200).send()
  })

  app.post('/v8/artifacts/events', (req, res) => {
    res.status(200).send()
  })

  app.all('*', (req, res, next) => {
    console.info(`Received a ${req.method} request`, req.path)
    const {authorization = ''} = req.headers
    const [type = '', token = ''] = authorization.split(' ')

    if (type !== 'Bearer' || token !== process.env.TURBO_TOKEN) {
      return res.status(401).send('unauthorized')
    }

    next()
  })

  app.get(
    '/v8/artifacts/:artifactId',
    handleAsync(async (req, res) => {
      const {artifactId} = req.params
      const filePath = path.join(cacheDir, `${artifactId}.gz`)

      if (fs.pathExistsSync(filePath)) {
        console.log(`Artifact ${artifactId} found locally.`)
      } else {
        console.log(`Artifact ${artifactId} not found locally, checking cache.`)
        try {
          const cacheId = await restoreCache([filePath], artifactId)
          if (!cacheId) {
            return res.status(404).send('Not found')
          }
        } catch (error) {
          console.error(error)
          res.status(500).send('ERROR')
        }
      }

      try {
        const readStream = fs.createReadStream(filePath)
        await pipeline(readStream, res)
      } catch (error) {
        console.error(error)
        res.end(error)
      }
    })
  )

  app.put(
    '/v8/artifacts/:artifactId',
    handleAsync(async (req, res) => {
      const artifactId = req.params.artifactId
      const filePath = path.join(cacheDir, `${artifactId}.gz`)

      const writeStream = fs.createWriteStream(filePath)

      try {
        await pipeline(req, writeStream)
        await saveCache([filePath], artifactId)
        return res.send('OK')
      } catch (error) {
        console.error(error)
        return res.status(500).send('ERROR')
      }
    })
  )

  app.disable('etag').listen(serverPort, () => {
    console.log(`Cache dir: ${cacheDir}`)
    console.log(
      `Local Turbo server is listening at http://127.0.0.1:${serverPort}`
    )
  })
}

// eslint-disable-next-line github/no-then
startServer().catch(error => {
  setFailed(error)
})
