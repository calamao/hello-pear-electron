declare const Bare: {
  argv: string[]
  IPC: unknown
}

declare module 'autopass' {
  class Autopass {
    constructor(store: object)
    static pair(store: object, invite: string): AutopassPairer
    ready(): Promise<void>
    close(): Promise<void>
    add(key: string, value: string): Promise<void>
    get(key: string): Promise<{ value: string } | null>
    list(): { toArray(): Promise<Array<{ key: string; value: string }>> }
    remove(key: string): Promise<void>
    createInvite(options: { readOnly: boolean }): Promise<string>
  }

  class AutopassPairer {
    finished(): Promise<Autopass>
    close(): Promise<void>
  }

  export = Autopass
}

declare module 'pear-runtime' {
  class PearRuntime {
    constructor(options: Record<string, unknown>)
    ready(): Promise<void>
    updater: {
      drive: { core: { discoveryKey: unknown } }
      on(event: 'error', listener: (error: Error) => void): void
      on(event: 'update-scheduled', listener: (delay: number) => void): void
      on(event: 'updating' | 'updated', listener: () => void): void
      ready(): Promise<void>
      applyUpdate(): Promise<void>
    }
    on(event: 'minver-required', listener: () => void): void
    close(): Promise<void>
  }
  export = PearRuntime
}

declare module 'hyperswarm' {
  class Hyperswarm {
    on(event: 'connection', listener: (connection: unknown) => void): this
    join(topic: unknown, options: { client: boolean; server: boolean }): unknown
    destroy(): Promise<void>
  }
  export = Hyperswarm
}

declare module 'corestore' {
  class Corestore {
    constructor(directory: string)
    replicate(connection: unknown): unknown
    close(): Promise<void>
  }
  export = Corestore
}

declare module 'graceful-goodbye' {
  function goodbye(handler: () => void | Promise<void>): void
  export = goodbye
}

declare module 'framed-stream' {
  class FramedStream {
    constructor(stream: unknown)
    on(event: 'data', listener: (data: { toString(): string }) => void): this
    write(data: string): boolean
  }
  export = FramedStream
}

declare module 'bare-storage' {
  const dir: { persistent(): string }
  export = dir
}

declare module 'which-runtime' {
  export const isBareKit: boolean
}
