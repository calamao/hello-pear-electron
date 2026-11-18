import { useCallback, useEffect, useState } from 'react'
import styled, { createGlobalStyle } from 'styled-components'

const mainWorker = '/workers/main.js'
const decoder = new TextDecoder('utf-8')

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
`

const Page = styled.main`
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #21c437 0%, #0e4f15 100%);
`

const Content = styled.section`
  text-align: center;
`

const Title = styled.h1`
  font-size: 48px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
`

const Button = styled.button<{ $hidden?: boolean }>`
  display: ${({ $hidden }) => ($hidden ? 'none' : 'inline-block')};
  margin: 10px;
  padding: 12px 24px;
  border: 2px solid white;
  border-radius: 8px;
  background: green;
  color: white;
  cursor: pointer;
  font-size: 18px;

  &:hover {
    background: greenyellow;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
`

const Message = styled.p`
  overflow-wrap: anywhere;
`

const ErrorMessage = styled(Message)`
  color: #ffe0e0;
`

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function isPong(message: unknown): message is { type: 'pong'; time: string, text?: string } {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === 'pong' &&
    'time' in message &&
    typeof message.time === 'string'
  )
}

export default function App() {
  const [version] = useState(() => window.bridge.pkg().version)
  const [title, setTitle] = useState(`v${version}`)
  const [pong, setPong] = useState('')
  const [error, setError] = useState('')
  const [updateReady, setUpdateReady] = useState(false)
  const [applyingUpdate, setApplyingUpdate] = useState(false)

  const writeWorkerIPC = useCallback((message: string) => {
    void window.bridge.writeWorkerIPC(mainWorker, message).catch((err: unknown) => {
      setError(`Worker IPC failed: ${errorMessage(err)}`)
    })
  }, [])

  useEffect(() => {
    let sentHello = false

    const offWorkerStdout = window.bridge.onWorkerStdout(mainWorker, (data) => {
      console.log('worker stdout', '[', mainWorker, ']:', decoder.decode(data))
    })

    const offWorkerStderr = window.bridge.onWorkerStderr(mainWorker, (data) => {
      console.error('worker stderr', '[', mainWorker, ']:', decoder.decode(data))
    })

    const offWorkerIPC = window.bridge.onWorkerIPC(mainWorker, (data) => {
      const message = decoder.decode(data)
      console.log('worker ipc', '[', mainWorker, ']:', message)

      let parsed: unknown = null
      try {
        parsed = JSON.parse(message) as unknown
      } catch {
        if (message === 'updating') setTitle('UPDATING...')
        if (message === 'updated') {
          setTitle('Update ready!')
          setUpdateReady(true)
        }
      }

      if (isPong(parsed)) setPong(`Worker time: ${parsed.time}, text: ${parsed.text ?? ''}`)

      if (!sentHello) {
        sentHello = true
        writeWorkerIPC('Hello from renderer')
      }
    })

    const offWorkerExit = window.bridge.onWorkerExit(mainWorker, (code) => {
      console.log('Worker exited with code', code)
    })

    void window.bridge.startWorker(mainWorker).catch((err: unknown) => {
      setError(`Worker failed to start: ${errorMessage(err)}`)
    })

    return () => {
      offWorkerStdout()
      offWorkerStderr()
      offWorkerIPC()
      offWorkerExit()
    }
  }, [writeWorkerIPC])

  const pingWorker = () => {
    setError('')
    setPong('Waiting for reply...')
    writeWorkerIPC(JSON.stringify({ type: 'ping' }))
  }

  const applyUpdate = async () => {
    setApplyingUpdate(true)
    setError('')

    try {
      await window.bridge.applyUpdate()
      await window.bridge.appAfterUpdate()
    } catch (err) {
      setError(`Update failed: ${errorMessage(err)}`)
      setApplyingUpdate(false)
    }
  }

  return (
    <>
      <GlobalStyle />
      <Page>
        <Content>
          <Title>{title}</Title>
          <Button $hidden={!updateReady} disabled={applyingUpdate} onClick={applyUpdate}>
            {applyingUpdate ? 'Updating...' : 'Apply update'}
          </Button>
          <Button onClick={pingWorker}>Ping worker</Button>
          {pong && <Message>{pong}</Message>}
          {error && <ErrorMessage role='alert'>{error}</ErrorMessage>}
        </Content>
      </Page>
    </>
  )
}
