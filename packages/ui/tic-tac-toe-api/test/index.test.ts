import { expect, it } from 'vitest'
import type { Note, NotesChangedEvent } from '@hello-pear/shared-types'
import type { NotesClient } from '@hello-pear/ui-notes'
import {
  createTicTacToeApi,
  type GameCatalog,
  type GameCatalogEntry,
  type Player
} from '../src/index'
import { createInMemoryTicTacToeApi } from '../src/in-memory'

function createCatalog(playerId: string, playerName: string): GameCatalog {
  const games: GameCatalogEntry[] = []
  let currentName = playerName
  const player: Player = {
    id: playerId,
    name: playerName,
    initial: playerName.slice(0, 2).toUpperCase(),
    color: '#7c5cff'
  }
  return {
    list: () => games.map((game) => ({ ...game })),
    get: (gameId) => games.find((game) => game.gameId === gameId) ?? null,
    add: (game) => games.push({ ...game }),
    remove: (gameId) => {
      const index = games.findIndex((game) => game.gameId === gameId)
      if (index !== -1) games.splice(index, 1)
    },
    getLocalPlayer: () => ({ ...player, name: currentName }),
    setLocalPlayerName: (name) => {
      currentName = name.trim()
      if (!currentName) throw new Error('A player name is required')
      return { ...player, name: currentName, initial: currentName.slice(0, 2).toUpperCase() }
    }
  }
}

function createNotesHarness() {
  const vaults = new Map<string, Map<string, Note>>()
  const invites = new Map<string, string>()
  const listeners = new Map<string, Set<(event: NotesChangedEvent) => void>>()

  function notifyChanged(vaultId: string) {
    for (const listener of listeners.get(vaultId) ?? []) {
      listener({ type: 'notes:changed', vaultId })
    }
  }

  function createClient(vaultId: string): NotesClient {
    let vault = vaults.get(vaultId)
    if (!vault) {
      vault = new Map()
      vaults.set(vaultId, vault)
    }
    const notes = vault
    const changeListeners = new Set<(event: NotesChangedEvent) => void>()

    return {
      start: async () => {},
      listNotes: async () => [...notes.values()],
      createNote: async (input, noteId) => {
        const now = new Date().toISOString()
        const note = {
          id: noteId ?? 'generated-note',
          title: input.title,
          content: input.content,
          createdAt: now,
          updatedAt: now
        }
        notes.set(note.id, note)
        notifyChanged(vaultId)
        return note
      },
      getNote: async (noteId) => {
        const note = notes.get(noteId)
        if (!note) throw new Error('Note not found')
        return note
      },
      updateNote: async (noteId, input) => {
        const note = await createClient(vaultId).getNote(noteId)
        const updated = { ...note, ...input, updatedAt: new Date().toISOString() }
        notes.set(noteId, updated)
        notifyChanged(vaultId)
        return updated
      },
      deleteNote: async (noteId) => {
        if (!notes.delete(noteId)) throw new Error('Note not found')
        notifyChanged(vaultId)
      },
      shareNote: async (noteId) => {
        const note = await createClient(vaultId).getNote(noteId)
        const invite = `invite-${vaultId}`
        invites.set(invite, vaultId)
        return { note, invite }
      },
      joinVault: async (invite) => {
        if (!invites.has(invite)) throw new Error('Invalid invite')
      },
      onNotesChanged: (listener) => {
        const vaultListeners = listeners.get(vaultId) ?? new Set()
        vaultListeners.add(listener)
        listeners.set(vaultId, vaultListeners)
        changeListeners.add(listener)
        return () => {
          vaultListeners.delete(listener)
          changeListeners.delete(listener)
        }
      },
      close: () => {
        for (const listener of changeListeners) listeners.get(vaultId)?.delete(listener)
      }
    }
  }

  return { createClient }
}

it('returns independent copies of the mock games', async () => {
  const api = createInMemoryTicTacToeApi()
  const games = await api.list()

  games[0].board[0] = null

  expect((await api.list())[0].board[0]).toBe('X')
})

it('makes a move and advances the opponent', async () => {
  const api = createInMemoryTicTacToeApi()
  const game = await api.makeMove('game-1', 1)

  expect(game.board[1]).toBe('X')
  expect(game.board[3]).toBe('O')
  expect(game.status).toBe('my-turn')
})

it('stores and shares a canonical game through its own notes vault', async () => {
  const notes = createNotesHarness()
  const creatorCatalog = createCatalog('creator', 'Maya')
  const creatorApi = createTicTacToeApi(notes.createClient, creatorCatalog)
  const changes: string[] = []
  creatorApi.onGameChanged((gameId) => changes.push(gameId))

  const created = await creatorApi.create({ title: 'Sunday match' })
  expect(changes).toContain(created.id)
  expect(creatorCatalog.get(created.id)?.noteId).toBe(created.id)
  expect(
    JSON.parse((await notes.createClient(created.id).getNote(created.id)).content)
  ).toMatchObject({
    id: created.id,
    title: 'Sunday match',
    players: { X: { id: 'creator' }, O: null }
  })

  const payload = await creatorApi.shareGame(created.id)
  expect(payload).toMatchObject({ version: 1, gameId: created.id, noteId: created.id })
  expect((await creatorApi.list())[0].status).toBe('invited')

  const recipientCatalog = createCatalog('recipient', 'You')
  const recipientApi = createTicTacToeApi(notes.createClient, recipientCatalog)
  const joined = await recipientApi.joinGame(payload, 'Alex Morgan')

  expect(joined.me.name).toBe('Alex Morgan')
  expect(joined.status).toBe('their-turn')
  expect(changes).toContain(created.id)
  expect((await creatorApi.list())[0].opponent?.name).toBe('Alex Morgan')

  const creatorMove = await creatorApi.makeMove(created.id, 0)
  expect(creatorMove.status).toBe('their-turn')
  const recipientMove = await recipientApi.makeMove(created.id, 1)
  expect(recipientMove.board.slice(0, 2)).toEqual(['O', 'X'])
  expect(recipientMove.status).toBe('their-turn')
  expect((await creatorApi.list())[0].board.slice(0, 2)).toEqual(['X', 'O'])
})
