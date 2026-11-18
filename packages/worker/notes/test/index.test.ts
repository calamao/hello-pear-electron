import { expect, it } from 'vitest'
import { createAutopassNotesApi, handleNotesRequest } from '../src/index'
import type { AutopassNotesPass } from '../src/index'

function createPass(): AutopassNotesPass {
  const records = new Map<string, string>()

  return {
    async add(key, value) {
      records.set(key, value)
    },
    async createInvite({ readOnly }) {
      return readOnly ? 'readonly-invite' : 'writable-invite'
    },
    async get(key) {
      const value = records.get(key)
      return value === undefined ? null : { value }
    },
    list() {
      return {
        async toArray() {
          return Array.from(records, ([key, value]) => ({ key, value }))
        }
      }
    },
    async remove(key) {
      records.delete(key)
    }
  }
}

it('creates, lists, and deletes notes through the Autopass API', async () => {
  const api = createAutopassNotesApi(createPass())
  const created = await api.create({ title: '  Shopping  ', content: 'Milk' }, 'game-123')

  expect(created.title).toBe('Shopping')
  expect(created.id).toBe('game-123')
  expect(await api.list()).toEqual([created])
  await api.delete(created.id)
  expect(await api.list()).toEqual([])
})

it('shares a note using a writable Autopass invite', async () => {
  const api = createAutopassNotesApi(createPass())
  const note = await api.create({ title: 'Shared', content: 'Hello' })

  expect(await api.share(note.id)).toEqual({ note, invite: 'writable-invite' })
})

it('returns request errors as typed worker events', async () => {
  const response = await handleNotesRequest(createAutopassNotesApi(createPass()), {
    type: 'notes:delete',
    requestId: 'delete-1',
    noteId: 'missing'
  })

  expect(response).toEqual({
    type: 'notes:error',
    requestId: 'delete-1',
    operation: 'delete',
    error: 'Note not found'
  })
})
