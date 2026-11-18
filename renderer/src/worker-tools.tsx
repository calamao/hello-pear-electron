import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'

const mainWorker = '/workers/main.js'
const decoder = new TextDecoder('utf-8')

const Panel = styled.section`
  max-width: 760px;
  margin: 0 auto;
  border: 1px solid #dfded8;
  border-radius: 20px;
  background: #fff;
  padding: clamp(20px, 4vw, 36px);
  box-shadow: 0 12px 30px rgba(32, 32, 29, 0.05);
`

const Eyebrow = styled.p`
  margin: 0 0 7px;
  color: #77766f;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
`

const Title = styled.h1`
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(30px, 5vw, 42px);
  letter-spacing: -0.04em;
`

const Description = styled.p`
  color: #77766f;
  line-height: 1.55;
`

const Status = styled.p`
  min-height: 22px;
  color: #5a5953;
  font-size: 14px;
  overflow-wrap: anywhere;
`

const ErrorMessage = styled(Status)`
  color: #a52c3b;
`

const Button = styled.button`
  min-height: 44px;
  border: 0;
  border-radius: 11px;
  background: #20201d;
  color: #fff;
  padding: 0 16px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #393936;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
`

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function isPong(message: unknown): message is { type: 'pong'; time: string; text?: string } {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    message.type === 'pong' &&
    'time' in message &&
    typeof message.time === 'string'
  )
}

export function WorkerUpdatesTest() {
  const [version] = useState(() => window.bridge.pkg().version)
  const [title, setTitle] = useState(`v${version}`)
  const [status, setStatus] = useState('Starting worker...')
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

      if (message === 'updating') {
        setTitle('UPDATING...')
        setStatus('Downloading an update...')
      } else if (message === 'updated') {
        setTitle('Update ready!')
        setStatus('An update is ready to apply.')
        setUpdateReady(true)
        setError('')
      } else if (message.startsWith('updater-error ')) {
        setError(message.slice('updater-error '.length))
      } else if (message.startsWith('pear:updateFailed ')) {
        setError(message.slice('pear:updateFailed '.length))
        setStatus('Update could not be applied.')
        setApplyingUpdate(false)
      } else if (message === 'update-scheduled') {
        setStatus('An update check is scheduled.')
      } else if (message.startsWith('update-scheduled ')) {
        setStatus(`Next update check in ${message.slice('update-scheduled '.length)} ms.`)
      } else if (message === 'minver-required') {
        setStatus('A newer minimum app version is required.')
      }

      if (!sentHello) {
        sentHello = true
        writeWorkerIPC('Hello from renderer')
      }
    })

    const offWorkerExit = window.bridge.onWorkerExit(mainWorker, (code) => {
      console.log('Worker exited with code', code)
      setStatus(`Worker exited with code ${code}.`)
    })

    void window.bridge
      .startWorker(mainWorker)
      .then((started) => {
        if (!started) {
          setError('Worker did not start.')
          setStatus('Worker failed to start.')
          return
        }
        setStatus('Worker started. Checking for updates...')
      })
      .catch((err: unknown) => {
        setError(`Worker failed to start: ${errorMessage(err)}`)
        setStatus('Worker failed to start.')
      })

    return () => {
      offWorkerStdout()
      offWorkerStderr()
      offWorkerIPC()
      offWorkerExit()
    }
  }, [writeWorkerIPC])

  const applyUpdate = async () => {
    setApplyingUpdate(true)
    setError('')
    setStatus('Applying update...')

    try {
      await window.bridge.applyUpdate()
      await window.bridge.appAfterUpdate()
    } catch (err) {
      setError(`Update failed: ${errorMessage(err)}`)
      setApplyingUpdate(false)
      setStatus('Update could not be applied.')
    }
  }

  return (
    <Panel>
      <Eyebrow>Worker test</Eyebrow>
      <Title>{title}</Title>
      <Description>
        OTA update events from the worker appear here. The worker starts with the app and stays
        active while you use the games screen.
      </Description>
      <Status role='status'>{status}</Status>
      {error && <ErrorMessage role='alert'>{error}</ErrorMessage>}
      {updateReady && (
        <Button disabled={applyingUpdate} onClick={() => void applyUpdate()}>
          {applyingUpdate ? 'Updating...' : 'Apply update'}
        </Button>
      )}
    </Panel>
  )
}

export function WorkerPingPongTest({ active }: { active: boolean }) {
  const [pong, setPong] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!active) return

    const offWorkerIPC = window.bridge.onWorkerIPC(mainWorker, (data) => {
      const message = decoder.decode(data)
      let parsed: unknown

      try {
        parsed = JSON.parse(message) as unknown
      } catch {
        return
      }

      if (isPong(parsed)) setPong(`Worker time: ${parsed.time}, text: ${parsed.text ?? ''}`)
    })

    return () => offWorkerIPC()
  }, [active])

  const pingWorker = () => {
    setError('')
    setPong('Waiting for reply...')
    void window.bridge
      .writeWorkerIPC(mainWorker, JSON.stringify({ type: 'ping' }))
      .catch((err: unknown) => {
        setError(`Worker IPC failed: ${errorMessage(err)}`)
        setPong('')
      })
  }

  return (
    <Panel>
      <Eyebrow>Worker test</Eyebrow>
      <Title>Ping / pong</Title>
      <Description>
        Send a ping over the worker IPC pipe and inspect the reply from Bare.
      </Description>
      <Button onClick={pingWorker}>Ping worker</Button>
      {pong && <Status role='status'>{pong}</Status>}
      {error && <ErrorMessage role='alert'>{error}</ErrorMessage>}
    </Panel>
  )
}
