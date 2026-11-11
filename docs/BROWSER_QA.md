# 독립 Chromium 브라우저 QA

확인일: 2026-11-11 (Asia/Seoul).

## 장애와 해결 방식

기존 연결 도구는 `The browser access host is unavailable`을 반환했고, 네이티브 Chrome 접근도 최소화/현재 URL 확인 오류로 실패했습니다. 연결 호스트 자체의 내부 고장 원인까지 진단한 것은 아닙니다. 사용자의 명시적인 Playwright 사용 요청에 따라 해당 경로 재시도를 중단하고 독립 Chromium을 설치했습니다.

- Playwright 1.65.0 / Chromium 158.0.8127.18, pngjs 7.0.0.
- Windows 로컬 다운로드 경로: 프로젝트 `.local/pw-browsers` (Git 제외).
- 새 격리된 브라우저 컨텍스트만 사용. 기존 Chrome 프로필·쿠키·인증정보·접근 권한 우회 없음.
- GitHub Actions에서도 Ubuntu Linux Chromium을 새로 설치하고 동일 테스트를 실행.
- 모의 API 응답은 테스트에서만 주입하며 제품 코드·공개 통계에는 추가하지 않음.

## 확인된 Windows 결과

| 대상 | 모의/실제 데이터 | 결과 |
| --- | --- | --- |
| 로컬 dist, desktop + Pixel 7 emulation | 모의 API | 24 passed, 0 failed |
| 공개 Pages, desktop + Pixel 7 emulation | 모의 API (사이트 자체는 실제 공개 파일) | 24 passed, 0 failed |
| 공개 Pages 실제 비인증 GitHub 조회 | 실제 API, 모의 응답/인증값 없음 | 1 skipped: HTTP 403, remaining=0, reset=1794374486. 실패를 성공으로 집계하지 않고 재요청하지 않음 |
| 기존 핵심 테스트 | 단위 테스트 | 20/20 passed |
| 전체 npm audit | 개발 의존성 포함 | 0 vulnerabilities |

Linux Actions 결과는 실행 완료 후 추가합니다.

## 24개 기능 테스트 범위

다음 12개를 desktop과 mobile 각각 실행합니다.

1. 페이지 로딩, JavaScript 실행, Tab/Enter 키보드 탐색·분석.
2. 저장소 분석, 7일/30일 수치 전환, XSS 문자열의 안전한 텍스트 표시, 수평 넘침 및 버튼 경계.
3. 기준 저장, 변경된 SHA로 재조회, 새로고침 후 기준 유지, 삭제.
4. 잘못된 GitHub URL 및 Solana Base58/길이 검증. API 호출이 발생하지 않는지 검사.
5. 실제 download 이벤트를 통한 JSON/PNG 파일 저장·검증.
6~8. GitHub 403/404/429 오류 안내와 조작 복구.
9. 네트워크 실패 안내.
10. 일부 요청 500 오류를 불완전 수집으로 표시.
11. 빈 저장소의 명시적인 빈 상태.
12. 진행 중 조회 취소 및 입력 복구.

모든 테스트에서 pageerror, console error, 실패 요청, HTTP 4xx/5xx를 기록합니다. 오류를 의도적으로 주입한 테스트에서 해당 API 오류만 허용하고, 사이트 자산 실패나 CSP/예기치 않은 오류는 실패 처리합니다. 정상 흐름의 예상하지 못한 콘솔/네트워크 오류는 없었습니다.

## 다운로드 검증

JSON을 실제 파일로 저장하고 파싱하여 schema, 저장소, 선택 기간, 집계, 토큰, 수집 범위, 증거 링크를 확인합니다. 원본 커밋 이메일이 들어 있지 않은지도 검사합니다.

PNG는 파일을 pngjs로 CRC 검사하며 디코딩했습니다. **1400×1020 픽셀**, 픽셀 데이터 길이 일치, 100종 이상의 색상으로 비어 있는 캔버스가 아님을 확인했습니다. 다운로드 PNG와 반응형 스크린샷을 시각적으로 확인했습니다. 모바일은 Chromium 에뮬레이션이며 실제 Android/iOS 하드웨어 검증을 의미하지 않습니다.

## 수정 사항

현재까지 새 E2E에서 제품 결함은 발견하지 않았습니다. 기존 기능·제품 코드는 보존했습니다. Node 단위 테스트가 Playwright 파일을 함께 탐색하지 않도록 `npm test` 대상을 `test/*.test.js`로 명시했습니다. 새로운 E2E와 CI 게이트, 결과 아티팩트 보관을 추가했습니다.

## 재현 명령 (Windows)

```powershell
npm.cmd ci
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.local/pw-browsers'
npx.cmd playwright install chromium
npm.cmd run build
npm.cmd test
npm.cmd run test:e2e

$env:E2E_BASE_URL='https://dnfl1999.github.io/memediff/'
$env:QA_RUN='windows-public-mock'
npm.cmd run test:e2e
$env:QA_RUN='windows-public-live'
npm.cmd run test:e2e:live
```

실제 API는 한 번만 조회하며 403/429 제한 시 reset 이후까지 재실행하지 않습니다. 결과는 `qa-results/<QA_RUN>/results.json`, HTML 보고서와 다운로드/스크린샷 아티팩트에 남습니다. skipped는 성공이 아닙니다. CI에서도 해당 상태를 그대로 보고합니다.
