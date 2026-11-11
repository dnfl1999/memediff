# ± MemeDiff

## Share a Development Receipt

MemeDiff turns a public GitHub activity observation into an English PNG card with an observation timestamp, exact UTC window, collection status and source evidence. It reuses the existing PNG export; there is no separate service or account to create.

1. Open [MemeDiff](https://dnfl1999.github.io/memediff/) and enter a public GitHub URL or `owner/repo`. The optional Solana address is recorded, not verified.
2. Select **Analyze**, then **7 days** or **30 days**. Review partial-data warnings before interpreting counts.
3. Select **PNG Receipt** and export **JSON** alongside it for all API evidence, limits and errors. URLs printed in a PNG are not clickable.
4. Save a local baseline with **비교 기준 저장**, then analyze again. SHA comparisons use the 30-day observation window even when the card displays 7-day metrics.

Receipts are locally generated and editable, not signed certificates. Activity does not prove work performed, quality, token safety or returns. No wallet, token ownership, login, automatic social posting or hosted report is required. The main report UI remains primarily Korean, with an English quick start and bilingual primary controls.

[Source repository](https://github.com/dnfl1999/memediff) · [Dated operations snapshot and product comparison](docs/OPERATIONS_UPDATE.md)

New here? [Step-by-step guide](docs/GETTING_STARTED.md) · [Real historical receipt example](docs/examples/README.md) · [FAQ](docs/FAQ.md) · [Report a bug or suggest an improvement](https://github.com/dnfl1999/memediff/issues/new/choose). English and Korean feedback are welcome. [Contribution and privacy guidance](CONTRIBUTING.md).

## Official project token — Solana Mainnet

**MemeDiff / MEMEDIFF**

CA: `DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork`

MemeDiff is a free, open-source tool that makes public GitHub development activity easier to inspect. It compares 7-day and 30-day activity, preserves local evidence baselines, links to original sources, and exports PNG and JSON reports. Its purpose is to make development claims easier to check, without inventing trust scores.

MEMEDIFF is the project-associated meme token launched through Forks Wiki for this repository. Token ownership is not required to use the software. Development activity and token market activity are separate; neither guarantees safety, price, returns, liquidity, or rewards.

[Website](https://dnfl1999.github.io/memediff/) · [Forks Wiki](https://forks.wiki/coin/DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork) · [pump.fun](https://pump.fun/coin/DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork) · [Solscan](https://solscan.io/token/DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork)

[Post-launch audit](POST_LAUNCH_AUDIT.md) · [Development roadmap](ROADMAP.md) · [Operations and public APIs](docs/TOKEN_OPERATIONS.md) · [Unpublished community announcement](docs/COMMUNITY_ANNOUNCEMENT.md)

Creator-fee shares: launcher 50%, GitHub owner dnfl1999 30%, Forks 20%. These are fee shares, not token allocations. The on-chain sharing config has its admin revoked. The immutable IPFS metadata contains Forks' generic non-endorsement wording and links its website field to the Forks coin page; this README identifies the project-maintained website separately. See the audit for evidence and limitations.


**코드의 변화를, 근거로.** 무료 오픈소스 밈코인 개발활동 분석 도구입니다. 입력한 공개 GitHub 저장소를 브라우저에서 직접 조회합니다. 투자 점수, 가짜 통계, 토큰 안전성 보장은 제공하지 않습니다.

웹사이트: **https://dnfl1999.github.io/memediff/** · [검증 결과와 제한](PROGRESS.md)

## 사용법

1. GitHub 저장소 URL 또는 `owner/repo`를 입력합니다.
2. 선택적으로 Solana 토큰 mint 주소를 입력합니다. Base58 32바이트 형식만 검사하며 mint 존재 및 저장소와의 공식 연관성은 검증하지 않습니다.
3. **활동 분석하기**를 누르고 최근 7일/30일 커밋·릴리스·기여자와 원본 링크를 확인합니다.
4. **비교 기준 저장**을 누르면 이 브라우저에만 현재 보고서가 저장됩니다. 다시 조회하면 SHA 단위 관측 차이가 표시됩니다. 같은 저장소·브랜치·토큰 조합만 비교합니다.
5. **JSON / PNG**로 보고서를 내보냅니다. JSON에는 전체 수집 데이터·API 증거 URL·수집 범위·비교 결과가 포함됩니다. PNG는 요약 보고서입니다.

## 차별화: 관측 증거의 변화

단순 커밋 수 순위 대신 이전 조회와 현재 조회의 SHA 집합을 비교합니다. 새로 관측된 SHA, 두 조회의 겹치는 기간에서 미관측된 SHA, 30일 관측치 변화, 수집 불완전성을 함께 표시합니다. 새 SHA가 새로운 개발의 증거이거나 사라진 SHA가 삭제·조작의 증거라고 단정하지 않습니다. 이동하는 기간에서 자연스럽게 제외된 과거 커밋은 미관측 집계에서 제외합니다.

## 측정 방법과 한계

- 실제 공개 GitHub REST API만 사용합니다. 제품에는 예시 통계를 표시하지 않습니다. 자동 테스트의 합성 데이터는 테스트 파일에만 있습니다.
- 기본 브랜치의 `committer.date`를 기준으로 조회 시각 직전 7×24시간/30×24시간을 집계합니다. Git timestamp는 변경 가능하며 실제 작업 시점을 보장하지 않습니다.
- 페이지당 100개, 커밋 최대 10페이지/릴리스 최대 5페이지를 조회합니다. 다음 페이지가 남거나 오류가 발생하면 불완전 수집으로 표시합니다. 숫자의 `+`는 불완전 관측치라는 의미이며 정확한 총계가 아닙니다.
- 기여자는 관측 커밋의 GitHub 연결 `author.login` 고유 개수입니다. 봇 포함, 미연결 계정 제외, 공동 작성자 메타데이터 미분석입니다. 전체 프로젝트 기여자 수가 아닙니다.
- 공개 릴리스의 `published_at`을 사용하며 사전 릴리스를 포함합니다. draft는 제외합니다. GitHub 페이지 정렬 특성상 조회 상한에 도달하면 모든 기간의 완전성을 보장하지 않습니다.
- Fork 여부는 GitHub 메타데이터입니다. 코드 독창성·실질 개발량·품질·토큰의 소유 관계를 증명하지 않습니다.
- 비인증 API는 일반적으로 IP당 시간당 60회 요청입니다. 분석 1회에 3~16회 요청을 사용할 수 있습니다. 실패·제한·빈 저장소를 구분하고 취소/45초 타임아웃을 지원합니다.
- 여러 API 요청은 원자적 스냅샷이 아니므로 조회 도중 저장소가 바뀔 수 있습니다. 릴리스·계정 연결도 사후 수정될 수 있습니다.

## 로컬 실행 및 테스트

Node.js 22 이상. 서비스 런타임은 외부 패키지 없이 동작합니다. 브라우저 QA에는 개발 전용 Playwright와 pngjs를 사용합니다.

```sh
npm test
npm run build
npm start
```

브라우저 E2E (독립 Chromium, 기존 사용자 브라우저/로그인 프로필 미사용):

```sh
npm ci
npx playwright install chromium
npm run build
npm run test:e2e
```

`test:e2e`는 모의 GitHub 응답 및 정적 UI를 검증하는 데스크톱·모바일 32개 테스트입니다. Development Receipt의 실제 PNG 디코딩·기간·증거·부분 수집 문구와 공식 CA 복사도 포함합니다. 실제 API 테스트는 별도로 `npm run test:e2e:live`를 실행합니다. 공개 사이트 대상은 `E2E_BASE_URL=https://dnfl1999.github.io/memediff/`를 설정합니다. Windows 설치 경로 예시 및 결과 해석은 [브라우저 QA 기록](docs/BROWSER_QA.md)을 참고하세요.

http://127.0.0.1:4173 에서 확인합니다. Windows PowerShell 실행 정책 때문에 `npm`이 막히면 `npm.cmd`를 사용하세요. Node 24 샌드박스에서 자식 프로세스가 제한되면 `node --test --test-isolation=none`으로 핵심 테스트를 실행할 수 있습니다.

## 배포

GitHub Settings → Pages → Source를 GitHub Actions로 설정합니다. `.github/workflows/pages.yml`은 main/PR에서 핵심 테스트와 Linux Chromium E2E를 통과한 뒤 main에서만 정적 `dist/`를 Pages로 배포합니다. 배포 후 공개 URL의 모의 API E2E와 실제 GitHub API 검사를 따로 실행하며 보고서·다운로드·스크린샷을 Actions 아티팩트로 14일 보관합니다. 실제 API의 403/429는 증거를 남기고 skipped로 구분하며 재시도하지 않습니다. PR에는 배포 권한이 없습니다. 다른 정적 호스트에도 `dist/`를 게시할 수 있으며 상대 경로를 사용합니다.

`scripts/github-admin.ps1`은 기존 Git credential을 메모리에서만 사용하고 매번 `dnfl1999`를 확인합니다. 기본은 읽기 전용 `inspect`입니다. `create`, `pages`, `status` 작업을 지원하며 로그인/토큰 생성은 하지 않습니다. 다른 계정·저장소에는 사용할 수 없습니다.

## 개인정보와 보안

GitHub API로 저장소 경로와 접속 IP가 전달됩니다. Solana 주소는 GitHub 요청에 포함되지 않습니다. API 키·지갑 연결·분석 서버·외부 폰트·추적기가 없습니다. Pages 호스트에는 통상적인 접속 기록이 남을 수 있습니다. 커밋의 원본 작성자 이름·이메일을 저장하지 않으며 공개 GitHub login만 사용합니다. 기준 저장은 명시적인 버튼 동작에만 이뤄집니다. 내보낸 파일에는 토큰 주소가 포함됩니다.

사용자/저장소 텍스트는 `textContent`로 렌더링하고 URL은 HTTPS 허용 호스트만 링크합니다. CSP로 스크립트·연결 대상을 제한합니다. 로컬 저장소는 사용자가 수정할 수 있으므로 신뢰 가능한 증명서가 아닙니다. 서명된 감사 보고서가 아닌 재확인 가능한 관측 기록입니다.

## 독립성과 라이선스

빈 MemeDiff 폴더에서 독립 구현했습니다. 다른 프로젝트의 소스나 작업 대기열을 재사용하지 않았습니다. 서비스 런타임 의존성은 0개입니다. 개발 전용 직접 의존성은 Playwright(Apache-2.0)와 pngjs(MIT)이며 버전을 lockfile로 고정합니다. 이 도구와 Chromium은 공개 사이트에 포함되지 않습니다. [MIT](LICENSE).

관련 도구와의 기능 비교 및 출처는 [docs/RESEARCH.md](docs/RESEARCH.md), Forks Wiki 준비 상태는 [docs/FORKS_WIKI.md](docs/FORKS_WIKI.md), 검증 기록 및 남은 작업은 [PROGRESS.md](PROGRESS.md)를 참고하세요.
