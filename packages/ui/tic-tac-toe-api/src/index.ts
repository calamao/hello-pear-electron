import type { Note } from '@hello-pear/shared-types'
import type { NotesClient } from '@hello-pear/ui-notes'
import type {
  CreateGameInput,
  GameCatalogEntry,
  Player,
  PlayerMark,
  TicTacToeApi,
  TicTacToeGame,
  TicTacToeGameRecord,
  TicTacToeSharePayload
} from './types'

export type {
  CreateGameInput,
  GameCatalogEntry,
  GameStatus,
  Player,
  PlayerMark,
  TicTacToeApi,
  TicTacToeGame,
  TicTacToeGameRecord,
  TicTacToeSharePayload
} from './types'

export interface GameCatalog {
  list(): GameCatalogEntry[]
  get(gameId: string): GameCatalogEntry | null
  add(entry: GameCatalogEntry): void
  remove(gameId: string): void
  getLocalPlayer(): Player
  setLocalPlayerName(name: string): Player
}

interface CatalogStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface CatalogData {
  playerId: string
  playerName: string
  games: GameCatalogEntry[]
}

const catalogKey = 'hello-pear.tic-tac-toe.catalog'
const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
]

export function createLocalGameCatalog(storage?: CatalogStorage): GameCatalog {
  const persistence = storage ?? globalThis.localStorage
  if (!persistence) throw new Error('Persistent local storage is unavailable')

  function read(): CatalogData {
    const stored = persistence.getItem(catalogKey)
    if (stored === null) {
      const initial: CatalogData = {
        playerId: `player-${crypto.randomUUID()}`,
        playerName: 'You',
        games: []
      }
      write(initial)
      return initial
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(stored) as unknown
    } catch (error) {
      throw new Error(
        `Could not parse the local game catalog: ${error instanceof Error ? error.message : String(error)}`
      )
    }
    if (!isCatalogData(parsed)) throw new Error('The local game catalog has an invalid shape')
    return parsed
  }

  function write(data: CatalogData) {
    persistence.setItem(catalogKey, JSON.stringify(data))
  }

  return {
    list() {
      return read().games.map((entry) => ({ ...entry }))
    },
    get(gameId) {
      const entry = read().games.find((item) => item.gameId === gameId)
      return entry ? { ...entry } : null
    },
    add(entry) {
      const data = read()
      const games = data.games.filter((item) => item.gameId !== entry.gameId)
      games.push({ ...entry })
      write({ ...data, games })
    },
    remove(gameId) {
      const data = read()
      write({ ...data, games: data.games.filter((item) => item.gameId !== gameId) })
    },
    getLocalPlayer() {
      const data = read()
      return createPlayer(data.playerId, data.playerName)
    },
    setLocalPlayerName(name) {
      const playerName = name.trim()
      if (!playerName) throw new Error('A player name is required')
      const data = read()
      write({ ...data, playerName })
      return createPlayer(data.playerId, playerName)
    }
  }
}

export function createTicTacToeApi(
  createNotesClient: (vaultId: string) => NotesClient,
  catalog: GameCatalog
): TicTacToeApi {
  const clients = new Map<string, NotesClient>()
  const gameChangedListeners = new Set<(gameId: string) => void>()

  function getClient(gameId: string) {
    let client = clients.get(gameId)
    if (client) return client

    client = createNotesClient(gameId)
    client.onNotesChanged(() => {
      for (const listener of gameChangedListeners) listener(gameId)
    })
    clients.set(gameId, client)
    return client
  }

  async function getRecord(gameId: string) {
    const entry = catalog.get(gameId)
    if (!entry) throw new Error('Game not found')
    const note = await getClient(gameId).getNote(entry.noteId)
    return { entry, record: parseGameRecord(note, gameId) }
  }

  async function saveRecord(client: NotesClient, noteId: string, record: TicTacToeGameRecord) {
    return client.updateNote(noteId, {
      title: record.title,
      content: JSON.stringify(record)
    })
  }

  return {
    async list() {
      const games = await Promise.all(
        catalog.list().map(async ({ gameId, noteId }) => {
          const note = await getClient(gameId).getNote(noteId)
          const record = parseGameRecord(note, gameId)
          return projectGame(record, catalog.getLocalPlayer().id)
        })
      )
      return games
    },
    async create(input: CreateGameInput = {}) {
      const gameId = `game-${crypto.randomUUID()}`
      const title = input.title?.trim() || 'New match'
      const player = catalog.getLocalPlayer()
      const record: TicTacToeGameRecord = {
        version: 1,
        id: gameId,
        title,
        board: Array<PlayerMark | null>(9).fill(null),
        players: { X: { ...player, mark: 'X' }, O: null },
        currentTurn: 'X',
        winner: null,
        isDraw: false,
        invitePending: false,
        updatedAt: new Date().toISOString()
      }
      const note = await getClient(gameId).createNote(
        { title, content: JSON.stringify(record) },
        gameId
      )
      catalog.add({ gameId, noteId: note.id })
      return projectGame(record, player.id)
    },
    async delete(gameId: string) {
      const entry = catalog.get(gameId)
      if (!entry) throw new Error('Game not found')
      const client = getClient(gameId)
      await client.deleteNote(entry.noteId)
      catalog.remove(gameId)
      client.close()
      clients.delete(gameId)
    },
    async makeMove(gameId: string, index: number) {
      const { entry, record } = await getRecord(gameId)
      if (record.winner || record.isDraw) throw new Error('This game is already finished')
      if (index < 0 || index > 8 || record.board[index] !== null) {
        throw new Error('That square is unavailable')
      }

      const playerMark = markForPlayer(record, catalog.getLocalPlayer().id)
      if (!playerMark || record.currentTurn !== playerMark) {
        throw new Error("It's not your turn")
      }

      record.board[index] = playerMark
      record.winner = findWinner(record.board)
      record.isDraw = !record.winner && record.board.every(Boolean)
      record.currentTurn = record.winner || record.isDraw ? null : playerMark === 'X' ? 'O' : 'X'
      record.updatedAt = new Date().toISOString()

      await saveRecord(getClient(gameId), entry.noteId, record)
      return projectGame(record, catalog.getLocalPlayer().id)
    },
    async shareGame(gameId) {
      const { entry, record } = await getRecord(gameId)
      const client = getClient(gameId)
      const shared = await client.shareNote(entry.noteId)
      record.invitePending = true
      record.updatedAt = new Date().toISOString()
      await saveRecord(client, entry.noteId, record)
      return {
        version: 1,
        gameId,
        noteId: shared.note.id,
        invite: shared.invite
      }
    },
    async joinGame(payload, playerName) {
      if (!isTicTacToeSharePayload(payload)) throw new Error('Invalid game invite')
      if (catalog.get(payload.gameId)) throw new Error('This game is already in your catalog')

      const client = getClient(payload.gameId)
      await client.joinVault(payload.invite)
      const note = await client.getNote(payload.noteId)
      const record = parseGameRecord(note, payload.gameId)
      const currentPlayer = catalog.getLocalPlayer()

      if (record.players.X.id === currentPlayer.id) {
        throw new Error('You cannot join a game you created')
      }
      if (record.players.O && record.players.O.id !== currentPlayer.id) {
        throw new Error('This game already has an opponent')
      }

      const player = catalog.setLocalPlayerName(playerName)
      record.players.O = { ...player, mark: 'O' }
      record.invitePending = false
      record.updatedAt = new Date().toISOString()
      await saveRecord(client, note.id, record)
      catalog.add({ gameId: payload.gameId, noteId: note.id })
      return projectGame(record, player.id)
    },
    onGameChanged(listener) {
      gameChangedListeners.add(listener)
      return () => gameChangedListeners.delete(listener)
    }
  }
}

export function parseTicTacToeSharePayload(value: string): TicTacToeSharePayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(value) as unknown
  } catch (error) {
    throw new Error(
      `Invalid game invite: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  if (!isTicTacToeSharePayload(parsed)) throw new Error('Invalid game invite')
  return parsed
}

function isTicTacToeSharePayload(value: unknown): value is TicTacToeSharePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    value.version === 1 &&
    'gameId' in value &&
    typeof value.gameId === 'string' &&
    /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,80}$/.test(value.gameId) &&
    'noteId' in value &&
    typeof value.noteId === 'string' &&
    'invite' in value &&
    typeof value.invite === 'string' &&
    value.invite.length > 0
  )
}

function isCatalogData(value: unknown): value is CatalogData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'playerId' in value &&
    typeof value.playerId === 'string' &&
    'playerName' in value &&
    typeof value.playerName === 'string' &&
    'games' in value &&
    Array.isArray(value.games) &&
    value.games.every(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        'gameId' in entry &&
        typeof entry.gameId === 'string' &&
        'noteId' in entry &&
        typeof entry.noteId === 'string'
    )
  )
}

function parseGameRecord(note: Note, gameId: string): TicTacToeGameRecord {
  let parsed: unknown
  try {
    parsed = JSON.parse(note.content) as unknown
  } catch (error) {
    throw new Error(
      `Game note is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    )
  }
  if (!isTicTacToeGameRecord(parsed) || parsed.id !== gameId || note.id !== gameId) {
    throw new Error('Game note does not match its catalog entry')
  }
  return parsed
}

function isTicTacToeGameRecord(value: unknown): value is TicTacToeGameRecord {
  if (typeof value !== 'object' || value === null) return false
  if (
    !('version' in value) ||
    value.version !== 1 ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !('title' in value) ||
    typeof value.title !== 'string' ||
    !('board' in value) ||
    !Array.isArray(value.board) ||
    value.board.length !== 9 ||
    !value.board.every((mark) => mark === null || mark === 'X' || mark === 'O') ||
    !('players' in value) ||
    typeof value.players !== 'object' ||
    value.players === null ||
    !('X' in value.players) ||
    !isPlayer(value.players.X) ||
    !('O' in value.players) ||
    (value.players.O !== null && !isPlayer(value.players.O)) ||
    !('currentTurn' in value) ||
    (value.currentTurn !== null && value.currentTurn !== 'X' && value.currentTurn !== 'O') ||
    !('winner' in value) ||
    (value.winner !== null && value.winner !== 'X' && value.winner !== 'O') ||
    !('isDraw' in value) ||
    typeof value.isDraw !== 'boolean' ||
    !('invitePending' in value) ||
    typeof value.invitePending !== 'boolean' ||
    !('updatedAt' in value) ||
    typeof value.updatedAt !== 'string'
  ) {
    return false
  }
  return true
}

function isPlayer(value: unknown): value is Player {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'initial' in value &&
    typeof value.initial === 'string' &&
    'color' in value &&
    typeof value.color === 'string'
  )
}

function projectGame(record: TicTacToeGameRecord, playerId: string): TicTacToeGame {
  const myMark = markForPlayer(record, playerId)
  if (!myMark) throw new Error('This player is not part of the game')
  const opponentMark = myMark === 'X' ? 'O' : 'X'
  const me = myMark === 'X' ? record.players.X : record.players.O
  if (!me) throw new Error('This player is not part of the game')
  const opponent = record.players[opponentMark]
  const projectMark = (mark: PlayerMark | null): PlayerMark | null => {
    if (mark === null) return null
    return mark === myMark ? 'X' : 'O'
  }
  const status =
    record.winner || record.isDraw
      ? 'finished'
      : !opponent
        ? record.invitePending
          ? 'invited'
          : 'new'
        : record.currentTurn === myMark
          ? 'my-turn'
          : 'their-turn'

  return {
    id: record.id,
    title: record.title,
    status,
    board: record.board.map(projectMark),
    me: { ...me, mark: 'X' },
    opponent: opponent ? { ...opponent, mark: 'O' } : null,
    winner: projectMark(record.winner),
    isDraw: record.isDraw,
    updatedAt: record.updatedAt
  }
}

function markForPlayer(record: TicTacToeGameRecord, playerId: string): PlayerMark | null {
  if (record.players.X.id === playerId) return 'X'
  if (record.players.O?.id === playerId) return 'O'
  return null
}

function findWinner(board: Array<PlayerMark | null>): PlayerMark | null {
  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }
  return null
}

function createPlayer(id: string, name: string, mark?: PlayerMark): Player {
  const trimmedName = name.trim() || 'Player'
  const initials = trimmedName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  let hash = 0
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  const colors = ['#7c5cff', '#ff7a90', '#35b6a4', '#f2ad50']
  return {
    id,
    name: trimmedName,
    initial: initials || 'P',
    color: colors[hash % colors.length],
    mark
  }
}
