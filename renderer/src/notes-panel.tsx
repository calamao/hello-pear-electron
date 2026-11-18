import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import type { Note, NotesCommand, NotesResponse } from '@hello-pear/shared-types'

const mainWorker = '/workers/main.js'
const decoder = new TextDecoder('utf-8')

const Panel = styled.section`
  max-width: 760px;
  margin: 0 auto;
  border: 1px solid #dfded8;
  border-radius: 20px;
  background: #fff;
  padding: clamp(20px, 4vw, 36px);
  box-shadow: 0 12px 30px rgba(32, 32, 29, 0.05);
`

const Form = styled.form`
  display: grid;
  gap: 12px;
  margin: 24px 0;
`

const Input = styled.input`
  min-height: 44px;
  border: 1px solid #dfded8;
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
`

const Textarea = styled.textarea`
  min-height: 110px;
  border: 1px solid #dfded8;
  border-radius: 10px;
  padding: 12px;
  font: inherit;
  resize: vertical;
`

const Button = styled.button`
  min-height: 40px;
  border: 0;
  border-radius: 10px;
  background: #20201d;
  color: #fff;
  padding: 0 14px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
`

const NoteCard = styled.article`
  border-top: 1px solid #e8e7e1;
  padding: 16px 0;
`

const NoteActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`

const Status = styled.p`
  color: #5a5953;
  font-size: 14px;
  overflow-wrap: anywhere;
`

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
    case 'notes:error':
      return (
        'error' in value &&
        typeof value.error === 'string' &&
        'operation' in value &&
        (value.operation === 'create' ||
          value.operation === 'list' ||
          value.operation === 'delete' ||
          value.operation === 'share')
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

export function NotesPanel({ active }: { active: boolean }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [shareInvite, setShareInvite] = useState('')
  const [status, setStatus] = useState('')
  const requestId = useRef(0)
  const send = useCallback((request: NotesCommand) => {
    const message = { ...request, requestId: `notes-${++requestId.current}` }
    void window.bridge
      .writeWorkerIPC(mainWorker, JSON.stringify(message))
      .catch((error: unknown) => {
        setStatus(`Worker IPC failed: ${error instanceof Error ? error.message : String(error)}`)
      })
  }, [])

  useEffect(() => {
    if (!active) return

    const offWorkerIPC = window.bridge.onWorkerIPC(mainWorker, (data) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(decoder.decode(data)) as unknown
      } catch {
        return
      }
      if (!isNotesResponse(parsed)) return

      switch (parsed.type) {
        case 'notes:created':
          setNotes((current) => [
            parsed.note,
            ...current.filter((note) => note.id !== parsed.note.id)
          ])
          setStatus('Note created.')
          break
        case 'notes:list:result':
          setNotes(parsed.notes)
          setStatus(`${parsed.notes.length} ${parsed.notes.length === 1 ? 'note' : 'notes'}.`)
          break
        case 'notes:deleted':
          setNotes((current) => current.filter((note) => note.id !== parsed.noteId))
          setStatus('Note deleted.')
          break
        case 'notes:shared':
          setShareInvite(parsed.invite)
          setStatus('Read-only invite created for the entire notes vault.')
          break
        case 'notes:error':
          setStatus(`Could not ${parsed.operation} note: ${parsed.error}`)
          break
      }
    })

    void window.bridge
      .startWorker(mainWorker)
      .then((started) => {
        if (!started) {
          setStatus('Worker did not start.')
          return
        }
        send({ type: 'notes:list' })
      })
      .catch((error: unknown) => {
        setStatus(
          `Worker failed to start: ${error instanceof Error ? error.message : String(error)}`
        )
      })

    return () => offWorkerIPC()
  }, [active, send])

  function createNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    send({ type: 'notes:create', input: { title, content } })
    setTitle('')
    setContent('')
    setStatus('Creating note...')
  }

  return (
    <Panel>
      <h1>My notes</h1>
      <p>Create and delete notes, or create a read-only invite for the entire notes vault.</p>
      {shareInvite && <Status role='status'>Vault invite: {shareInvite}</Status>}
      <Form onSubmit={createNote}>
        <Input
          aria-label='Note title'
          placeholder='Title'
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
        <Textarea
          aria-label='Note content'
          placeholder='Write a note...'
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <Button type='submit'>Create note</Button>
      </Form>
      <Status role='status'>{status}</Status>
      {notes.map((note) => (
        <NoteCard key={note.id}>
          <h2>{note.title}</h2>
          <p>{note.content}</p>
          <NoteActions>
            <Button type='button' onClick={() => send({ type: 'notes:share', noteId: note.id })}>
              Share vault
            </Button>
            <Button type='button' onClick={() => send({ type: 'notes:delete', noteId: note.id })}>
              Delete
            </Button>
          </NoteActions>
        </NoteCard>
      ))}
    </Panel>
  )
}
