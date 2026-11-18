const { spawn } = require('node:child_process')

async function main() {
  if (!process.env.npm_execpath) {
    throw new Error('Run the development launcher with `npm start`')
  }

  const { createServer } = await import('vite')
  const server = await createServer()
  await server.listen()

  const devServerUrl = server.resolvedUrls.local[0]
  const npmArgs = [
    process.env.npm_execpath,
    'run',
    'start:electron',
    '--',
    ...process.argv.slice(2)
  ]
  const electronForge = spawn(process.execPath, npmArgs, {
    env: { ...process.env, PEAR_DEV_SERVER_URL: devServerUrl },
    stdio: 'inherit'
  })

  let closing
  const closeServer = (exitCode) => {
    if (!closing) {
      closing = server.close().then(() => {
        process.exitCode = exitCode
      })
    }
    return closing
  }

  electronForge.once('error', (err) => {
    console.error('Failed to start Electron Forge:', err)
    void closeServer(1)
  })

  electronForge.once('exit', (code, signal) => {
    void closeServer(code ?? (signal ? 1 : 0))
  })

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => electronForge.kill(signal))
  }
}

main().catch((err) => {
  console.error('Failed to start development server:', err)
  process.exitCode = 1
})
