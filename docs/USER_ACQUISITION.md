# MemeDiff 사용자 확보 계획

## 출발점과 첫 사용 경험

2026년 11월 26일 KST 인증 조회에서 저장소 Stars, Forks, Subscribers, Topics는 각각 0개였습니다. GitHub Traffic은 최근 14일 **저장소 조회 3회와 고유 조회자 지표 1**을 반환했습니다. GitHub Pages 홈페이지 방문자와 실제 신규 사용자는 미확인입니다. 저장소 지표에는 운영자나 검증 방문이 섞일 수 있습니다. [GitHub Traffic의 범위](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository)

| 제약 | v2.5 공개 화면에서 관찰한 내용 | v2.6 흐름 |
| --- | --- | --- |
| 첫 화면에서 목적 이해 | 슬로건과 CA 분석이 먼저 보였습니다. 홈 주요 동작 5개 중 3개가 저장 파일 도구였습니다. | 첫 문장에 GitHub 커밋과 릴리스를 확인하는 목적을 표시합니다. 파일 도구는 Saved Reports에 모았습니다. |
| GitHub 저장소 분석 시작 | PC·360px 모바일 모두 첫 화면에서 저장소 입력이 숨겨져 있었습니다. | 첫 화면에 주소 입력과 Analyze GitHub가 있습니다. 결과가 준비되면 키보드 포커스가 보고서 제목으로 이동합니다. |
| 입력값 없이 결과 확인 | 기존 데모는 공식 CA 조회를 실행했습니다. Forks 연결이 만료된 경우 시장정보는 볼 수 있었지만 자동 GitHub 보고서는 열리지 않았습니다. | Live GitHub Demo는 명시적 클릭으로 MemeDiff 저장소를 직접 조회합니다. Sample Report는 관측 시각과 수집 상태가 표시된 정적 사례를 엽니다. |
| 결과 활용 | 기본 흐름을 이해하기 전에 파일 종류를 선택하는 버튼이 노출됐습니다. | 사용법을 분석, 근거 확인, 다운로드·비교의 세 단계로 안내합니다. GitHub 검색과 토큰 기록 옵션은 접을 수 있습니다. |

개편 전후 공개 화면에서 입력 위치, 버튼 수, 첫 화면을 확인했습니다. 우선 검증할 사용자 과제는 URL을 붙여 첫 보고서를 보거나, 샘플에서 원본 근거를 찾고 PNG·JSON의 사용처를 설명하는 것입니다. 사용자 인터뷰 결과는 아직 없습니다. [개편 전 PC](qa/v26-before-desktop.png) · [개편 후 PC](qa/v26-after-desktop.png) · [개편 전 360px 모바일](qa/v26-before-mobile.png) · [개편 후 360px 모바일](qa/v26-after-mobile.png) · [공개 샘플](https://dnfl1999.github.io/memediff/#samples)

## 발견 가능성과 피드백

저장소 소개를 무료 GitHub 활동 분석 도구 중심으로 수정하고 `crypto-research`, `data-visualization`, `developer-activity`, `github`, `github-analytics`, `open-source`, `solana` 토픽을 적용했습니다. README 첫 부분의 분석·샘플 진입점과 홈페이지 title, 설명, Open Graph, 내부 링크를 맞췄습니다. 사이트맵은 기존 홈페이지 정규 URL을 사용합니다. 프로젝트 경로 아래의 `robots.txt`는 도메인 루트의 크롤링 규칙과 별개입니다. 검색엔진 등록·순위는 확인하지 않았습니다. [GitHub 토픽](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics) · [robots.txt 위치](https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt) · [검색과 사이트맵](https://developers.google.com/search/help/crawling-index-faq)

홈페이지 Feedback에서 의견 전용 GitHub Issues 양식을 엽니다. 유용했던 근거, 분석에서 막힌 단계, 필요한 결과, 오류 메시지를 받아 검토합니다. 공개 이슈에는 저장소와 재현 순서처럼 필요한 정보만 기록하고 개인정보를 지웁니다. Forks 상태는 운영 이슈 #1에서 관리합니다. [피드백 양식](https://github.com/dnfl1999/memediff/issues/new?template=feedback.md) · [운영 이슈 #1](https://github.com/dnfl1999/memediff/issues/1)

## 홈페이지 방문자 측정 후보

2026년 11월 26일 기준 공식 문서를 비교했습니다. 기존 홈페이지 주소에서 별도 계정이나 추적 연결을 적용하기 전 검토할 항목입니다.

| 후보 | 비용과 GitHub Pages | 개인정보와 기본 지표 | 분석·다운로드 이벤트, 재방문, QA 제외 |
| --- | --- | --- | --- |
| GitHub Traffic | 공개 저장소 기본 기능. 기존 GitHub 권한으로 조회합니다. | 최근 14일 저장소 조회·고유 조회자·클론. 홈페이지 페이지뷰는 제공하지 않습니다. | 홈페이지 이벤트·재방문 측정과 QA 제외 규칙은 제공하지 않습니다. [GitHub REST 지표](https://docs.github.com/en/rest/metrics/traffic) |
| Cloudflare Web Analytics | 무료. 프록시나 DNS 변경 없이 기존 GitHub Pages에 비컨을 수동 설치할 수 있습니다. | 쿠키 기반 식별을 사용하지 않는 페이지뷰·방문과 성능 집계입니다. 개인 수준 재방문은 판별할 수 없습니다. | 커스텀 이벤트는 제공되지 않습니다. 프록시를 쓰지 않는 이 사이트에서는 경로 규칙을 쓸 수 없으므로 QA 환경에서 비컨 자체를 제외하는 편이 안전합니다. [비프록시 설치](https://developers.cloudflare.com/web-analytics/get-started/) · [수집](https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/) · [이벤트 FAQ](https://developers.cloudflare.com/web-analytics/faq/) · [규칙](https://developers.cloudflare.com/web-analytics/configuration-options/rules/) |
| Google Analytics 4 | 표준 GA4는 무료. GitHub Pages에 웹 스트림과 태그를 설정할 수 있습니다. | 표준 웹 설정의 퍼스트파티 쿠키로 사용자·세션과 페이지뷰를 구분합니다. 재방문은 브라우저 상태와 쿠키 제한의 영향을 받습니다. | 분석 시작·완료와 앱에서 생성하는 PNG·JSON에 커스텀 이벤트를 연결할 수 있습니다. 개발자 디버그 및 내부 IP 필터는 테스트 상태에서 확인한 뒤 적용합니다. [Google Analytics](https://marketingplatform.google.com/about/analytics/) · [쿠키](https://support.google.com/analytics/answer/11397207) · [재방문](https://support.google.com/analytics/answer/12253918) · [이벤트](https://developers.google.com/analytics/devguides/collection/ga4/events) · [필터](https://support.google.com/analytics/answer/13296761) |
| Umami | Cloud Hobby 무료, 한 사이트의 월 최대 10만 이벤트. 자체 호스팅은 별도 실행 환경과 데이터베이스가 필요합니다. GitHub Pages는 스크립트를 제공할 수 있습니다. | 쿠키 없이 페이지뷰와 세션을 집계합니다. 기본 익명 세션은 IP·브라우저 정보와 회전하는 솔트에 의존합니다. 반복 방문은 같은 식별 구간 안에서의 추정치입니다. | 커스텀 이벤트를 지원합니다. 테스트 브라우저는 추적 초기화 전에 제외하고 운영 호스트만 허용할 수 있습니다. [요금](https://umami.is/pricing) · [지표 정의](https://docs.umami.is/docs/metric-definitions) · [이벤트](https://docs.umami.is/docs/track-events) · [테스트 방문 제외](https://docs.umami.is/docs/exclude-my-own-visits) · [설정](https://docs.umami.is/docs/tracker-configuration) |

초기에는 저장소 Traffic, 실제 사용성 관찰, 의견 이슈를 각각 기록합니다. 이벤트 측정이 필요해지면 **승인을 전제로 Umami Cloud Hobby**를 우선 검토합니다. 페이지뷰만 필요하면 Cloudflare가 더 단순합니다. 승인 전에는 외부 서비스 계정, 스크립트, CSP 변경을 진행하지 않습니다.

측정 승인이 나면 `sample_open`, `analysis_start`, `analysis_success`, `report_download_requested`부터 확인합니다. 경로는 `github`·`solana`·`sample`, 결과는 성공·제한·오류, 형식은 `png`·`json` 같은 제한된 값으로만 구분합니다. 공유 링크에 포함될 수 있는 `?ca=` 등 쿼리, 입력 주소, 파일명, 원본 응답과 오류 원문은 수집 대상에서 제외합니다. 로컬·CI QA는 태그가 없는 환경에서 실행하고, 운영 확인 브라우저는 코드 초기화 전에 차단합니다. 이벤트 전송 기록을 직접 확인한 뒤 7일 요약을 만들고, 다운로드 요청과 파일 저장 완료는 별도로 해석합니다.

## 홍보 초안

영어권 개발자와 공개 근거를 확인하려는 사용자를 대상으로 작성했습니다. 각 초안은 직접 검토 후 해당 채널 규칙이 허용하는 곳에만 수동 게시할 수 있습니다.

### X 5개

1. Paste a public GitHub URL into MemeDiff to inspect commits and releases, open the evidence, and download PNG or JSON. Free, open source, and no login. https://dnfl1999.github.io/memediff/
2. A recorded Vite example in MemeDiff shows 127 commits and 14 observed releases in 30 days. The release collection reached its cap, and the report shows that limitation. https://dnfl1999.github.io/memediff/#sample-vite
3. What does a quiet report look like? GitHub’s Hello-World sample showed 0 commits and 0 public releases in its recorded 30-day window. See the timestamp and source links. https://dnfl1999.github.io/memediff/#sample-hello-world
4. MemeDiff’s own recorded example shows 6 commits in one 15-day window and 49 in the next. See the cutoff and download the evidence before drawing conclusions. https://dnfl1999.github.io/memediff/#sample-memediff
5. I’m building MemeDiff to make public GitHub evidence easier to use. Try a sample, then tell me where you got stuck or what you’d want from the report. https://dnfl1999.github.io/memediff/#feedback

### Telegram 2개

**For a developer community**

I’m working on MemeDiff, a free tool that turns public GitHub activity into a report you can share. Paste a public repo URL, inspect original commit and release links, then export PNG or JSON. The homepage also has recorded examples, including a Vite report that shows its release collection limit. If you try it, I’d like to hear whether you found the source evidence you needed. https://dnfl1999.github.io/memediff/

**For a research community**

For anyone checking a project’s development history, MemeDiff shows dated public GitHub observations so you can inspect the original records. A sample for MemeDiff itself compares 6 commits in one 15-day window with 49 in the next, and publishes the cutoff and source. You can open the examples without a live API query. https://dnfl1999.github.io/memediff/#samples

### Reddit 1개

**Title** — I built an open-source GitHub activity viewer with downloadable evidence. Where does the workflow still get in your way?

I maintain MemeDiff. It takes a public GitHub URL, shows the default-branch commits and public releases in a recorded window, and lets you inspect the source or save a PNG or JSON report. I wanted an easier way to get back to the evidence after saving a report.

The homepage has recorded examples covering an active repo, a quiet public example repository, and a project whose activity changed across two equal windows. The Vite example labels release collection as capped. You can try the samples before running a live query, and the code is open source.

If the community permits project feedback, I’d appreciate a specific usability check. Can you find an original commit or release, tell how current the observation is, and find a download without help? What took more clicks than expected? https://dnfl1999.github.io/memediff/ · https://github.com/dnfl1999/memediff

### GitHub 프로젝트 소개문

MemeDiff is a free, open-source GitHub activity analyzer. Paste a public repository URL to inspect observed commits, releases and original source links. Compare recorded observations, download PNG or JSON evidence, or start with a timestamped sample. A separate Solana CA analyzer shows market observations and the status of any verified repository association. https://dnfl1999.github.io/memediff/

## 30일 실행 계획

| 시기 | 실행 | 확인할 근거 |
| --- | --- | --- |
| 1–7일 | PC·모바일 첫 사용을 각 1회 이상 실제 참여자와 관찰합니다. 분석, 근거 열기, 내보내기 순서에서 막힌 지점을 기록합니다. | 목표는 총 5회의 사용성 관찰입니다. 완료 여부와 도움을 요청한 단계를 따로 적습니다. |
| 8–14일 | 규칙을 확인한 관련 커뮤니티에 실제 사례와 질문을 수동으로 공유합니다. 채널별 메시지를 고르고 같은 글의 반복 게시를 피합니다. | 채널, 게시 일시, 글 주소, 실제 답변을 기록합니다. QA 방문과 운영자 확인은 참여자 기록에서 빼둡니다. |
| 15–21일 | 피드백 이슈의 재현 가능한 막힘을 우선순위화하고 가장 자주 관찰된 문제 한 가지를 개선합니다. | 목표는 구체적 피드백 3건과 실제 보고서 활용 사례 2건입니다. 미달이면 관찰 수와 원인을 함께 적습니다. |
| 22–30일 | 첫 보고서 완료, 근거 열기, 내보내기 활용 여부를 검토합니다. 측정 승인이 있었다면 외부 세션 요약을 별도로 비교합니다. | 관찰 대상, GitHub 저장소 지표, 홈페이지 지표의 범위와 한계를 함께 기록하고 다음 작업을 정합니다. |

첫 주의 결정 기준은 **사용자가 도움 없이 보고서를 열고 원본 근거를 찾을 수 있는가**입니다. 관찰할 사용자가 부족하면 먼저 참여 요청과 질문을 다듬습니다. 기능 후보는 실제로 보고서를 사용하는 과정에서 확인된 문제를 기준으로 검토합니다.
