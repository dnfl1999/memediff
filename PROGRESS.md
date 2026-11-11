# MemeDiff 진행 기록

기준일: 2026-11-11 (Asia/Seoul). 작업 대상은 이 MemeDiff 폴더와 dnfl1999/memediff뿐입니다.

## 완료

- 빈 폴더 확인, 기존 재사용 코드 없음.
- 연결 GitHub 프로필 및 기존 Git credential의 API `/user` 모두 dnfl1999 확인.
- 독립 정적 앱 구현: 7/30일 조회, SHA 비교, 선택적 토큰 기록, 증거 URL, PNG/JSON, 반응형 CSS, 오류·수집 한계·개인정보 안내.
- MIT LICENSE, README, Pages Actions, 핵심 자동 테스트 작성.

## 진행 중

- 테스트 재검증 및 GitHub 공개 게시·Pages 배포.
- Forks Wiki 실제 저장소 인식과 비용 조사.

## 검증 제한

- 실제 브라우저 E2E 미완료. Windows 브라우저 자동화 도구가 현재 URL을 안전하게 확인하지 못해 중단됨. 이 상태를 통과로 기록하지 않음.
- 비인증 실제 GitHub API 조회에서 403 rate limit 관측. 오류 안내 동작은 확인했으나 정상 조회 검증은 추가 필요.
- 첫 자동 테스트 시도는 Windows sandbox spawn EPERM, 권한 조정 후 16/17. 실패 원인은 테스트의 page=1 문자열이 per_page=100에도 일치하던 것. 수정 후 재검증 중.

## 재개 명령

```powershell
npm.cmd test
npm.cmd run build
./scripts/github-admin.ps1 -Action inspect
./scripts/github-admin.ps1 -Action status
```

사용자 승인 없이 지갑 연결·서명·SOL 지출·토큰 발행·로그인·2FA를 하지 않습니다.
