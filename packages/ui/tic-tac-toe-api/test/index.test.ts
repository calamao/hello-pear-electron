import { expect, it } from 'vitest'
import { createInMemoryTicTacToeApi } from '../src/index'

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
