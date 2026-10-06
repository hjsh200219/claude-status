declare module 'claude-code' {
  interface PluginState {
    status: { rows: { kind: string; age: string; who: string; text: string; key: string }[] }
  }
}
