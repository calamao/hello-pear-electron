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

export interface CreateGameInput {
  title?: string
  opponentId?: string
}

export interface TicTacToeApi {
  list: () => Promise<TicTacToeGame[]>
  create: (input?: CreateGameInput) => Promise<TicTacToeGame>
  delete: (gameId: string) => Promise<void>
  invite: (gameId: string, friendName: string) => Promise<TicTacToeGame>
  makeMove: (gameId: string, index: number) => Promise<TicTacToeGame>
}

const me: Player = {
  id: 'me',
  name: 'You',
  initial: 'YO',
  color: '#7c5cff',
  mark: 'X'
}

const friends: Player[] = [
  { id: 'maya', name: 'Maya Chen', initial: 'MC', color: '#ff7a90' },
  { id: 'leo', name: 'Leo Martins', initial: 'LM', color: '#35b6a4' },
  { id: 'ava', name: 'Ava Singh', initial: 'AS', color: '#f2ad50' }
]

const initialGames: TicTacToeGame[] = [
  {
    id: 'game-1',
    title: 'Sunday match',
    status: 'my-turn',
    board: ['X', null, 'O', null, 'X', null, null, null, null],
    me,
    opponent: { ...friends[0], mark: 'O' },
    winner: null,
    isDraw: false,
    updatedAt: 'Just now'
  },
  {
    id: 'game-2',
    title: 'Coffee break',
    status: 'their-turn',
    board: ['X', 'O', null, null, 'X', null, null, null, null],
    me,
    opponent: { ...friends[1], mark: 'O' },
    winner: null,
    isDraw: false,
    updatedAt: '12 min ago'
  },
  {
    id: 'game-3',
    title: 'Quick rematch',
    status: 'invited',
    board: Array<PlayerMark | null>(9).fill(null),
    me,
    opponent: { ...friends[2], mark: 'O' },
    winner: null,
    isDraw: false,
    updatedAt: '1 hr ago'
  },
  {
    id: 'game-4',
    title: 'Morning game',
    status: 'finished',
    board: ['X', 'O', 'X', 'X', 'O', null, 'X', null, 'O'],
    me,
    opponent: { ...friends[0], mark: 'O' },
    winner: 'X',
    isDraw: false,
    updatedAt: 'Yesterday'
  },
  {
    id: 'game-5',
    title: 'Open challenge',
    status: 'new',
    board: Array<PlayerMark | null>(9).fill(null),
    me,
    opponent: null,
    winner: null,
    isDraw: false,
    updatedAt: 'Yesterday'
  },
  {
    id: 'game-6',
    title: 'Evening draw',
    status: 'finished',
    board: ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'],
    me,
    opponent: { ...friends[1], mark: 'O' },
    winner: null,
    isDraw: true,
    updatedAt: '2 days ago'
  }
]

function cloneGame(game: TicTacToeGame): TicTacToeGame {
  return {
    ...game,
    board: [...game.board],
    me: { ...game.me },
    opponent: game.opponent ? { ...game.opponent } : null
  }
}

function findWinner(board: Array<PlayerMark | null>): PlayerMark | null {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ]

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }

  return null
}

export function createInMemoryTicTacToeApi(): TicTacToeApi {
  const games = initialGames.map(cloneGame)
  let nextId = 7

  return {
    async list() {
      return games.map(cloneGame)
    },
    async create(input = {}) {
      const friend = friends[(nextId - 7) % friends.length]
      const opponent = input.opponentId
        ? (friends.find((item) => item.id === input.opponentId) ?? friend)
        : null
      const game: TicTacToeGame = {
        id: `game-${nextId++}`,
        title: input.title?.trim() || `New match ${nextId - 1}`,
        status: opponent ? 'invited' : 'new',
        board: Array<PlayerMark | null>(9).fill(null),
        me,
        opponent: opponent ? { ...opponent, mark: 'O' } : null,
        winner: null,
        isDraw: false,
        updatedAt: 'Just now'
      }
      games.unshift(game)
      return cloneGame(game)
    },
    async delete(gameId) {
      const index = games.findIndex((game) => game.id === gameId)
      if (index !== -1) games.splice(index, 1)
    },
    async invite(gameId, friendName) {
      const game = games.find((item) => item.id === gameId)
      if (!game) throw new Error('Game not found')

      const opponent: Player = {
        id: `friend-${friendName.toLowerCase().replaceAll(' ', '-')}`,
        name: friendName.trim() || 'New friend',
        initial:
          friendName
            .trim()
            .split(/\s+/)
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() || 'NF',
        color: '#35b6a4',
        mark: 'O'
      }
      game.opponent = opponent
      game.status = 'invited'
      game.updatedAt = 'Just now'
      return cloneGame(game)
    },
    async makeMove(gameId, index) {
      const game = games.find((item) => item.id === gameId)
      if (!game) throw new Error('Game not found')
      if (game.status === 'finished') throw new Error('This game is already finished')
      if (game.status === 'their-turn') throw new Error("It's not your turn")
      if (index < 0 || index > 8 || game.board[index]) throw new Error('That square is unavailable')

      game.board[index] = 'X'
      game.winner = findWinner(game.board)
      game.isDraw = !game.winner && game.board.every(Boolean)

      if (game.winner || game.isDraw) {
        game.status = 'finished'
      } else {
        const move = game.board.findIndex((square) => square === null)
        if (move !== -1) game.board[move] = 'O'
        game.winner = findWinner(game.board)
        game.isDraw = !game.winner && game.board.every(Boolean)
        game.status = game.winner || game.isDraw ? 'finished' : 'my-turn'
      }

      game.updatedAt = 'Just now'
      return cloneGame(game)
    }
  }
}
