import { expect, it } from 'vitest'
import type {
  NotesChangedEvent,
  NotesOperation,
  NotesRequest,
  NotesResponse
} from '@hello-pear/shared-types'
import { createNotesClient } from '../src/index'

const note = {
  id: 'note-1',
  title: 'Title',
  content: 'Content',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

class FakeBridge {
  requests: NotesRequest[] = []
  listener: ((data: Uint8Array) => void) | null = null
  started = 0
  response: (request: NotesRequest) => NotesResponse = (request) => ({
    type: 'notes:error',
    requestId: request.requestId,
    operation: operationFor(request),
    error: 'Unexpected request'
  })

  startWorker() {
    this.started++
    return Promise.resolve(true)
  }

  onWorkerIPC(_specifier: string, listener: (data: Uint8Array) => void) {
    this.listener = listener
    return () => {
      this.listener = null
    }
  }

  writeWorkerIPC(_specifier: string, data: string) {
    const request = JSON.parse(data) as NotesRequest
    this.requests.push(request)
    this.emit(this.response(request))
    return Promise.resolve(true)
  }

  emit(message: NotesChangedEvent | NotesResponse) {
    this.listener?.(new TextEncoder().encode(JSON.stringify(message)))
  }
}

function operationFor(request: NotesRequest): NotesOperation {
  switch (request.type) {
    case 'notes:create':
      return 'create'
    case 'notes:list':
      return 'list'
    case 'notes:get':
      return 'get'
    case 'notes:update':
      return 'update'
    case 'notes:delete':
      return 'delete'
    case 'notes:share':
      return 'share'
    case 'notes:join':
      return 'join'
  }
}

it('provides note methods over the worker request/response protocol', async () => {
  const bridge = new FakeBridge()
  bridge.response = (request) => {
    switch (request.type) {
      case 'notes:list':
        return { type: 'notes:list:result', requestId: request.requestId, notes: [note] }
      case 'notes:create':
        return { type: 'notes:created', requestId: request.requestId, note }
      case 'notes:get':
        return { type: 'notes:got', requestId: request.requestId, note }
      case 'notes:delete':
        return { type: 'notes:deleted', requestId: request.requestId, noteId: request.noteId }
      case 'notes:share':
        return { type: 'notes:shared', requestId: request.requestId, note, invite: 'invite' }
    }
  }
  const client = createNotesClient(bridge)

  expect(await client.listNotes()).toEqual([note])
  expect(await client.createNote({ title: 'Title', content: 'Content' })).toEqual(note)
  expect(await client.getNote(note.id)).toEqual(note)
  await client.deleteNote(note.id)
  expect(await client.shareNote(note.id)).toEqual({ note, invite: 'invite' })
  expect(bridge.requests.map(({ type }) => type)).toEqual([
    'notes:list',
    'notes:create',
    'notes:get',
    'notes:delete',
    'notes:share'
  ])
  expect(bridge.started).toBe(1)
  client.close()
})

it('rejects a failed worker response with its API error', async () => {
  const bridge = new FakeBridge()
  bridge.response = (request) => ({
    type: 'notes:error',
    requestId: request.requestId,
    operation: 'get',
    error: 'Note not found'
  })
  const client = createNotesClient(bridge)

  await expect(client.getNote('missing')).rejects.toThrow('Note not found')
  client.close()
})

it('notifies only subscribers for the client vault', async () => {
  const bridge = new FakeBridge()
  bridge.response = (request) => ({
    type: 'notes:list:result',
    requestId: request.requestId,
    notes: [note]
  })
  const client = createNotesClient(bridge, { vaultId: 'game-1' })
  const changed: string[] = []
  const off = client.onNotesChanged((event) => changed.push(event.vaultId))

  await client.listNotes()
  bridge.emit({ type: 'notes:changed', vaultId: 'game-1' })
  bridge.emit({ type: 'notes:changed', vaultId: 'game-2' })
  off()
  bridge.emit({ type: 'notes:changed', vaultId: 'game-1' })

  expect(changed).toEqual(['game-1'])
  client.close()
})
