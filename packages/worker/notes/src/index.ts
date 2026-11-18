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

  return {
    async create(input: CreateNoteInput) {
      const title = input.title.trim()
      if (!title) {
        throw new Error('A note title is required')
      }

      const now = new Date().toISOString()
      const note: Note = {
        id: `note-${Date.now().toString(36)}-${nextId++}`,
        title,
        content: input.content,
        createdAt: now,
        updatedAt: now
      }
      await pass.add(noteKey(note.id), JSON.stringify(note))
      return { ...note }
    },
    async list() {
      const records = await pass.list().toArray()
      return records
        .filter((record) => record.key.startsWith(noteKeyPrefix))
        .map((record) => JSON.parse(record.value) as Note)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    },
    async delete(noteId: string) {
      const key = noteKey(noteId)
      if ((await pass.get(key)) === null) {
        throw new Error('Note not found')
      }
      await pass.remove(key)
    },
    async share(noteId: string) {
      const note = await pass.get(noteKey(noteId))
      if (note === null) {
        throw new Error('Note not found')
      }
      // Autopass invites pair the whole pass, not an individual note.
      const invite = await pass.createInvite({ readOnly: false })
      return { note: JSON.parse(note.value) as Note, invite }
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
    typeof value.requestId !== 'string'
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
    case 'notes:delete':
    case 'notes:share':
      return 'noteId' in value && typeof value.noteId === 'string'
    default:
      return false
  }
}

export async function handleNotesRequest(
  api: NotesApi,
  request: NotesRequest,
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
          note: await api.create(request.input)
        }
      case 'notes:list':
        return {
          type: 'notes:list:result',
          requestId: request.requestId,
          notes: await api.list()
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
    const operation: NotesOperation =
      request.type === 'notes:create'
        ? 'create'
        : request.type === 'notes:list'
          ? 'list'
          : request.type === 'notes:delete'
            ? 'delete'
            : 'share'
    return {
      type: 'notes:error',
      requestId: request.requestId,
      operation,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
