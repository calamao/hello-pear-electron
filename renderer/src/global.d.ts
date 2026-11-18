declare global {
  interface Window {
    bridge: {
      pkg(): { version: string }
      applyUpdate(): Promise<void>
      appAfterUpdate(): Promise<void>
      startWorker(specifier: string): Promise<boolean>
      onWorkerStdout(specifier: string, listener: (data: Uint8Array) => void): () => void
      onWorkerStderr(specifier: string, listener: (data: Uint8Array) => void): () => void
      onWorkerIPC(specifier: string, listener: (data: Uint8Array) => void): () => void
      onWorkerExit(specifier: string, listener: (code: number) => void): () => void
      writeWorkerIPC(specifier: string, data: string): Promise<boolean>
    }
  }
}

export {}
