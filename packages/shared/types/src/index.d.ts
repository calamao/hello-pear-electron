export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface CreateNoteInput {
  title: string
  content: string
}

export interface NotesApi {
  create(input: CreateNoteInput): Promise<Note>
  list(): Promise<Note[]>
  get(noteId: string): Promise<Note>
  delete(noteId: string): Promise<void>
  share(noteId: string): Promise<NotesShareResult>
}

export type NotesOperation = 'create' | 'list' | 'get' | 'delete' | 'share'

export interface NotesShareResult {
  note: Note
  invite: string
}

export type NotesCommand =
  | { type: 'notes:create'; input: CreateNoteInput }
  | { type: 'notes:list' }
  | { type: 'notes:get'; noteId: string }
  | { type: 'notes:delete'; noteId: string }
  | { type: 'notes:share'; noteId: string }

export type NotesRequest = NotesCommand & { requestId: string }

export type NotesResponse =
  | { type: 'notes:created'; requestId: string; note: Note }
  | { type: 'notes:list:result'; requestId: string; notes: Note[] }
  | { type: 'notes:got'; requestId: string; note: Note }
  | { type: 'notes:deleted'; requestId: string; noteId: string }
  | { type: 'notes:shared'; requestId: string; note: Note; invite: string }
  | { type: 'notes:error'; requestId: string; operation: NotesOperation; error: string }
