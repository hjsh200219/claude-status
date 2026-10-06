import { test, expect } from 'claude-code/testing'
import { editWarning } from './register'

const out = (stdout: string, exitCode = 0) => ({ exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false })
const CFG = '/h/.claude'
const DIR = `${CFG}/open-loops`

// 메모리 위 가짜 PC: 파일·git 상태·시계
function world(opts: { legacy?: boolean; inRepo?: boolean } = {}) {
  const files = new Map<string, string>()
  const mtimes = new Map<string, number>()
  const w = { files, mtimes, dirty: [' M a.ts', '?? b.ts', ' M c.ts'], ahead: 2, clock: 1_000_000_000_000 }
  function run(argv: readonly string[]) {
    const cmd = argv.join(' ')
    // 모든 git 호출은 남의 repo 설정(fsmonitor·훅)을 끄고 돈다
    if (argv[0] === 'git' && !cmd.includes('core.fsmonitor=false')) throw new Error(`안전 옵션 없는 git: ${cmd}`)
    if (cmd.includes('CLAUDE_CONFIG_DIR')) return out(`${CFG}\n/h`)
    if (cmd.includes('tmux')) return out('DevOps1\n')
    if (argv[0] === 'python3' && argv.includes('list')) return out('[{"kind":"note"},{"kind":"note"},{"kind":"watch"}]')
    if (opts.inRepo === false) return out('', 128)
    if (cmd.includes('branch --show-current')) return out('main\n')
    if (cmd.includes('remote get-url')) return out('git@github.com:me/workspace.git\n')
    if (cmd.includes('--show-toplevel')) return out('/h/workspace\n')
    if (cmd.includes('rev-list')) return out(`${w.ahead}\n`)
    if (cmd.includes('status --porcelain')) return out(w.dirty.map(l => l + '\n').join(''))
    return out('', 1)
  }
  return {
    w,
    install(on: any) {
      on('session.start', ($: any, e: any) => ({ cwd: e.cwd }))
      for (const ev of ['PostToolUse', 'Stop', 'SessionStart', 'PreToolUse']) on(`classic.${ev}`, () => ({}))
      on('command.register', () => ({ value: undefined }))
      on('tool.register', () => ({ value: { tool: 'x' } }))
      on('clock.now', () => ({ value: w.clock }))
      on('session.id', () => ({ value: 'me-session' }))
      on('session.cwd', () => ({ value: '/h/workspace' }))
      on('process.run', ($: any, e: any) => ({ value: run(e.argv) }))
      on('fs.exists', ($: any, e: any) => ({ value: opts.legacy ? true : files.has(e.path) }))
      on('fs.read', ($: any, e: any) => files.has(e.path) ? { value: files.get(e.path) } : { deny: 'ENOENT' })
      on('fs.write', ($: any, e: any) => { files.set(e.path, e.text); return { value: undefined } })
      on('fs.stat', ($: any, e: any) => mtimes.has(e.path) ? { value: { mtimeMs: mtimes.get(e.path) } } : { deny: 'ENOENT' })
      on('fs.list', ($: any, e: any) => {
        const pre = e.path.endsWith('/') ? e.path : e.path + '/'
        const names = [...files.keys()].filter(k => k.startsWith(pre) && !k.slice(pre.length).includes('/'))
        return { value: names.map(k => ({ name: k.slice(pre.length), kind: 'file', size: 1, mtimeMs: 0, isLink: false })) }
      })
    },
    items: () => [...files].filter(([k]) => k.startsWith(`${DIR}/items/`)).map(([, v]) => JSON.parse(v)),
  }
}

async function status($: any, on: any) {
  let saved: string | undefined
  on('ui.status', ($: any, e: any) => { saved = e.text; return { value: undefined } })
  await $.session.start({ cwd: '/h/workspace', surface: 'terminal', isInteractive: true })
  return () => saved
}

test('상태줄: repo·브랜치·↑✎·열린 일 전체 개수', async ($, on) => {
  const g = world()
  g.install(on)
  g.w.files.set(`${DIR}/items/n.json`, JSON.stringify({ key: 'n', kind: 'note', ts: 1, text: '배포 뒤 확인' }))
  const shown = await status($, on)
  expect(shown()).toBe('workspace · main ↑2 ✎3 · 열린 일 1')
})

test('repo 밖: 폴더만', async ($, on) => {
  const g = world({ inRepo: false })
  g.install(on)
  let saved: string | undefined
  on('ui.status', ($: any, e: any) => { saved = e.text; return { value: undefined } })
  await $.session.start({ cwd: '/tmp/x', surface: 'terminal', isInteractive: true })
  expect(saved).toBe('/tmp/x')
})

test('전환 모드: 원본 스크립트 장부를 읽는다', async ($, on) => {
  const g = world({ legacy: true })
  g.install(on)
  const shown = await status($, on)
  expect(shown()).toBe('workspace · main ↑2 ✎3 · 열린 일 3')
})

test('Stop 이 미커밋·미푸시를 남기고, git 이 깨끗해지면 스스로 닫힌다', async ($, on) => {
  const g = world()
  g.install(on)
  const shown = await status($, on)
  // 이 세션이 파일 하나를 고쳤다
  await $.classic.PostToolUse({ session_id: 's1', transcript_path: '/t/s1.jsonl', tool_name: 'Edit', tool_input: { file_path: '/h/workspace/a.ts' }, tool_response: {}, tool_use_id: 'u1' } as any)
  await $.classic.Stop({ session_id: 's1', stop_hook_active: false, last_assistant_message: '배포했습니다. 운영 화면은 확인하지 못했습니다.' } as any)
  const kinds = g.items().map(i => i.kind).sort()
  expect(kinds).toEqual(['uncommitted', 'unpushed', '추정'])
  await $.command.run({ command: 'where', args: '' } as any).catch(() => undefined)
  // 커밋·push 를 마쳤다
  g.w.dirty = []
  g.w.ahead = 0
  await $.session.start({ cwd: '/h/workspace', surface: 'terminal', isInteractive: true })
  expect(shown()).toBe('workspace · main')
  const open = g.items().filter(i => !i.closed).map(i => i.kind)
  expect(open).toEqual(['추정']) // 추정은 사람이 닫는다(목록·상태줄엔 안 보임)
})

test('다른 세션이 15분 안에 고친 파일이면 경고를 문맥에 넣는다', async ($, on) => {
  const g = world()
  g.install(on)
  g.w.files.set(`${DIR}/edits/other.json`, JSON.stringify({ transcript: '/t/other.jsonl', lane: 'DevOps2', paths: { '/h/workspace/a.ts': g.w.clock / 1000 - 120 } }))
  g.w.mtimes.set('/t/other.jsonl', g.w.clock - 60_000)
  // 판정 함수에 가짜 PC 를 직접 물린다(테스트의 $ 엔 clock 이 없다)
  const fake = {
    clock: { now: async () => g.w.clock },
    fs: {
      list: async (d: string) => [...g.w.files.keys()].filter(k => k.startsWith(d + '/')).map(k => ({ name: k.slice(d.length + 1) })),
      read: async (f: string) => g.w.files.get(f) ?? Promise.reject(new Error('ENOENT')),
      stat: async (f: string) => ({ mtimeMs: g.w.mtimes.get(f) }),
    },
  }
  const msg = await editWarning(fake as any, { dir: DIR }, 'me', '/h/workspace/a.ts')
  expect(await editWarning(fake as any, { dir: DIR }, 'other', '/h/workspace/a.ts')).toBeUndefined() // 자기 편집엔 경고 없음
  const ctx = [msg ?? '']
  expect(ctx.join('\n')).toContain('[동시 편집] a.ts 는 DevOps2 세션(other)이 2분 전에 고쳤습니다 — 그 세션은 지금도 활동 중입니다')
})

test('open_loop_add 도구로 적고 open_loop_close 로 닫는다', async ($, on) => {
  const g = world()
  g.install(on)
  await status($, on)
  await $.tool.call({ tool: 'mcp__status__open_loop_add', input: { key: 'deploy-check', text: '내일 09시 배포 결과 확인' } } as any)
  expect(g.items()).toMatchObject([{ key: 'deploy-check', kind: 'note', lane: 'DevOps1', text: '내일 09시 배포 결과 확인' }])
  await $.tool.call({ tool: 'mcp__status__open_loop_close', input: { key: 'deploy-check' } } as any)
  expect(g.items()[0].closed).toBe(true)
})

test('/opens 는 옆 패널에 종류·누가·내용 목록을 연다(tmux 없으면 세션 id)', async ($, on) => {
  const g = world()
  g.install(on)
  g.w.files.set(`${DIR}/items/a.json`, JSON.stringify({ key: 'a', kind: 'note', ts: g.w.clock / 1000 - 7200, session: 'abcdef1234', text: '배포 뒤 확인' }))
  g.w.files.set(`${DIR}/items/b.json`, JSON.stringify({ key: 'b', kind: 'watch', ts: g.w.clock / 1000 - 60, lane: 'DevOps2', text: '알림 확인' }))
  let saved: unknown = []
  let version = 0
  on('state.get', () => ({ value: { value: saved, version } }))
  on('state.set', ($: any, e: any) => { saved = e.value; version += 1; return { value: { isSet: true, version } } })
  let opened: any
  on('ui.open', ($: any, e: any) => { opened = e; return { value: { isPlaced: true } } })
  await status($, on)
  const r: any = await $.command.run({ command: 'opens', args: '' } as any)
  expect(opened).toMatchObject({ id: 'open-loops', title: '열린 일 2' })
  expect(r.text).toBe('열린 일 2건 — 옆 패널')
  const list = g.items().length // 장부는 그대로
  expect(list).toBe(2)
  expect(saved).toEqual(['[메모] 2시간 전 · 세션 abcdef12 · 배포 뒤 확인   (a)', '[확인 대기] 1분 전 · DevOps2 · 알림 확인   (b)'])
})
