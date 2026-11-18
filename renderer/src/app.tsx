import { useState } from 'react'
import { createGlobalStyle } from 'styled-components'
import { createTicTacToeApi, createLocalGameCatalog } from '@hello-pear/tic-tac-toe-api'
import TicTacToeApp from '@hello-pear/ui-tic-tac-toe'
import { createNotesClient } from '@hello-pear/ui-notes'
import { WorkerPingPongTest, WorkerUpdatesTest } from './worker-tools'
import { NotesPanel } from './notes-panel'

export type AppView = 'games' | 'worker-ping' | 'updates-test' | 'notes'

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
  const [gameApi] = useState(() =>
    createTicTacToeApi(
      (vaultId) => createNotesClient(window.bridge, { vaultId }),
      createLocalGameCatalog()
    )
  )

  return (
    <>
      <GlobalStyle />
      <TicTacToeApp
        api={gameApi}
        activeView={activeView}
        onNavigate={setActiveView}
        workerPingTest={<WorkerPingPongTest active={activeView === 'worker-ping'} />}
        workerUpdatesTest={<WorkerUpdatesTest />}
        notesView={<NotesPanel active={activeView === 'notes'} />}
      />
    </>
  )
}
