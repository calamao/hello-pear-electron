import { useState } from 'react'
import { createGlobalStyle } from 'styled-components'
import TicTacToeApp from '@hello-pear/ui-tic-tac-toe'
import { WorkerPingPongTest, WorkerUpdatesTest } from './worker-tools'

export type AppView = 'games' | 'worker-ping' | 'updates-test'

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  html,
  body {
    min-width: 320px;
    min-height: 100%;
    margin: 0;
  }

  body,
  button,
  input {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  button,
  input {
    -webkit-font-smoothing: antialiased;
  }

  ::selection {
    background: #baff39;
  }
`

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('games')

  return (
    <>
      <GlobalStyle />
      <TicTacToeApp
        activeView={activeView}
        onNavigate={setActiveView}
        workerPingTest={<WorkerPingPongTest active={activeView === 'worker-ping'} />}
        workerUpdatesTest={<WorkerUpdatesTest />}
      />
    </>
  )
}
