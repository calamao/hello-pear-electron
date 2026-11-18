import { expect, it } from 'vitest'
import { helloWorld } from '../src/index'

it('returns the UI package greeting', () => {
  expect(helloWorld()).toBe('Hello from the UI hello-world package!')
})
