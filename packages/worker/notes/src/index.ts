import type {
  CreateNoteInput,
  Note,
  NotesApi,
  NotesOperation,
  NotesRequest,
  NotesResponse
} from '@hello-pear/shared-types'

interface AutopassRecord {
  key: string
  value: string
}

interface AutopassQuery {
  toArray(): Promise<AutopassRecord[]>
}

export interface AutopassNotesPass {
  add(key: string, value: string): Promise<void>
  createInvite(options: { readOnly: boolean }): Promise<string>
  get(key: string): Promise<{ value: string } | null>
  list(): AutopassQuery
  remove(key: string): Promise<void>
}

const noteKeyPrefix = 'notes:'

export function createAutopassNotesApi(pass: AutopassNotesPass): NotesApi {
  let nextId = 1

  async function getNote(noteId: string) {
    const record = await pass.get(noteKey(noteId))
    if (record === null) {
      throw new Error('Note not found')
    }
    return JSON.parse(record.value) as Note
  }

  return {
    async create(input: CreateNoteInput, noteId) {
      const title = input.title.trim()
      if (!title) {
        throw new Error('A note title is required')
      }

      const id = noteId ?? `note-${Date.now().toString(36)}-${nextId++}`
      if ((await pass.get(noteKey(id))) !== null) {
        throw new Error('Note already exists')
      }
      const now = new Date().toISOString()
      const note: Note = {
        id,
        title,
        content: input.content,
        createdAt: now,
        updatedAt: now
      }
      await pass.add(noteKey(note.id), JSON.stringify(note))
      return { ...note }
    },
    async update(noteId, input) {
      const title = input.title.trim()
      if (!title) {
        throw new Error('A note title is required')
      }
      const current = await getNote(noteId)
      const note: Note = {
        ...current,
        title,
        content: input.content,
        updatedAt: new Date().toISOString()
      }
      await pass.add(noteKey(noteId), JSON.stringify(note))
      return note
    },
    async list() {
      const records = await pass.list().toArray()
      return records
        .filter((record) => record.key.startsWith(noteKeyPrefix))
        .map((record) => JSON.parse(record.value) as Note)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    },
    get: getNote,
    async delete(noteId: string) {
      const key = noteKey(noteId)
      if ((await pass.get(key)) === null) {
        throw new Error('Note not found')
      }
      await pass.remove(key)
    },
    async share(noteId: string) {
      const note = await getNote(noteId)
      // Autopass invites pair the whole pass, not an individual note.
      const invite = await pass.createInvite({ readOnly: false })
      return { note, invite }
    }
  }
}

function noteKey(noteId: string) {
  return `${noteKeyPrefix}${noteId}`
}

export function isNotesRequest(value: unknown): value is NotesRequest {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('type' in value) ||
    !('requestId' in value) ||
    typeof value.requestId !== 'string' ||
    !('vaultId' in value) ||
    typeof value.vaultId !== 'string'
  ) {
    return false
  }

  switch (value.type) {
    case 'notes:create':
      return (
        'input' in value &&
        typeof value.input === 'object' &&
        value.input !== null &&
        'title' in value.input &&
        typeof value.input.title === 'string' &&
        'content' in value.input &&
        typeof value.input.content === 'string'
      )
    case 'notes:list':
      return true
    case 'notes:get':
    case 'notes:delete':
    case 'notes:share':
      return 'noteId' in value && typeof value.noteId === 'string'
    case 'notes:update':
      return (
        'noteId' in value &&
        typeof value.noteId === 'string' &&
        'input' in value &&
        typeof value.input === 'object' &&
        value.input !== null &&
        'title' in value.input &&
        typeof value.input.title === 'string' &&
        'content' in value.input &&
        typeof value.input.content === 'string'
      )
    case 'notes:join':
      return 'invite' in value && typeof value.invite === 'string'
    default:
      return false
  }
}

export type NotesDataRequest = Exclude<NotesRequest, { type: 'notes:join' }>

export function createNotesErrorResponse(request: NotesRequest, error: unknown): NotesResponse {
  const operations: Record<NotesRequest['type'], NotesOperation> = {
    'notes:create': 'create',
    'notes:list': 'list',
    'notes:get': 'get',
    'notes:update': 'update',
    'notes:delete': 'delete',
    'notes:share': 'share',
    'notes:join': 'join'
  }
  return {
    type: 'notes:error',
    requestId: request.requestId,
    operation: operations[request.type],
    error: error instanceof Error ? error.message : String(error)
  }
}

export async function handleNotesRequest(
  api: NotesApi,
  request: NotesDataRequest,
  ready?: Promise<void>
): Promise<NotesResponse> {
  try {
    if (ready) {
      await ready
    }

    switch (request.type) {
      case 'notes:create':
        return {
          type: 'notes:created',
          requestId: request.requestId,
          note: await api.create(request.input, request.noteId)
        }
      case 'notes:list':
        return {
          type: 'notes:list:result',
          requestId: request.requestId,
          notes: await api.list()
        }
      case 'notes:get':
        return {
          type: 'notes:got',
          requestId: request.requestId,
          note: await api.get(request.noteId)
        }
      case 'notes:update':
        return {
          type: 'notes:updated',
          requestId: request.requestId,
          note: await api.update(request.noteId, request.input)
        }
      case 'notes:delete':
        await api.delete(request.noteId)
        return { type: 'notes:deleted', requestId: request.requestId, noteId: request.noteId }
      case 'notes:share':
        return {
          type: 'notes:shared',
          requestId: request.requestId,
          ...(await api.share(request.noteId))
        }
    }
  } catch (error) {
    return createNotesErrorResponse(request, error)
  }
}
