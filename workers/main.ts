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
import Autopass = require('autopass')
import {
  createAutopassNotesApi,
  createNotesErrorResponse,
  handleNotesRequest,
  isNotesRequest
} from '@hello-pear/worker-notes'
import type { NotesRequest, NotesResponse } from '@hello-pear/shared-types'

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
const notesVaults = new Map<string, Promise<NotesVault>>()

interface NotesVault {
  store: Corestore
  pass: Autopass
  api: ReturnType<typeof createAutopassNotesApi>
}

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
  for (const opening of notesVaults.values()) {
    const vault = await opening
    await vault.pass.close()
    await vault.store.close()
  }
  await swarm.destroy()
  await pear.close()
  await store.close()
})

function isPing(message: unknown): message is { type: 'ping' } {
  return (
    typeof message === 'object' && message !== null && 'type' in message && message.type === 'ping'
  )
}

function notesVaultPath(vaultId: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,80}$/.test(vaultId)) {
    throw new Error('Invalid notes vault ID')
  }
  if (vaultId === 'notes') {
    return path.join(updaterConfig.dir, 'app-storage', 'notes')
  }
  return path.join(updaterConfig.dir, 'app-storage', 'notes-vaults', vaultId)
}

async function openNotesVault(vaultId: string): Promise<NotesVault> {
  const vaultStore = new Corestore(notesVaultPath(vaultId))
  const pass = new Autopass(vaultStore)
  try {
    await pass.ready()
    return { store: vaultStore, pass, api: createAutopassNotesApi(pass) }
  } catch (error) {
    await pass.close()
    await vaultStore.close()
    throw error
  }
}

async function getNotesVault(vaultId: string): Promise<NotesVault> {
  const existing = notesVaults.get(vaultId)
  if (existing) return existing

  const opening = openNotesVault(vaultId)
  notesVaults.set(vaultId, opening)
  try {
    return await opening
  } catch (error) {
    if (notesVaults.get(vaultId) === opening) notesVaults.delete(vaultId)
    throw error
  }
}

async function joinNotesVault(vaultId: string, invite: string): Promise<void> {
  if (vaultId === 'notes') {
    throw new Error('Cannot join an invite into the default notes vault')
  }
  if (notesVaults.has(vaultId)) {
    throw new Error('Notes vault already exists')
  }

  const vaultStore = new Corestore(notesVaultPath(vaultId))
  const pairing = Autopass.pair(vaultStore, invite)
  const opening = (async (): Promise<NotesVault> => {
    try {
      const pass = await pairing.finished()
      await pass.ready()
      return { store: vaultStore, pass, api: createAutopassNotesApi(pass) }
    } catch (error) {
      await pairing.close()
      await vaultStore.close()
      throw error
    }
  })()
  notesVaults.set(vaultId, opening)
  try {
    await opening
  } catch (error) {
    if (notesVaults.get(vaultId) === opening) notesVaults.delete(vaultId)
    throw error
  }
}

async function handleNotesIPC(request: NotesRequest): Promise<NotesResponse> {
  if (request.type === 'notes:join') {
    await joinNotesVault(request.vaultId, request.invite)
    return { type: 'notes:joined', requestId: request.requestId, vaultId: request.vaultId }
  }

  const vault = await getNotesVault(request.vaultId)
  return handleNotesRequest(vault.api, request, vault.pass.ready())
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
  if (isNotesRequest(parsed)) {
    const response = await handleNotesIPC(parsed).catch((error: unknown) =>
      createNotesErrorResponse(parsed, error)
    )
    pipe.write(JSON.stringify(response))
    return
  }
  pipe.write('unknown-message ' + message)
})

pipe.write(`${helloWorldWorker()} ${helloPearWorker()}`)
