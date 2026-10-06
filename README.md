# status — Claude Code 상태줄 + 열린 일 장부

Claude Code 입력창 아래에 지금 작업 중인 repo 상태와 끝내지 못한 일을 한 줄로 보여 줍니다.

```
⚠ status: workspace · main ↑2 ✎3 · 열린 일 메모 2 · 미커밋 1
```

| 표시 | 뜻 |
|---|---|
| `workspace · main` | origin repo 이름 · 브랜치 (repo 밖이면 폴더) |
| `↑2` | push 안 한 커밋 수 (0이면 숨김) |
| `✎3` | 수정·새 파일 수 (0이면 숨김) |
| `열린 일 …` | 끝내지 못한 일, 종류별 개수 |

## 설치

Claude Code 에서:

```
/plugin install status --marketplace hjsh200219/claude-status
```

`y` 로 마켓플레이스를 추가하고 범위는 user 를 고릅니다. 이미 떠 있는 세션은 `/reload-plugins` 한 번.

## 열린 일 장부

세션이 끝날 때 자동으로 남고, git 으로 확인되면 스스로 닫힙니다.

| 종류 | 언제 생기나 | 언제 닫히나 |
|---|---|---|
| 미커밋 | 세션이 Edit·Write 로 고친 파일이 커밋 안 됨 | 그 파일들이 커밋되면 |
| 미푸시 | 세션이 고친 repo 에 push 안 한 커밋 | push 하면 |
| 변경 | 한 세션이 repo 2개 이상을 고침 (묶음 하나로) | 모든 repo 가 커밋·push 되면 |
| 메모 | `/open-loops add` 또는 모델이 `open_loop_add` 로 적음 | `/open-loops close` · `open_loop_close` |
| 추정 | 최종 응답에 「확인하지 못했다」류 문장 (목록엔 숨김) | 다음 Stop 에 그 문장이 없으면 |

- **세션 시작**: 다른 세션이 남긴 열린 일을 최대 5줄 모델 문맥에 넣습니다(15분 안에 활동한 세션 것은 진행 중이라 뺌).
- **동시 편집 경고**: 다른 세션이 15분 안에 고친 파일을 고치려 하면 모델에게 알립니다.

명령:

```
/open-loops                       목록
/open-loops add deploy-check 내일 09시 배포 결과 확인
/open-loops close deploy-check
/where                            상태줄 다시 읽기
```

장부 위치: `~/.claude/open-loops/` (항목 하나 = 파일 하나라 세션 여러 개가 동시에 써도 안전).

## 한계

- `sed`·스크립트로 고친 파일은 편집 기록에 안 남습니다(Edit·Write·MultiEdit·NotebookEdit 만).
- 상태줄은 Claude 모바일 앱(Remote Control)에는 보이지 않습니다.
- 상태줄 앞 `⚠ status:` 표시는 Claude Code 가 그리는 플러그인 이름표라 끌 수 없습니다.
