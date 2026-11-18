import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { createInMemoryTicTacToeApi } from '@hello-pear/tic-tac-toe-api/testing'
import TicTacToeApp from '../src/index'

it('renders the game app shell and navigation', () => {
  const markup = renderToStaticMarkup(
    createElement(TicTacToeApp, { api: createInMemoryTicTacToeApi() })
  )

  expect(markup).toContain('Good Game')
  expect(markup).toContain('Worker ping')
  expect(markup).toContain('Updates test')
})
