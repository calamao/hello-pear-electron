import type {
  CreateNoteInput,
  Note,
  NotesCommand,
  NotesRequest,
  NotesResponse,
  NotesShareResult
} from '@hello-pear/shared-types'

export interface NotesWorkerBridge {
  startWorker(specifier: string): Promise<boolean>
  onWorkerIPC(specifier: string, listener: (data: Uint8Array) => void): () => void
  writeWorkerIPC(specifier: string, data: string): Promise<boolean>
}

export interface NotesClient {
  start(): Promise<void>
  listNotes(): Promise<Note[]>
  createNote(input: CreateNoteInput, noteId?: string): Promise<Note>
  getNote(noteId: string): Promise<Note>
  updateNote(noteId: string, input: CreateNoteInput): Promise<Note>
  deleteNote(noteId: string): Promise<void>
  shareNote(noteId: string): Promise<NotesShareResult>
  joinVault(invite: string): Promise<void>
  close(): void
}

export interface NotesClientOptions {
  vaultId?: string
  workerSpecifier?: string
}

interface PendingRequest {
  resolve(response: NotesResponse): void
  reject(error: Error): void
}

const mainWorker = '/workers/main.js'
const decoder = new TextDecoder('utf-8')

export function createNotesClient(
  bridge: NotesWorkerBridge,
  options: NotesClientOptions = {}
): NotesClient {
  const vaultId = options.vaultId ?? 'notes'
  const workerSpecifier = options.workerSpecifier ?? mainWorker
  const pending = new Map<string, PendingRequest>()
  const clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  let nextRequestId = 0
  let offWorkerIPC: (() => void) | null = null
  let startPromise: Promise<void> | null = null
  let closed = false

  function onWorkerIPC(data: Uint8Array) {
    let parsed: unknown
    try {
      parsed = JSON.parse(decoder.decode(data)) as unknown
    } catch {
      return
    }

    if (!isNotesResponse(parsed)) return

    const request = pending.get(parsed.requestId)
    if (!request) return
    pending.delete(parsed.requestId)

    if (parsed.type === 'notes:error') {
      request.reject(new Error(parsed.error))
    } else {
      request.resolve(parsed)
    }
  }

  function start(): Promise<void> {
    if (closed) return Promise.reject(new Error('Notes client is closed'))
    if (startPromise) return startPromise

    offWorkerIPC = bridge.onWorkerIPC(workerSpecifier, onWorkerIPC)
    startPromise = bridge
      .startWorker(workerSpecifier)
      .then((started) => {
        if (closed) throw new Error('Notes client is closed')
        if (!started) throw new Error('Worker did not start')
      })
      .catch((error: unknown) => {
        offWorkerIPC?.()
        offWorkerIPC = null
        startPromise = null
        throw error
      })

    return startPromise
  }

  function request(command: NotesCommand): Promise<NotesResponse> {
    return start().then(
      () =>
        new Promise((resolve, reject) => {
          const requestId = `${clientId}-${++nextRequestId}`
          const message: NotesRequest = { ...command, requestId, vaultId }
          pending.set(requestId, { resolve, reject })

          void bridge
            .writeWorkerIPC(workerSpecifier, JSON.stringify(message))
            .then((written) => {
              if (!written) rejectRequest(requestId, new Error('Worker IPC write failed'))
            })
            .catch((error: unknown) => {
              rejectRequest(requestId, error instanceof Error ? error : new Error(String(error)))
            })
        })
    )
  }

  function rejectRequest(requestId: string, error: Error) {
    const request = pending.get(requestId)
    if (!request) return
    pending.delete(requestId)
    request.reject(error)
  }

  function assertResponse<Type extends NotesResponse['type']>(
    response: NotesResponse,
    type: Type
  ): asserts response is Extract<NotesResponse, { type: Type }> {
    if (response.type !== type) {
      throw new Error(`Unexpected notes response: ${response.type}`)
    }
  }

  return {
    start,
    async listNotes() {
      const response = await request({ type: 'notes:list' })
      assertResponse(response, 'notes:list:result')
      return response.notes
    },
    async createNote(input, noteId) {
      const response = await request({ type: 'notes:create', input, noteId })
      assertResponse(response, 'notes:created')
      return response.note
    },
    async getNote(noteId) {
      const response = await request({ type: 'notes:get', noteId })
      assertResponse(response, 'notes:got')
      return response.note
    },
    async updateNote(noteId, input) {
      const response = await request({ type: 'notes:update', noteId, input })
      assertResponse(response, 'notes:updated')
      return response.note
    },
    async deleteNote(noteId) {
      const response = await request({ type: 'notes:delete', noteId })
      assertResponse(response, 'notes:deleted')
    },
    async shareNote(noteId) {
      const response = await request({ type: 'notes:share', noteId })
      assertResponse(response, 'notes:shared')
      return { note: response.note, invite: response.invite }
    },
    async joinVault(invite) {
      const response = await request({ type: 'notes:join', invite })
      assertResponse(response, 'notes:joined')
    },
    close() {
      if (closed) return
      closed = true
      offWorkerIPC?.()
      offWorkerIPC = null
      for (const [requestId, request] of pending) {
        pending.delete(requestId)
        request.reject(new Error('Notes client is closed'))
      }
    }
  }
}

function isNotesResponse(value: unknown): value is NotesResponse {
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
    case 'notes:created':
    case 'notes:got':
    case 'notes:updated':
      return 'note' in value && isNote(value.note)
    case 'notes:shared':
      return (
        'note' in value &&
        isNote(value.note) &&
        'invite' in value &&
        typeof value.invite === 'string'
      )
    case 'notes:list:result':
      return 'notes' in value && Array.isArray(value.notes) && value.notes.every(isNote)
    case 'notes:deleted':
      return 'noteId' in value && typeof value.noteId === 'string'
    case 'notes:joined':
      return 'vaultId' in value && typeof value.vaultId === 'string'
    case 'notes:error':
      return (
        'error' in value &&
        typeof value.error === 'string' &&
        'operation' in value &&
        (value.operation === 'create' ||
          value.operation === 'list' ||
          value.operation === 'get' ||
          value.operation === 'update' ||
          value.operation === 'delete' ||
          value.operation === 'share' ||
          value.operation === 'join')
      )
    default:
      return false
  }
}

function isNote(value: unknown): value is Note {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'content' in value &&
    typeof value.content === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    'updatedAt' in value &&
    typeof value.updatedAt === 'string'
  )
}
