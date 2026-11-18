import { expect, it } from 'vitest'
import { helloWorld } from '../src/index'

it('returns the worker package greeting', () => {
  expect(helloWorld()).toBe('Hello from the worker hello-world package!')
})
