import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import type { Note } from '@hello-pear/shared-types'
import { createNotesClient, type NotesClient } from '@hello-pear/ui-notes'

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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function NotesPanel({ active }: { active: boolean }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [shareInvite, setShareInvite] = useState('')
  const [status, setStatus] = useState('')
  const clientRef = useRef<NotesClient | null>(null)

  useEffect(() => {
    if (!active) return

    const client = createNotesClient(window.bridge)
    clientRef.current = client
    let mounted = true
    setStatus('Loading notes...')

    void client
      .listNotes()
      .then((items) => {
        if (!mounted) return
        setNotes(items)
        setStatus(`${items.length} ${items.length === 1 ? 'note' : 'notes'}.`)
      })
      .catch((error: unknown) => {
        if (mounted) setStatus(`Could not load notes: ${errorMessage(error)}`)
      })

    return () => {
      mounted = false
      if (clientRef.current === client) clientRef.current = null
      client.close()
    }
  }, [active])

  async function createNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('Creating note...')
    try {
      const note = await requireClient().createNote({ title, content })
      setNotes((current) => [note, ...current.filter((item) => item.id !== note.id)])
      setTitle('')
      setContent('')
      setStatus('Note created.')
    } catch (error) {
      setStatus(`Could not create note: ${errorMessage(error)}`)
    }
  }

  async function deleteNote(noteId: string) {
    setStatus('Deleting note...')
    try {
      await requireClient().deleteNote(noteId)
      setNotes((current) => current.filter((note) => note.id !== noteId))
      setStatus('Note deleted.')
    } catch (error) {
      setStatus(`Could not delete note: ${errorMessage(error)}`)
    }
  }

  async function shareNote(noteId: string) {
    setStatus('Creating vault invite...')
    try {
      const result = await requireClient().shareNote(noteId)
      setShareInvite(result.invite)
      setStatus('Invite created for the entire notes vault.')
    } catch (error) {
      setStatus(`Could not create vault invite: ${errorMessage(error)}`)
    }
  }

  function requireClient() {
    if (!clientRef.current) throw new Error('Notes client is not active')
    return clientRef.current
  }

  return (
    <Panel>
      <h1>My notes</h1>
      <p>Create and delete notes, or create an invite for the entire notes vault.</p>
      {shareInvite && <Status role='status'>Vault invite: {shareInvite}</Status>}
      <Form onSubmit={(event) => void createNote(event)}>
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
            <Button type='button' onClick={() => void shareNote(note.id)}>
              Share vault
            </Button>
            <Button type='button' onClick={() => void deleteNote(note.id)}>
              Delete
            </Button>
          </NoteActions>
        </NoteCard>
      ))}
    </Panel>
  )
}
