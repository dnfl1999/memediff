# MemeDiff 진행 기록

기준일: **2026-11-11 (Asia/Seoul)**. 작업 대상은 이 MemeDiff 폴더와 **dnfl1999/memediff**뿐입니다.

## 구현 및 공개 완료

- 빈 폴더에서 독립 정적 앱 구현. 다른 프로젝트 소스·브랜치·작업 대기열 미사용.
- 공개 GitHub URL 검증, 기본 브랜치 7/30일 커밋·릴리스·연결된 기여자, UTC 활동 차트, 원본 증거 링크.
- Solana Base58 32바이트 주소 형식 검증 및 선택 기록. mint 존재·공식 연관성은 미검증으로 명시.
- 명시적 로컬 비교 기준 저장, 저장소·브랜치·토큰별 SHA 관측 차이, 기간 이동·불완전 수집 표시.
- JSON 전체 보고서 및 Canvas PNG 요약 내보내기 구현.
- 반응형 CSS, 입력 검증·안전한 링크·textContent·CSP, API 제한·빈 저장소·404·5xx·취소·타임아웃 처리.
- MIT LICENSE, README, 연구 문서, 테스트, GitHub Pages Actions 포함.
- 연결 프로필 및 Git credential의 `/user`에서 dnfl1999 확인. 공개 GitHub noreply 작성자 주소 사용.
- 공개 저장소: https://github.com/dnfl1999/memediff
- 공개 웹사이트: https://dnfl1999.github.io/memediff/
- 최초 앱 배포 커밋: `7a13f1c9887822b5e19c91cbbb9049e9c4f05468`
- 최초 Actions 검증·배포 성공: https://github.com/dnfl1999/memediff/actions/runs/42960043325

## 검증 결과

| 검사 | 실제 결과 |
| --- | --- |
| 자동 테스트 | 20/20 통과. 기존 17개에 릴리스 중복/정렬, 릴리스 409 오류, PNG 비동기 파일명 회귀 테스트 추가. PNG 테스트는 DOM 모형을 사용하며 실제 이미지 인코딩 검증이 아님 |
| `npm.cmd run build` | 성공 |
| JavaScript 구문 검사 | app.js / github.js 통과 |
| 실제 GitHub API 정상 데이터 | 기존 dnfl1999 인증을 메모리에서만 주입한 개발자 smoke 통과. 최초 커밋 1개, 연결 기여자 1명, 릴리스 0개, 수집 완료, 경고 없음 |
| 실제 데이터 비교·JSON | 동일 스냅샷 SHA 차이 0, JSON round-trip 통과 |
| 실제 비인증 API | 환경의 IP 요청 제한으로 403 관측. 정상 비인증 조회는 이 환경에서 미검증. 제품에는 인증값이 없으며 방문자 IP 한도가 적용됨 |
| 공개 HTTP | HTML/CSS/SVG/JS 총 6개 자산 모두 200, 로컬 dist와 바이트 일치 |
| 비밀키 점검 | 추적 대상 소스에서 일반 GitHub/OpenAI 키·개인키 패턴 미검출. 자격증명 파일·환경 파일·조사 캐시는 게시하지 않음 |
| 의존성·라이선스 | npm 및 런타임 외부 의존성 0개, MIT. CI는 공식 GitHub Actions 사용 |
| 브라우저 E2E | **미완료**. Windows 자동화가 현재 브라우저 URL을 안전하게 확인하지 못해 도구가 중단됨 |
| 실제 PNG 다운로드·모바일 화면 | **미검증**. 구현 및 구문 확인만 완료. HTTP/자동 테스트를 브라우저 검증으로 대체하여 주장하지 않음 |

초기 테스트의 Windows sandbox `spawn EPERM`은 권한을 조정해 해결했습니다. 테스트 자체의 페이지 판별 버그(`page=1`이 `per_page=100`에 잘못 일치)는 URLSearchParams로 고쳤고 전체 테스트를 다시 통과했습니다.

## Forks Wiki 조사

게시 후 읽기 전용 `/api/launch/plan?repo=dnfl1999%2Fmemediff`가 **HTTP 200 / ok:true**로 저장소와 소유자를 인식했습니다. 현재 사전검사상 런칭 가능입니다. 이름 MemeDiff / 티커 MEMEDIFF는 형식 규칙에 맞지만 글로벌 중복/예약은 확인되지 않았습니다.

현재 창작자 수수료 배분은 런처 50%·저장소 측 30%·Forks 20%. Jito tip 0.0005 SOL에 rent·네트워크 비용·선택 매수가 추가되므로 총액은 미확정입니다. 상세 근거와 보상 조건: [docs/FORKS_WIKI.md](docs/FORKS_WIKI.md).

**실행하지 않은 작업:** 로그인/2FA, 지갑 연결, 서명, 거래 build/submit, SOL 지출, 초기 매수, 토큰 발행. 웹서비스의 배포는 토큰 발행이 아닙니다.

## 남은 QA 및 재개 방법

### 두 번째 검증 시도

브라우저 세션을 초기화하고 공개 URL에 새 Chrome 탭을 열려고 했으나 `browser access host is unavailable`을 다시 확인했습니다. 네이티브 Chrome은 `window is minimized`로 접근에 실패했고 앱 실행을 통한 복구 후에도 같았습니다. 따라서 실제 브라우저 QA는 여전히 미완료입니다. 비인증 GitHub API도 동일한 403/리셋 시각을 반환했습니다.

독립적인 코드 재검토로 다음 문제를 수정했습니다: 페이지 간 중복 릴리스는 ID별로 한 번만 집계하고 발행 시각 최신순으로 정렬; 릴리스 API의 409 응답은 빈 데이터가 아닌 불완전 수집으로 처리; PNG 인코딩 완료 전에 재조회가 실패해도 원래 보고서 파일명으로 내보내기. 추가 회귀 테스트를 포함해 20개가 통과했습니다.

브라우저 자동화가 복구되면 다음을 공개 사이트에서 검증합니다. 이는 남은 QA이며 완료로 간주하지 않습니다.

1. `dnfl1999/memediff` 조회 → 7일/30일 전환 → 토큰 주소 기록.
2. 비교 기준 저장 → 재조회 → 같은 SHA의 추가 관측이 0인지 확인 → 기준 삭제.
3. JSON/PNG 다운로드 후 JSON 필드·실제 PNG 이미지 확인.
4. 잘못된 URL/토큰, 없는 저장소, 취소, 모바일 너비/키보드 탐색 확인.
5. GitHub API 403이 발생하면 응답의 reset 이후 다시 시도. 테스트 목적으로 과도한 요청을 보내지 않음.

```powershell
npm.cmd test
npm.cmd run build
node scripts/smoke.mjs
npm.cmd start
```

GitHub 상태 확인(시스템 실행 정책을 변경하지 않는 방식):

```powershell
& ([scriptblock]::Create((Get-Content -LiteralPath ./scripts/github-admin.ps1 -Raw -Encoding utf8))) -Action status
```

사용자의 추가 조치는 공개 웹서비스 이용에는 필요하지 않습니다. 실제 코인 런칭은 별도의 명시적인 승인과 사용자 지갑 작업이 필요합니다.
