declare module 'claude-code' {
  interface PluginState {
    'meta-status': {
      rows: { kind: string; age: string; who: string; text: string; key: string }[]
      head: string
      summary: string
      prompts: string[]
      hidden: boolean
      agents: { who: string; name: string; desc: string; age: string; lane: string; id?: string; now?: string; detail?: string[] }[]
    }
  }
}
