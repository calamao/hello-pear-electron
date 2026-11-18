import PearRuntime = require('pear-runtime')
import Hyperswarm = require('hyperswarm')
import Corestore = require('corestore')
import goodbye = require('graceful-goodbye')
import FramedStream = require('framed-stream')
import path = require('bare-path')
import dir = require('bare-storage')
import { isBareKit } from 'which-runtime'
import { helloWorld as helloPearWorker } from '@hello-pear/worker-hello-pear'
import { helloWorld as helloWorldWorker } from '@hello-pear/worker-hello-world'

type FrameData = { toString(): string }

const argv = (index: number) => Bare.argv[index + (isBareKit ? 0 : 2)]

const updaterConfig = {
  updates: argv(0) !== 'false',
  version: argv(1),
  upgrade: argv(2),
  name: argv(3),
  dir: argv(4) || dir.persistent(),
  app: argv(5)
}

const pipe = new FramedStream(Bare.IPC)
const store = new Corestore(path.join(updaterConfig.dir, 'pear-runtime', 'corestore'))
const swarm = new Hyperswarm()
const pear = new PearRuntime({ ...updaterConfig, swarm, store })

pear.updater.on('error', (err) => pipe.write('updater-error ' + err.message))

if (updaterConfig.updates !== false) {
  swarm.on('connection', (connection) => store.replicate(connection))
  swarm.join(pear.updater.drive.core.discoveryKey, {
    client: true,
    server: false
  })
}

pear.updater.on('update-scheduled', (delay) => pipe.write('update-scheduled ' + delay))
pear.updater.on('updating', () => pipe.write('updating'))
pear.updater.on('updated', () => pipe.write('updated'))
pear.on('minver-required', () => pipe.write('minver-required'))

goodbye(async () => {
  await swarm.destroy()
  await pear.close()
  await store.close()
})

function isPing(message: unknown): message is { type: 'ping' } {
  return (
    typeof message === 'object' && message !== null && 'type' in message && message.type === 'ping'
  )
}

pipe.on('data', async (data: FrameData) => {
  const message = data.toString()
  if (message === 'pear:applyUpdate') {
    try {
      await pear.ready()
      await pear.updater.applyUpdate()
      pipe.write('pear:updateApplied')
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      pipe.write('pear:updateFailed ' + error)
    }
    return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(message) as unknown
  } catch {
    pipe.write('unknown-message ' + message)
    return
  }

  if (isPing(parsed)) {
    pipe.write(
      JSON.stringify({ type: 'pong', time: new Date().toISOString(), text: 'Hello from worker' })
    )
    return
  }
  pipe.write('unknown-message ' + message)
})

pipe.write(`${helloWorldWorker()} ${helloPearWorker()}`)
