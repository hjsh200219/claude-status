# meta-status — Claude Code 입력창 위 repo 줄 + 열린 일 장부

Claude Code 입력창 위에 지금 작업 중인 repo 상태와 끝내지 못한 일을 한 줄로 보여 줍니다.

```
workspace · main ↑2 ✎3 · 세션 요약      [에이전트 2] [열린 일 3]
```

| 표시 | 뜻 |
|---|---|
| `workspace · main` | origin repo 이름 · 브랜치 (repo 밖이면 폴더) |
| `↑2` | push 안 한 커밋 수 (0이면 숨김) |
| `✎3` | 수정·새 파일 수 (0이면 숨김) |
| `[열린 일 3]` | 끝내지 못한 일 개수 버튼 — 누르거나 `/loops` 로 목록 패널 열기·닫기 |
| `[에이전트 2]` | 지금 도는 에이전트 버튼 — 누르면 계정별(Claude 계정·edb·codex) 목록, 경과 시간·레인 |
| `· 세션 요약` | oh-my-claudecode 가 만든 세션 요약(OMC `sessionSummary` 를 켠 PC 만) |

## 설치

Claude Code 에서:

```
/plugin install meta-status --marketplace hjsh200219/meta-status
```

`y` 로 마켓플레이스를 추가하고 범위는 user 를 고릅니다. 이미 떠 있는 세션은 `/reload-plugins` 한 번.

## 열린 일 장부

세션이 끝날 때 자동으로 남고, git 으로 확인되면 스스로 닫힙니다.

| 종류 | 언제 생기나 | 언제 닫히나 |
|---|---|---|
| 미커밋 | 세션이 Edit·Write 로 고친 파일이 커밋 안 됨 | 그 파일들이 커밋되면 |
| 미푸시 | 세션이 고친 repo 에 push 안 한 커밋 | push 하면 |
| 변경 | 한 세션이 repo 2개 이상을 고침 (묶음 하나로) | 모든 repo 가 커밋·push 되면 |
| 메모 | `/loops add` 또는 모델이 `open_loop_add` 로 적음 | `/loops close` · `open_loop_close` |
| 추정 | 최종 응답에 「확인하지 못했다」류 문장 (목록엔 숨김) | 다음 Stop 에 그 문장이 없으면 |

- **세션 시작**: 다른 세션이 남긴 열린 일을 최대 5줄 모델 문맥에 넣습니다(15분 안에 활동한 세션 것은 진행 중이라 뺌).
- **동시 편집 경고**: 다른 세션이 15분 안에 고친 파일을 고치려 하면 모델에게 알립니다.

명령:

```
/loops                       열린 일 패널 열기·닫기(종류별 · 요약 + 나이·누가·키)
/loops add deploy-check 내일 09시 배포 결과 확인
/loops close deploy-check
/where                            입력창 위 줄 다시 읽기
```

장부 위치: `~/.claude/open-loops/` (항목 하나 = 파일 하나라 세션 여러 개가 동시에 써도 안전).

## 에이전트

- 이 세션의 서브에이전트(Agent 도구) — 계정은 HUD 가 남긴 레인 계정, 없으면 `claude`
- 이 Mac 에서 도는 위임: `edb-p`(edb) · `delegate` · `codex exec` · 그 밖의 `claude -p`
- 빼는 것: oh-my-claudecode HUD 요약이 띄우는 `claude -p`, ChatGPT 앱 등 상주 Codex, 위임 안에서 다시 뜬 것
- 도구 호출·턴이 끝날 때마다 다시 읽습니다. 명령줄의 작업 원문은 화면에만 60자로 보이고 모델 문맥엔 넣지 않습니다.

## 한계

- 설문이 떠 있는 동안은 입력창 위 줄이 비켜 줍니다. 터미널 폭이 110칸 미만이면 패널이 옆이 아니라 대화 안에 열립니다. 「누가」 칸은 tmux 세션 이름, 없으면 세션 id 앞 8자리.

- `sed`·스크립트로 고친 파일은 편집 기록에 안 남습니다(Edit·Write·MultiEdit·NotebookEdit 만).
- 입력창 위 줄은 Claude 모바일 앱(Remote Control)에는 보이지 않습니다.
