export type PlayerMark = 'X' | 'O'

export type GameStatus = 'new' | 'invited' | 'my-turn' | 'their-turn' | 'finished'

export interface Player {
  id: string
  name: string
  initial: string
  color: string
  mark?: PlayerMark
}

export interface TicTacToeGame {
  id: string
  title: string
  status: GameStatus
  board: Array<PlayerMark | null>
  me: Player
  opponent: Player | null
  winner: PlayerMark | null
  isDraw: boolean
  updatedAt: string
}

export interface TicTacToeGameRecord {
  version: 1
  id: string
  title: string
  board: Array<PlayerMark | null>
  players: { X: Player; O: Player | null }
  currentTurn: PlayerMark | null
  winner: PlayerMark | null
  isDraw: boolean
  invitePending: boolean
  updatedAt: string
}

export interface GameCatalogEntry {
  gameId: string
  noteId: string
}

export interface TicTacToeSharePayload {
  version: 1
  gameId: string
  noteId: string
  invite: string
}

export interface CreateGameInput {
  title?: string
}

export interface TicTacToeApi {
  list: () => Promise<TicTacToeGame[]>
  create: (input?: CreateGameInput) => Promise<TicTacToeGame>
  delete: (gameId: string) => Promise<void>
  makeMove: (gameId: string, index: number) => Promise<TicTacToeGame>
  shareGame: (gameId: string) => Promise<TicTacToeSharePayload>
  joinGame: (payload: TicTacToeSharePayload, playerName: string) => Promise<TicTacToeGame>
}
