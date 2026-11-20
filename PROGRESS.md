# MemeDiff 진행 기록

기준일: **2026-11-20 (Asia/Seoul)**. 작업 대상은 이 MemeDiff 폴더와 **dnfl1999/memediff**뿐입니다.

## v2.2 Saved Period Comparison (2026-11-20)

인증 계정 `dnfl1999`와 로컬·원격 `main`의 기준 SHA `d4607ef8fe0cc5997c23dee11d88e074b19998a5`를 확인했습니다. 시작 시 미커밋 변경은 0건이었습니다. 공개 홈페이지와 117개 연결이 담긴 인덱스는 HTTP 200을 반환했고 공식 Forks DNS는 `ENOTFOUND`였습니다.

홈의 **Open Saved Comparison**에서 최대 2 MiB의 기간 비교 JSON을 선택해 읽기 전용으로 엽니다. UTC 경계·관측 길이·중복·차이를 기존 계산기로 다시 검증하고, 근거 URL은 해당 저장소 및 작성자의 허용된 GitHub 주소로 제한합니다. 기존 스키마 1 가져오기, 실시간 보고서, baseline과 SHA Explorer를 회귀 검사했습니다. 미리보기는 네트워크 요청, 업로드, 로컬 저장소 쓰기 없이 동작합니다.

[v2.1 공개 QA 원본](https://github.com/dnfl1999/memediff/actions/runs/44701320792/artifacts/14613052613)에서 내려받은 실제 15,775바이트 파일을 바이트 그대로 보존했습니다. SHA-256은 `a4f840bc9964547da58d6ebace027596d518700a535c81a21fa791853fcdffa5`입니다. 로컬 PC·모바일 집중 검사 4건에서 이 파일과 변형된 테스트 자료의 읽기, 불완전 수집, 시간 경계, 취소 및 닫기를 확인했습니다. 로컬 단위 170건과 실제 API 5건도 모두 통과했습니다.

[첫 Actions 실행](https://github.com/dnfl1999/memediff/actions/runs/44706131901)은 Linux의 360px 화면 너비 검사에서 모의 E2E 131건 통과·1건 실패를 기록했습니다. 배포와 공개 QA는 건너뛰었습니다. [실패 진단 ZIP](https://github.com/dnfl1999/memediff/actions/runs/44706131901/artifacts/14615850519)과 원본 브라우저 QA의 360px 스크린샷을 검증했습니다. 모바일에서 새 버튼을 별도 줄에 배치한 뒤 360~1440px 너비 및 미리보기 집중 검사 10건을 모두 통과했습니다.

수정 커밋 `eab02fe25262768d624ce00bc6c3518328dd404b`의 [최종 Pages 실행](https://github.com/dnfl1999/memediff/actions/runs/44707077365)은 verify, deploy, public-qa, diagnostics가 모두 성공했습니다. 수정 후 로컬과 배포 전·공개 PC·모바일 모의 E2E는 각각 132건 통과했습니다. 공개 CI의 실제 API 그룹은 GitHub HTTP 403으로 2건 통과·3건 건너뜀을 기록했고, 별도 공개 사이트 실제 API 재검사에서 5건이 모두 통과했습니다.

공개 주소를 대상으로 미리보기 집중 검사 4건을 독립 실행했습니다. 로드한 페이지를 오프라인으로 전환해 PC와 360px 모바일 모두에서 2026-11-20T08:25:25.774Z의 원본 파일을 열었습니다. 두 화면 모두 A 31건·B 14건·차이 −17건을 표시했고, 추가 요청은 0건이며 저장값이 일치했습니다. 실시간 분석이 시작되지 않았고, 닫을 때 파일 근거가 화면에서 해제됐습니다.

공개 홈·기존 공유 링크·미리보기 모듈·인덱스는 HTTP 200이었습니다. Forks는 `ENOTFOUND`였고 117개 공개 연결과 기존 검증 시각이 일치했습니다. 신규 검증은 0건입니다. [최종 진단 ZIP](https://github.com/dnfl1999/memediff/actions/runs/44707077365/artifacts/14615762668)의 해시와 기존 진단 스키마 1·2 판독을 확인했습니다. [읽기 전용 Monitor](https://github.com/dnfl1999/memediff/actions/runs/44708568391)는 새 진단과 공개 CI 건너뜀을 표시했습니다. 운영 이슈는 #1 한 건이며 열림·댓글 0건입니다. [상세 QA 증거](docs/v22-qa.json)

## v2.1 Period Comparison Export (2026-11-20)

인증 계정 `dnfl1999`와 로컬·원격 `main`의 기준 SHA `c0b4c51a3a497c7cedcfe863e5d1cc1f0f76003f`를 확인했습니다. 시작 시 미커밋 변경은 0건이었습니다. 공개 홈페이지와 117개 연결이 담긴 인덱스는 HTTP 200을 반환했고, 공식 Forks DNS는 `ENOTFOUND`였습니다.

Compare Two Periods의 적용된 결과를 별도 JSON과 1400 × 1080 PNG로 내보냅니다. JSON은 `memediff-period-comparison` 버전 1을 사용하며, 선택 날짜와 실제 UTC 밀리초 경계, 관측 수치, 중복, 수집 상태, GitHub 원본 링크를 기록합니다. PNG는 두 기간과 차트, 수집 상태, 일반 텍스트 URL을 담습니다. 날짜 변경이나 새 분석 시 이전 결과의 내보내기를 무효화하고, 이미 인코딩 중인 이전 이미지도 다운로드되지 않도록 확인합니다.

로컬 단위 164건, 전체 PC·모바일 모의 E2E 128건, 내보내기 집중 E2E 6건이 통과했습니다. 모의 브라우저의 JSON을 재파싱하고 PNG를 디코딩해 수치와 막대 픽셀을 검사했습니다. 로컬 첫 실제 API 실행은 GitHub HTTP 403·잔여 요청 0건으로 2건 통과·3건 건너뜀이었습니다.

기능 커밋 `c042f036de6b77906af6a4bb46ee02b3709769ae`의 [공개 배포](https://github.com/dnfl1999/memediff/actions/runs/44701320792)에서 verify, deploy, public-qa, diagnostics가 성공했습니다. 단위 164건, 배포 전·공개 모의 E2E 각각 128건, 공개 실제 API 5건이 통과했습니다. 각 실패·건너뜀은 0건입니다.

공개 사이트에서 실제로 내려받은 파일을 [브라우저 QA 원본](https://github.com/dnfl1999/memediff/actions/runs/44701320792/artifacts/14613052613)에서 추출했습니다. 11월 20일 08:25:25.774 UTC의 MEMEDIFF `main` 관측에서 A(11월 7–13일)는 고유 커밋 31건, B(11월 14–20일, 조회 시각까지)는 14건이었습니다. 공개 릴리스는 각각 0건, 연결된 작성자는 각각 1명이었습니다. JSON 15,775바이트, PNG 211,004바이트의 SHA-256을 확인했습니다. 실제 JSON을 GitHub 응답과 대조하고, 1400 × 1080 PNG 숫자·막대 픽셀·로고를 확인했습니다. 내보내기 중 추가 GitHub·DexScreener API 요청은 0건이었습니다.

공개 홈, 기존 공유 링크, 새 내보내기 모듈, 인덱스가 HTTP 200이었습니다. 공식 Forks는 여전히 `ENOTFOUND`였고 신규 검증은 0건입니다. 기존 117개 연결과 검증 시각은 배포 전 공개본과 일치했습니다. [스키마 2 진단 ZIP](https://github.com/dnfl1999/memediff/actions/runs/44701320792/artifacts/14613318391)과 과거 스키마 1·2 ZIP을 다시 읽었습니다. [읽기 전용 Monitor](https://github.com/dnfl1999/memediff/actions/runs/44702581959)는 새 진단을 표시하고 Issue #1 댓글 예정으로 판정했습니다. 실제 Issue는 열림·댓글 0건입니다. [상세 QA 증거](docs/v21-qa.json)

## v2.0 Compare Two Periods (2026-11-20)

인증 계정 `dnfl1999`, 로컬·원격 기준 커밋 `51e690bd2ff00641866ce681bc6aea7d115d70b2`, 미커밋 변경 0건을 확인했습니다. 시작 시 공개 홈페이지와 117개 연결이 담긴 인덱스는 HTTP 200이었고, 공식 Forks는 DNS `ENOTFOUND`를 반환했습니다. [이전 Pages 실행](https://github.com/dnfl1999/memediff/actions/runs/44689623654)

현재 GitHub 보고서 안에서 두 UTC 기간의 커밋, 공개 릴리스, 연결된 작성자를 비교합니다. 종료일을 포함하고 수집 첫날과 마지막 날의 경계를 실제 UTC 시각에 맞춥니다. 고유 SHA와 릴리스 ID를 집계하며, 겹치는 기록과 길이 차이를 표시합니다. 수집이 불완전한 구간에서 확인할 수 없는 건수는 `Unknown`입니다. 숫자에서 증거 목록을 열고 원본 SHA·릴리스·작성자 링크를 따라갈 수 있습니다.

로컬 단위 161건, PC·모바일 모의 E2E 126건, 최종 집중 E2E 4건이 통과했습니다. 기존 PNG 단위 검사 대역이 새 섹션을 처리하도록 수정 후 전체 단위를 재실행했습니다. 첫 로컬 실제 API 검사에서는 GitHub의 HTTP 403, 남은 요청 0건을 확인했고 2건 통과·3건 건너뜀으로 기록했습니다.

기능 커밋 `fb00daf5a9ce103cab82a34109ed01da839a2f78`의 [Pages 실행](https://github.com/dnfl1999/memediff/actions/runs/44695232805)에서 verify, deploy, public-qa, diagnostics가 성공했습니다. 배포 전·공개 모의 E2E는 각각 126건이 통과했습니다. 첫 공개 실제 API는 HTTP 403으로 2건 통과·3건 건너뜀을 기록했습니다. 제한 해제 후 공개 URL에서 독립적으로 재실행해 실제 API 검사 5건을 모두 통과했습니다.

실제 GitHub 응답을 대조한 11월 20일 07:39:31.450 UTC 보고서에서 기간 A(11월 7–13일)는 고유 커밋 31건, 기간 B(11월 14–20일, 조회 시각까지)는 12건이었습니다. 두 기간의 공개 릴리스는 각각 0건, 연결된 작성자는 각각 1명이었습니다. 비교 중 추가 API 요청은 0건이었습니다. 브라우저 시계를 공개 인덱스 만료 직후로 고정한 별도 검증에서 CA 자동 분석은 차단됐고 직접 GitHub 분석과 기간 비교는 열렸습니다.

공개 홈·기존 공유 링크·비교 모듈·인덱스가 HTTP 200을 반환했습니다. Forks DNS는 `ENOTFOUND`였고 기존 인덱스의 117개 연결과 검증 시각이 일치했습니다. [스키마 2 진단 ZIP](https://github.com/dnfl1999/memediff/actions/runs/44695232805/artifacts/14609879296)과 [원본 공개 QA ZIP](https://github.com/dnfl1999/memediff/actions/runs/44695232805/artifacts/14610747463)의 해시를 검증했습니다. [읽기 전용 Monitor](https://github.com/dnfl1999/memediff/actions/runs/44696391248)는 새 진단과 건너뜀 수치를 표시했고, 운영 이슈 #1은 열림·댓글 0건입니다. [상세 QA 증거](docs/v20-qa.json)

[후속 정기 갱신](https://github.com/dnfl1999/memediff/actions/runs/44695567454)은 Forks `ENOTFOUND`를 기록하고 배포를 건너뛰었습니다. 진단 ZIP을 확인했고, 이후에도 공개 사이트와 117개 인덱스가 이전 성공 실행의 결과를 제공하는 것을 확인했습니다. [후속 읽기 전용 Monitor](https://github.com/dnfl1999/memediff/actions/runs/44696863564)는 새 실패 진단을 채택해 Issue #1 댓글 예정으로 표시했습니다. 실제 댓글은 0건입니다.

## v1.9 Pages QA 증거 (2026-11-20)

인증 계정 `dnfl1999`와 로컬·원격 `main`의 기준 SHA `59bc525b22f55651b7c81e46f3b1ac5f4aa8676c`를 확인했습니다. 시작 시 미커밋 변경은 0건이었습니다. 공개 인덱스의 117개 연결과 공식 CA 검증 시각 `2026-11-18T20:43:46.517Z`를 확인했고 공식 Forks DNS와 HTTPS 조회는 `ENOTFOUND`를 반환했습니다.

Node와 Playwright의 리포터에서 실행별 검사 건수와 가능한 UTC 시각을 읽어 스키마 2에 기록합니다. Playwright가 관측한 HTTP 상태는 성공, 예상 오류, 예상 밖 오류로 집계합니다. 확인된 같은 요청의 422 → 200 복구는 두 응답 건수와 복구 횟수를 함께 보존합니다. 로컬에서 단위 155건, PC 61건·모바일 61건의 모의 E2E, 실제 API 5건을 통과했습니다.

v1.8의 [첫 공개 QA 원본](https://github.com/dnfl1999/memediff/actions/runs/44684768948/artifacts/14606780503)에서 모의 E2E 121건 통과·1건 실패와 `src/import.js`의 예상 밖 HTTP 503 한 건을 재집계했습니다. 같은 SHA의 [후속 QA 원본](https://github.com/dnfl1999/memediff/actions/runs/44685874281/artifacts/14606956824)에서 122건 통과를 확인했습니다. 양쪽 실제 API 검사는 각각 5건 통과했고, 스키마 1 진단 ZIP도 각각 다시 읽었습니다. GitHub가 403으로 제한한 v1.8 로컬 원본은 2건 통과·3건 건너뜀으로 재집계했습니다.

기능 커밋 `c48ec986538bcf9d5cc3ad117506b1365c53952a`의 [Pages 실행](https://github.com/dnfl1999/memediff/actions/runs/44689623654)에서 verify, deploy, public-qa, diagnostics가 모두 성공했습니다. 단위 155건, 배포 전 PC·모바일 122건, 공개 PC·모바일 122건, 공개 실제 API 5건이 통과했고 각각 실패·건너뜀은 0건입니다. 공개 실제 API 검사에서는 HTTP 200 122건과 빈 저장소의 예상된 409 한 건을 관측했습니다. 422 → 200 복구는 테스트용 응답으로 확인했고 이 공개 실행의 복구 관측은 0건입니다.

[진단 ZIP](https://github.com/dnfl1999/memediff/actions/runs/44689623654/artifacts/14607833458)을 내려받아 ZIP 758바이트, JSON 1,811바이트, SHA-256, 체크섬, 스키마 2와 실행 ID·attempt를 검증했습니다. [읽기 전용 Monitor](https://github.com/dnfl1999/memediff/actions/runs/44690722445)는 이 아티팩트의 QA를 요약에 표시했습니다. 오래된 정기 갱신에는 기존 로그를 사용했고, notify는 건너뛰었습니다. [운영 이슈 #1](https://github.com/dnfl1999/memediff/issues/1)은 열림·댓글 0건입니다.

배포 후 홈페이지, 기존 공유 URL, `src/import.js`, 공개 인덱스가 HTTP 200을 반환했습니다. Forks는 여전히 `ENOTFOUND`였고 신규 검증은 0건이었습니다. 배포 전 공개본과 기존 117개 연결 및 검증 시각이 일치했습니다. 공식 CA의 48시간 만료 시각은 `2026-11-20T20:43:46.517Z`입니다. [상세 QA 증거](docs/v19-qa.json)

## v1.8 Pages 운영 진단 (2026-11-20)

시작 로컬·원격 `main`은 `242d03664fe4c75860380a5dc299abfef4b00421`, 계정은 `dnfl1999`, 미커밋 변경은 0건이었습니다. 기존 [운영 이슈 #1](https://github.com/dnfl1999/memediff/issues/1)은 열려 있었고 댓글 0건이었습니다. 14:47:28 KST에 공개 117개 연결과 공식 검증 `2026-11-18T20:43:46.517Z` 보존, 공식 Forks 조회 `ENOTFOUND`를 확인했습니다.

Pages 실행별 진단 JSON을 별도 아티팩트에 14일간 보관합니다. JSON은 갱신 상태, 확인된 검증 수·시각, 실패 분류와 verify/deploy/public-qa 결과를 각각 담습니다. 기록 작업과 업로드 결과는 별도 요약에 남습니다. 기존 Monitor는 아티팩트와 실행·시도·단계를 대조해 근거로 사용하고, 기록이 없거나 만료되면 로그에 있는 확인 가능한 진단을 사용합니다. 진단 출처만 달라지는 경우 운영 이슈를 갱신하지 않습니다. [운영 문서](docs/INDEX_MONITOR.md#pages-operation-diagnostics).

기능 커밋 `505157fd3b739957a7b640ebf0fbd8f7b055f816`. 로컬 단위 151건, PC·모바일 모의 E2E 122건 통과, 빌드 성공입니다. 로컬 실제 API는 2건 통과, 비인증 GitHub 403·한도 0으로 3건 건너뜀, 실패 0건입니다. 실제 실패 경로에서 `failed`와 `ENOTFOUND`를 출력하고 인덱스 파일을 생성하지 않는 것을 확인했습니다.

[첫 Pages 실행](https://github.com/dnfl1999/memediff/actions/runs/44684768948)은 verify/deploy가 성공했고, 공개 모의 QA는 `src/import.js` HTTP 503으로 121통과·1실패, 공개 실제 API는 5통과였습니다. [첫 진단 ZIP](https://github.com/dnfl1999/memediff/actions/runs/44684768948/artifacts/14606406562)은 업로드와 실제 다운로드 검증을 통과했습니다. JSON 737바이트, ZIP 544바이트이며 `forks=retained`, `newlyVerified=0`, `retained=117`, `publicQA=failure`를 기록했습니다. 정적 파일은 이후 HTTP 200과 소스 일치를 확인했고 공개 사이트의 동일 PC·모바일 집중 검사 2건이 모두 통과했습니다.

[읽기 전용 Monitor](https://github.com/dnfl1999/memediff/actions/runs/44685870731)는 첫 실행의 새 아티팩트를 공개 인덱스 근거로 채택했습니다. 이전 정기 갱신 실패에는 기존 로그를 사용했습니다. notify는 건너뛰었고 기존 운영 이슈 #1은 열린 상태, 댓글 0건, 동일 갱신 시각으로 확인됐습니다. [QA 증거](docs/v18-qa.json).

같은 SHA로 [전체 재검증 실행 44685874281](https://github.com/dnfl1999/memediff/actions/runs/44685874281)을 진행해 verify, deploy, public-qa, diagnostics 모두 성공했습니다. CI 단위 151건, 배포 전 PC·모바일 모의 122건, 공개 모의 122건, 공개 실제 API 5건 통과, 실패·건너뜀 0건입니다. Forks는 15:16:14 KST에 다시 `ENOTFOUND`였고 공개 인덱스 117개와 공식 CA의 원래 검증 시각을 보존했습니다. 공유 URL과 인덱스 모두 HTTP 200을 확인했습니다. [최종 진단 ZIP](https://github.com/dnfl1999/memediff/actions/runs/44685874281/artifacts/14607415408)은 JSON 750바이트, ZIP 549바이트입니다. 실제 다운로드에서 해시와 내용 및 실행 ID를 확인했습니다. [최종 읽기 전용 Monitor](https://github.com/dnfl1999/memediff/actions/runs/44687234923)는 이 아티팩트를 사용했고, 이슈 #1은 열린 상태와 댓글 0건을 유지했습니다. 실제 공식 신규 검증 또는 복구는 관측되지 않았습니다.

## v1.7 Index Health Monitor (2026-11-20)

시작 HEAD·원격 `main` `3b2dc6c3c225184d8663ae822900206232752a5c` 일치, 인증 계정 `dnfl1999`, 미커밋 변경 0건, 운영 이슈 0건을 확인했습니다. 기존 저장소 구독 조회는 HTTP 404였습니다. 13:18:03 KST에 공식 Forks DNS와 HTTPS 시도에서 `ENOTFOUND`를 확인했습니다. 공개 인덱스 117개, 공식 CA 마지막 실제 검증 `2026-11-18T20:43:46.517Z`를 확인했습니다.

시간당 정기 Monitor와 읽기 전용 수동 실행을 추가했습니다. 정기 Pages 인덱스 단계의 연속 실패, 6시간 이내 만료, 48시간 초과, 새 공식 검증 배포로 확인된 복구를 추적합니다. 실제 실패 출처와 48시간 경계를 출력하고, 같은 장애의 상태 변경은 같은 운영 이슈의 댓글로 남깁니다. 최초 로컬 읽기 전용 실행에서 정기 갱신 연속 실패 2건, 공개 인덱스 Fresh, 이전 연결 유지 117개, 이슈 생성 예정 상태를 확인했습니다. [Monitor 운영 문서](docs/INDEX_MONITOR.md).

기능 커밋 `b9dff50600ff3e8230898f1243891aa1928d0290`. 로컬 단위 140건, PC·모바일 모의 E2E 122건, 실제 API 5건이 모두 통과했습니다. v1.7 [Pages 실행 44674755435](https://github.com/dnfl1999/memediff/actions/runs/44674755435)는 `verify`, `deploy`, `public-qa`가 성공했습니다. CI 단위 140건, 배포 전 PC·모바일 모의 122건, 공개 모의 122건, 공개 실제 API 5건 통과, 실패·건너뜀 0건입니다. 13:33:38 KST에 `ENOTFOUND`를 확인해 117개 공개 레코드와 기존 검증 시각을 유지했습니다. 신규 검증 0개입니다. 공식 공유 URL과 공개 인덱스 모두 HTTP 200, 새 운영 관측 기록을 제외한 전체 인덱스 내용이 이전 공개본과 일치했습니다. [공개 QA 아티팩트](https://github.com/dnfl1999/memediff/actions/runs/44674755435/artifacts/14601623158).

[첫 읽기 전용 실행](https://github.com/dnfl1999/memediff/actions/runs/44674795984)은 이슈 생성 예정, notify 건너뜀, 이슈 0건이었습니다. [실제 쓰기 실행](https://github.com/dnfl1999/memediff/actions/runs/44675326010)은 연속 실패 근거로 [운영 이슈 #1](https://github.com/dnfl1999/memediff/issues/1)을 생성했습니다. [쓰기 모드 재실행](https://github.com/dnfl1999/memediff/actions/runs/44675451404)은 변경 없음으로 성공했고 운영 이슈 1건·댓글 0건을 확인했습니다. `dnfl1999`의 저장소 범위 GitHub 알림 API에서 해당 이슈의 `mention` 스레드를 확인했습니다. 이메일과 푸시 수신은 미검증입니다. 만료·복구 상태 변경과 이슈 종료·재열기는 모의 테스트에서 검증했습니다. [QA 증거](docs/v17-qa.json).

## v1.6 Index Health (2026-11-20)

기준 커밋 `c92867b904ce35e569b0d066bc2fa9ec642f0b25`와 원격 `main` 일치, 인증 계정 `dnfl1999`, 미커밋 변경 0건, 직전 Pages 실행 44660317318 성공을 확인했습니다. 11:44:57 KST 공개 인덱스에는 117개 연결이 있었고 공식 MEMEDIFF 검증 시각은 `2026-11-18T20:43:46.517Z`였습니다. 같은 시각 공식 Forks DNS와 HTTPS 시도 모두 `ENOTFOUND`를 반환했습니다.

CA 조회 결과에 검증 상태, UTC 시각, 나이·유효기간·남은 시간·가용성·출처를 표시합니다. Fresh에 한해 자동 분석을 시작하고, 유효기간의 마지막 6시간은 Expiring soon과 직접 분석 경로를 표시합니다. 앞으로의 검증 시각, 중복·오류, 만료, CA 미등재, 인덱스 불가를 구분합니다. 브라우저 시각에 따라 표시가 갱신되며, 갱신 실패 안내는 해당 인덱스와 연계된 공개 Actions 근거가 있을 때만 표시합니다.

Actions는 현재 공개 인덱스 검증부터 수행하며, 확보에 실패하면 오래된 로컬 인덱스로 교체하지 않습니다. 신선도·신규 검증·유지·만료를 구분하고 원자적 저장과 이전 검증 시각을 보존합니다. 공개 실제 QA는 현재 Fresh 자동 분석, 공개 데이터에서 만료 시계 조건을 적용한 차단 검증, 실제 시장정보와 직접 GitHub 분석을 구분합니다.

배포 커밋 `93d3a82861f21884f8961dff59798c65fc6f9f44`. 로컬 단위 129통과, 빌드 성공, PC·모바일 모의 E2E 122통과(61건씩). 로컬에서 선택한 실제 시장·만료 차단 검사 2통과, 실패·건너뜀 0건입니다. 첫 실행에서는 MEMEDIFF 시장 응답의 HTTP 200 빈 배열에 가격 데이터가 있다고 가정한 검사 1건이 실패했습니다. 응답 본문을 대조하고 비어 있을 때 `Unknown`을 확인하도록 보완한 뒤 두 검사 모두 통과했습니다.

[Actions 44664298501](https://github.com/dnfl1999/memediff/actions/runs/44664298501)은 `verify`, `deploy`, `public-qa` 모두 성공했습니다. CI 단위 129건, 배포 전 모의 122건, 공개 모의 122건, 공개 실제 API 5건 통과, 실패·건너뜀 0건입니다. 기존 공유 URL의 CA 사전 입력, Fresh 자동 분석, GitHub 직접 분석, 브라우저 시각 제어로 확인한 48시간 경과 후 GitHub 요청 0건을 확인했습니다. 공개 MEMEDIFF 시장 조회는 HTTP 200이었고 일치하는 풀이 없어 `Unknown`으로 표시했습니다. SHA Explorer, JSON 가져오기, UTC 타임라인, PNG/JSON 및 Native Share 자동화 회귀도 통과했습니다. [v1.6 QA 증거](docs/v16-qa.json) · [공개 QA 아티팩트](https://github.com/dnfl1999/memediff/actions/runs/44664298501/artifacts/14597272446).

배포 CI에서 12:00:42 KST에 Forks DNS `ENOTFOUND`를 재확인했습니다. 신규 검증 0개, 이전 연결 유지 117개입니다. 공개 공유 URL, Index Health 모듈, 공개 인덱스 모두 HTTP 200이며, 추가된 실제 Actions 기록을 제외한 인덱스 내용은 이전 공개본과 일치했습니다. 공식 MEMEDIFF의 Expiring soon 전환은 11월 20일 23:43:46.517 KST이며, 11월 21일 05:43:46.517 KST를 넘으면 Expired입니다. 실제 Forks 재검증과 실물 모바일 공유 메뉴 검증은 남아 있습니다.

## v1.5 SHA Explorer (2026-11-20)

기존 30일 `compareSnapshots()`의 SHA 분류를 사용해 관측 타임라인 아래에 SHA Explorer를 추가했습니다. 포함한 행에는 SHA, GitHub 원본 링크, 이전·현재의 커밋/관측 UTC 시각, 메시지와 확인 가능한 작성자를 표시합니다. 겹침 필터 3종과 결과 건수, 20개 단위 탐색, 경계/N/A, 부분 수집 및 가져온 미검증 자료 표시를 제공합니다. 기존 브라우저 기준 저장과 PNG/JSON 내보내기는 기존 비교 범위를 사용합니다.

운영 커밋 `ed39628d7845abba0f12a1bda0167e151f869074`, 기능 커밋 `41189545e5b0e224f958ddeab198043403725e6a`를 `main`에 게시했습니다. 배포 전 로컬 단위 123통과, PC·모바일 모의 E2E 118통과(59건씩), 빌드 성공. 로컬 실제 API는 DexScreener 시장 조회 1통과, 비인증 GitHub `403` 및 `remaining=0`으로 3건 건너뜀, 실패 0건입니다.

[Actions 44660317318](https://github.com/dnfl1999/memediff/actions/runs/44660317318)의 `verify`, `deploy`, `public-qa`가 모두 성공했습니다. CI 단위 123통과, 배포 전 PC·모바일 모의 118통과, 공개 모의 118통과, 공개 실제 API 4통과, CI 실패·건너뜀 0건입니다. 기존 MEMEDIFF 공유 URL의 CA 사전 입력과 명시적 조회, 실제 시장 정보 및 자동 GitHub 분석, schema 1 JSON 재가져오기와 SHA Explorer, PNG/JSON 다운로드를 공개 브라우저에서 확인했습니다. PC·모바일 SHA Explorer 화면 증거와 실제 API 응답은 [공개 QA 아티팩트](https://github.com/dnfl1999/memediff/actions/runs/44660317318/artifacts/14595073057) 및 [요약 증거](docs/v15-qa.json)에 기록했습니다. 실제 모바일 OS 공유 메뉴는 미검증입니다.

11월 20일 로컬과 CI의 Forks 최근 목록 조회에서 DNS `ENOTFOUND`가 재현됐습니다. v1.5 배포는 기존 117개 공개 연결을 원래 시각 그대로 재사용했습니다. 공개 공유 URL·Explorer 모듈·인덱스 모두 HTTP 200이며 모듈과 인덱스 내용을 검증했습니다. 공식 MEMEDIFF 연결은 마지막 검증 시각이 11월 19일 05:43:46 KST이므로 재검증 없이 48시간을 넘으면 CA 자동 분석에 사용되지 않습니다.

## 정기 배포 안정화 (2026-11-20)

[11월 19일 Actions](https://github.com/dnfl1999/memediff/actions/runs/44481359812)과 [11월 20일 Actions](https://github.com/dnfl1999/memediff/actions/runs/44612527688) 모두 `GET https://forks.wiki/api/tokens/recent`에서 `network` 오류로 중단됐습니다. 이전 어댑터가 원인 코드를 버려 DNS, TCP, TLS 등 세부 원인은 해당 로그에서 확인할 수 없습니다.

[11월 16일 Actions](https://github.com/dnfl1999/memediff/actions/runs/43819604716)의 보존된 Playwright 트레이스에는 `sha=main`, `since=2026-10-17T06:56:43.335Z`, `until=2026-11-16T06:56:43.335Z`, `per_page=100`, `page=1`인 GitHub 커밋 조회의 422와 응답 메시지 `The request is taking too long to process.`가 남아 있습니다. 같은 파라미터로 GitHub 커넥터 조회 시 커밋 31개가 반환됐습니다. [GitHub REST 문서](https://docs.github.com/en/rest/commits/commits#list-commits)의 초 단위 요청 형식과 로컬 밀리초 범위를 분리하고, 이 처리 시간 초과에 한해 한 번 재시도합니다. 유효성 오류나 반복 실패는 불완전한 수집으로 남기며, 공개 E2E는 실제 회복 응답까지 확인합니다.

Forks 갱신은 원인 분류와 제한 재시도, 검증 후 원자적 교체를 적용했습니다. 정기 갱신 실패 시 기존 배포본을 보존하고, 코드/수동 배포는 검증된 공개 인덱스를 원래 시각으로 재사용할 수 있습니다. [인덱스 운영 문서](docs/DISCOVERY.md).

## 이전 상태 — v1.4 Native Share (2026-11-12)

시작 main `0572615c552397693f5f40bd1a62838588389d75` 원격 일치, dnfl1999 계정 및 v1.3 Actions 43175301150 성공 확인. 시작 단위 88/88 통과. 기존 analysisLink와 Copy Analysis Link를 재사용해 Share를 추가했습니다. url 하나만 OS에 전달하고 미지원은 복사/수동 선택으로 연결합니다. 취소는 복사하지 않으며 오류는 사용자가 명시적으로 복사를 선택할 수 있게 합니다. 연속 클릭은 두 버튼을 함께 잠그고, 입력 변경 후 이전 응답은 상태를 덮어쓰지 않습니다. 기존 주소·canonical·sitemap·외부 등록·토큰 정보·schema 1·저장 키를 유지합니다. 도메인 관련 작업은 전면 보류하며 추가 조사/설정 변경을 하지 않습니다. v1.5는 배포 후 별도 설계·검증 계획만 기록합니다.

단위 94통과/0실패/0건너뜀, PC·모바일 Chromium 전체 114통과/0실패/0건너뜀. Native Share 모의 성공·취소·오류·미지원·중복 실행 방지·지연 응답, 기존 전체 기능과 개인정보/localStorage 보존을 검증했습니다. 로컬 실제 API 1통과/0실패/3건너뜀. 제한 응답은 [QA 증거](docs/native-share-qa.json)에 보존합니다. 제품 커밋 `45b8bf0b0b432525c97a84b4cd74f85fa561122b` main 푸시 및 [Actions 43191061937](https://github.com/dnfl1999/memediff/actions/runs/43191061937) verify/deploy/public-qa 모두 성공. CI 단위 94통과, 배포 전 모의 114통과, 공개 PC·모바일 모의 114통과/0실패/0건너뜀, 공개 실제 API 4통과/0실패/0건너뜀. 실제 MEMEDIFF CA 분석·공유 URL·JSON import·타임라인·PNG/JSON과 공개 Native API 모의 검사를 확인했습니다. 공개 13개 파일 HTTP 200 및 빌드 일치. 최종 QA 및 별도 v1.5 설계 문서는 [skip ci]로 게시하며 앱 배포를 반복하지 않습니다. 실제 모바일 OS 공유 메뉴는 이 환경에서 검증하지 않았으며, 자동화는 native API 응답을 모의합니다.

v1.4 Pages 배포 완료 후 [ROADMAP의 v1.5 설계·검증 계획](ROADMAP.md)을 작성했습니다. 전체 스냅샷 SHA 집합의 의미를 먼저 유지한 다음 겹치는 UTC 구간으로 표시를 제한하며 신규/미관측/양쪽 관측, provenance, N/A·경계·부분 수집을 구분합니다. 원본 커밋 링크, 페이지 분할, 접근성, schema 1·baseline·내보내기 보존과 회귀 검증 기준을 명시했습니다. v1.5 코드는 구현하지 않았고 별도 버전으로 관리하며 package 버전은 1.4.0입니다.

## 이전 상태 — v1.3 Share Token Analysis (2026-11-12)

시작 main `2365d49faa1fafa0b3ade85c74ae5369b330a36f` 원격 일치, dnfl1999 인증, v1.2 Actions 43164014308 성공을 확인했습니다. 기존 URL 처리에 공유 기능이 없음을 확인하고 기존 parseToken 및 CA 조회를 재사용했습니다. 시작 단위 80/80 통과. 공식 홈페이지 + 단일 ca 파라미터로만 공유 링크를 생성합니다. URL에서 검증된 CA는 입력만 하며 Analyze Token을 눌러야 조회합니다. 잘못된 CA·중복 파라미터를 거부하고 외부 URL로 이동하지 않습니다. 클립보드 실패 시 선택 가능한 전체 링크와 수동 복사 안내를 제공합니다. baseline/JSON/report를 읽거나 공유하지 않으며, 복사 중 입력 변경 시 이전 상태 안내를 무시합니다. 일반 방문·공식 CA 정보·임의 CA 구분·정적 공유 미리보기 한계를 유지/안내합니다.

단위 88통과/0실패/0건너뜀, PC·모바일 Chromium 전체 102통과/0실패/0건너뜀. URL 인코딩·악성/중복/빈 CA, 직접 입력과 공유 조회 일치, 복사 성공·실패·API 부재·지연 완료, 사전 API 요청 없음, baseline/import 보호, 타임라인·PNG/JSON과 기존 전체 기능을 검증했습니다. 로컬 실제 API 1통과/0실패/3건너뜀. API 제한 응답은 [QA 증거](docs/share-qa.json)에 보존하며 자동 재시도하지 않았습니다. 제품 커밋 `111e3d64ac4f0800fd875f23e3ca97866af2d395`를 main에 푸시했고 [Actions 43170237297](https://github.com/dnfl1999/memediff/actions/runs/43170237297) verify/deploy/public-qa 모두 성공했습니다. CI 단위 88통과, 배포 전 모의 102통과, 공개 PC·모바일 모의 102통과/0실패/0건너뜀, 공개 실제 API 4통과/0실패/0건너뜀. 공개 MEMEDIFF 공유 URL 직접 열기→CA 사전 입력/API 요청 없음→Analyze Token→시장정보→GitHub→링크 생성→JSON import→UTC 타임라인→PNG/JSON을 검증했습니다. 공개 13개 파일 HTTP 200 및 빌드 일치. 로컬 API 제한 3건너뜀은 별도로 보존합니다. 최종 QA 문서는 [skip ci]로 게시하며 앱 배포는 반복하지 않습니다.

## 이전 상태 — v1.2 Observation Period Timeline (2026-11-12)

시작 main `cc457bf1eca1a1ab6e64db58f39c3f435eda27a2` 원격 일치, dnfl1999 인증, v1.1 Actions 43159340609 성공을 확인했습니다. 시작 단위 68/68 통과. 기존 compareSnapshots를 확장해 UTC 30일 구간·겹침·경계만 접함·분리됨을 구분합니다. UI와 PNG는 같은 기간/좌표 계산을 사용합니다. missing SHA를 겹치는 기간의 양 끝으로 제한하며, 분리된 기간은 N/A 표시입니다. 7/30일 선택과 30일 비교 기준, 기존 schema 1·저장 키·로컬 파일 처리·명시적 저장을 보존했습니다. JSON comparison.windows는 추가 메타데이터이며 가져올 때 신뢰하지 않고 재계산합니다. 비교 PNG는 1400×1260, 비교 없는 PNG는 기존 1400×1020입니다. 실제 v1.1 공개 다운로드를 수정 없이 호환성 샘플로 추가했습니다.

최종 단위 80통과/0실패/0건너뜀, PC·모바일 Chromium 전체 88통과/0실패/0건너뜀. 기존 전체 기능, 겹침·경계·비겹침, UTC 경계/윤일/잘못된 날짜, 7/30일, baseline·import, 429 불완전 수집, PNG/JSON을 검증했습니다. 로컬 실제 API는 1통과/0실패/3건너뜀: GitHub 제한 응답에 따라 추가 GitHub 요청 없이 중단했고 DexScreener 조회는 통과했습니다. 화면·PNG를 시각 확인했습니다. [QA 증거](docs/timeline-qa.json). 제품 커밋 `1df959b8dadc2c2aab58b2703a18c8f6646054bb`를 main에 푸시했고 [Actions 43164014308](https://github.com/dnfl1999/memediff/actions/runs/43164014308) verify/deploy/public-qa 모두 성공했습니다. CI 단위 80통과, 배포 전 모의 88통과, 공개 PC·모바일 모의 88통과/0실패/0건너뜀, 공개 실제 API 4통과/0실패/0건너뜀. 실제 MEMEDIFF CA→시장정보→GitHub→JSON import→UTC 타임라인→PNG/JSON을 검증했습니다. 공개 11개 파일 HTTP 200 및 빌드 일치. 로컬 API 제한 3건너뜀은 별도로 보존합니다. 최종 QA 문서는 [skip ci]로 게시하며 앱 배포는 반복하지 않습니다.

## 이전 상태 — v1.1 JSON Snapshot Import & Comparison (2026-11-12)

기존 런타임 코드·README·ROADMAP·PROGRESS·최근 배포 Actions 43148330961을 확인했습니다. 시작 단위 39/39 통과, 저장소 깨끗함, 원격과 로컬 f6cfe96 일치. 브라우저 로컬 파일 검증·미리보기·명시적 비교 및 저장을 구현했습니다. schema 1과 기존 baseline 키, compareSnapshots를 유지하며 imported-json 출처는 추가 필드로만 표시합니다. 기존 브라우저 baseline은 Compare without saving에서 바뀌지 않으며 Save imported baseline을 눌러야 덮어씁니다. 새 조회 중 늦게 완료된 파일 읽기는 무시합니다.

검증: 최종 단위 68/68 통과. 최초 PC·모바일 전체 E2E 78/78, 검증기 보완 후 가져오기 집중 재검사 12/12 통과. 로컬 실제 API는 1통과/3건너뜀/0실패: GitHub 403 remaining=0을 기록하고 추가 GitHub 요청을 중단했으며 DexScreener는 200 응답. 이전 공개 실제 MEMEDIFF JSON(21커밋, 공식 CA)도 새 검증기로 읽기 성공. 최종 UI 포커스 반영 후 전체 PC·모바일 회귀 재검사 78/78 통과(실패·건너뜀 0). 실제 화면 미리보기와 PNG의 imported/unverified 표기를 확인했습니다. 제품 커밋 `ca4148abd1f4098490ef7c0b11a23f3bee5cb85c`를 dnfl1999/memediff main에 푸시했습니다. [Actions 43159340609](https://github.com/dnfl1999/memediff/actions/runs/43159340609)의 verify/deploy/public-qa 모두 성공. 서버 단위 68/68, Linux 배포 전 모의 78/78, 공개 PC·모바일 모의 78/78, 공개 실제 API 4/4 통과(공개 검사 실패·건너뜀 0). 실제 MEMEDIFF CA → 시장정보 → GitHub 분석 → JSON 다운로드 → 같은 파일 가져오기 → 30일 비교 → PNG/JSON 재출력을 확인했습니다. 공개 9개 파일 HTTP 200 및 빌드 일치. [최종 QA·실제 API 응답 증거](docs/import-qa.json). 로컬 GitHub 제한에 따른 3건너뜀은 공개 성공과 구분해 보존합니다. 최종 증거 문서는 [skip ci]로 게시하며 앱 배포를 반복하지 않습니다.

## 이전 상태 — CA 단독 분석 (2026-11-11)

CA 입력 한 번으로 DexScreener의 정확한 Solana base-token 시장 정보와 공식 Forks 인덱스를 조회하고, 검증된 저장소를 기존 GitHub 분석 엔진으로 자동 분석합니다. Advanced Search에 기존 GitHub 직접 입력과 이름 검색을 보존했습니다. schema-1 JSON·저장 키·SHA 비교·PNG·브랜드 자산은 유지합니다. 시장 수치와 개발 증거를 분리하며 누락 값은 Unknown/Unavailable입니다.

공식 API 최근 목록의 page/offset/limit 실험은 동일한 20개를 반환해 전체 조회 지원은 확인되지 않았습니다. 최근 목록과 기존 관측 이력을 합쳐 27개 CA를 `/api/coin`으로 재검증했습니다. 6시간 주기 Actions, 후보 최대 200개, 48시간 이상 연결 자동 사용 중단, 데이터 불완전성 표시를 구현했습니다. Forks 브라우저 CORS 제약은 별도 Chromium probe로 확인했습니다. 선택적 읽기 전용 Worker 구현은 단위 검증만 했으며 외부 계정 생성이나 배포는 하지 않았습니다. 자세한 근거는 [DISCOVERY](docs/DISCOVERY.md)와 [API 관측](docs/ca-api-research.json)에 있습니다.

로컬 최종 단위 39/39, PC·모바일 모의 E2E 66/66 통과. 최초 모의 62통과/4실패는 Advanced Search를 열지 않는 기존 테스트 절차를 수정한 뒤 해소했습니다. 실제 로컬 API는 1통과/3건너뜀: BONK 시장 조회 성공, GitHub API 제한에 따른 반복 요청 중단. PNG 실제 디코딩·JSON·기존 스냅샷·영어·모바일 검증 포함. 인증 계정 dnfl1999 및 origin/main 동일 상태를 확인했습니다.

제품 커밋 80260de와 실전 테스트 보완 89738d1을 dnfl1999 main에 게시했습니다. 최초 공개 실제 API는 3통과/1실패였고, 다른 Forks 연결 저장소의 명시적 empty-repository 409를 테스트가 오류로 취급한 원인을 수정했습니다. [최종 Actions 42997118463](https://github.com/dnfl1999/memediff/actions/runs/42997118463)의 verify/deploy/public-qa가 성공했습니다. Linux 빌드 모의 66/66, 공개 모의 66/66, 공개 실제 API 4/4(건너뜀 0) 통과. MEMEDIFF CA → dnfl1999/memediff 자동 분석, 다른 Forks CA → riansj2290/remote-ikan 빈 저장소 분석, BONK 시장 정보/연결 미확인, 기존 GitHub 직접 입력·이름 검색을 확인했습니다. 연결된 두 CA의 PNG 디코딩·JSON·7일/30일·baseline 동작도 성공했습니다. 최종 공개 인덱스는 32개 연결이며 complete=false입니다. 공개 주요 파일 9개 HTTP 200 및 로컬 일치·브랜드 자산 보존 확인. [세부 QA 기록](docs/ca-qa.json). 문서 기록은 [skip ci] 커밋으로 검증된 배포를 유지합니다. 재개 명령: `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:e2e`, `npm.cmd run test:e2e:live` (실제 API 제한이면 같은 환경에서 재시도하지 않음).

## 이전 상태 — 공식 로고 브랜드 리디자인 (2026-11-11)

발행 감사에 보존된 공식 라임 후드 로고 `.local/audit/token-image.png`를 재사용했습니다. 실제 형식은 JPEG이므로 내용 변경 없이 `assets/memediff-logo.jpg`로 복사하고 헤더·hero·토큰 카드에 적용했습니다. 라임/cyan/coral·near-black 테마, hero의 분석/실제 데모 CTA, 분석 패널·차트·토큰 CA/외부 링크 카드, favicon·1200×630 소셜 미리보기를 정비했습니다. 원본 로고 62,327 bytes, 외부 폰트·애니메이션 라이브러리 없음. 이미지 크기를 명시하고 토큰 로고는 lazy-load, reduced-motion을 지원합니다. [자산 출처](assets/README.md).

기존 분석·검색·CA 인덱스·7/30일·스냅샷·JSON 구조는 그대로이며 PNG는 색상만 변경했습니다. UI는 영어입니다. 단위 31/31 통과. 초기 E2E 48 통과/2 실패는 이전 토큰 제목 문자열 기대값 문제였으며 새 표기에 맞게 수정했습니다. 최종 50개 PC·모바일 E2E 통과. 로컬 모바일 Lighthouse: Performance 98 / Accessibility 100 / Best Practices 100 / SEO 100. 로컬 단일 측정으로 실사용 성능 보장은 아니며 보고서는 `.local/brand-lighthouse.json`에 보존합니다.

최종 로컬 E2E **50/50** 통과 후 dnfl1999 계정으로 제품 커밋 `66c24c706ace849b2922ddf4d8695cd45e963bd0`를 main에 게시했습니다. [Actions 42986914277](https://github.com/dnfl1999/memediff/actions/runs/42986914277)의 verify/deploy/public-qa 모두 성공. 아티팩트 확인: Linux 빌드 모의 50 통과, 공개 모의 50 통과, 실제 API 2 통과/0 건너뜀/0 실패. 초기 제목 테스트 실패는 별도 이력에 보존했습니다.

08:27:30 UTC 공개 HTML/CSS/JS/로고/favicon/소셜 미리보기 13개 파일의 HTTP 200 및 로컬 일치를 확인했습니다. 공개 PNG는 실제 디코딩하여 64×64 및 1200×630 확인. 자체 UI 한국어 리터럴 0건. 공식 CA·연결·7/30일·스냅샷·JSON/PNG·키보드·모바일 동작을 검증했습니다. 공개 화면 및 Development Receipt도 아티팩트로 보존합니다.

공개 URL 모바일 Lighthouse 13.6.0 측정(08:27:39 UTC): **Performance 100 / Accessibility 100 / Best Practices 100 / SEO 100**, LCP 1.0초, CLS 0, TBT 0ms. 단일 실험실 측정으로 이전 버전과의 통제 비교나 실사용 성능 보장은 아닙니다. [최종 QA 증거](docs/brand-qa.json)에 테스트·실제 API 응답·로고 해시·성능 지표·조회 시각을 보존했습니다. 마지막 QA 문서 기록은 `[skip ci]`로 게시해 검증된 배포를 유지합니다. 다른 프로젝트·코인 발행·지갑·서명·SOL은 변경하지 않았습니다.

## 이전 상태 — 데모와 저장소 탐색 (2026-11-11)

Try Live Demo로 dnfl1999/memediff 실제 분석, 제출 시 최대 10개 GitHub 공개 이름 검색·선택, 공식 Forks API의 정확한 CA 연결 조회를 추가했습니다. 기존 분석 소스·JSON schema·저장 키·CA는 보존합니다. 사용자 UI는 영어입니다. Forks API가 Pages Origin에 CORS 헤더를 제공하지 않아 배포 시 공식 최근 목록 및 MemeDiff 연결을 수집한 제한된 시각 표시 인덱스를 사용합니다. 실시간 전체 검색이라고 주장하지 않으며 없거나 모호한 연결은 추측하지 않습니다. [조회 방식과 제한](docs/DISCOVERY.md).

단위 **31/31**, 최종 로컬 PC·모바일 E2E **48/48** 통과. 초기 46 통과/2 실패는 모의 429 응답의 Retry-After CORS 노출 누락이었으며 fixture 수정 후 전체 재검증했습니다. 초기 기록과 최종 기록을 각각 `qa-results/discovery-local/`, `qa-results/discovery-local-final/`에 보존했습니다.

dnfl1999 인증 후 제품 커밋 `54e084631a403576e438ef5845426762a09fa0b0`를 main에 안전하게 게시했습니다. [Actions 42984986983](https://github.com/dnfl1999/memediff/actions/runs/42984986983)의 verify/deploy/public-qa 모두 성공. 다운로드한 아티팩트 기준 Linux 빌드 모의 48/48, 공개 모의 48/48, **공개 실제 API 데모·PNG/JSON 및 이름 검색·공식 CA 인덱스 2/2 통과**. 최종 브라우저 합계 **146 passed / 0 failed / 0 skipped**. 실제 API 응답과 콘솔·네트워크 진단은 [QA 증거](docs/discovery-qa.json)에 기록했습니다.

08:13:03 UTC 공개 페이지와 모든 앱 소스가 HTTP 200 및 로컬과 일치하고 한국어 표시 소스 0건임을 확인했습니다. 배포된 공식 인덱스는 08:11:04 UTC 조회 20개 연결이며 공식 CA와 dnfl1999/memediff의 정확한 연결이 있습니다. 공개 브라우저 검색 결과 스크린샷도 확인했습니다. 인덱스는 매 배포에 갱신하며 미등록 CA를 추측하지 않습니다. 실시간 전체 CA 조회는 공식 API의 CORS 미지원 때문에 제공하지 않습니다. 이 제한은 UI·README·상세 문서에 명시했습니다.

필요 시 기존 Pages workflow_dispatch로 공식 인덱스를 갱신·재검증·배포할 수 있습니다. 후속 QA 기록은 문서 전용 `[skip ci]` 커밋으로 게시하여 검증된 제품 배포를 유지합니다. 기존 기능·코인 정보·과거 감사 문서를 보존했으며 다른 프로젝트·지갑·SOL·거래는 변경하지 않았습니다.

## 이전 상태 — 공개 사이트 영어화 (2026-11-11)

공개 UI 전체를 영어로 전환했습니다. `lang=en`, SEO·브랜드 문구, 오류·상태·접근성 문구, UTC/en-US 표시, 영문 README·사용 안내·FAQ를 적용했습니다. 기존 README는 `README.ko.md`에 보존했습니다. 원본 GitHub 설명·커밋·릴리스 텍스트와 과거 감사 자료는 번역하지 않았습니다. 저장 키와 JSON schema 1, 공식 CA, 분석·SHA 비교·내보내기 기능은 유지합니다.

로컬 단위 27/27, Chromium PC·모바일 모의 API E2E 38/38 통과. 한국어 기기 설정의 영어/UTC 표시, 예전 한국어 baseline 무변경 호환, 360/768/1024/1440px 레이아웃, 실제 PNG 디코딩·JSON 구조·CA 복사·콘솔/네트워크 오류를 확인했습니다. 앱 자체 표시 소스 한국어 잔존 0건. 로컬 실제 API 검사는 07:56 UTC GitHub 403/remaining=0으로 1건 skipped, 반복하지 않았습니다. 외부 링크 7개 중 GitHub/Forks 5개 HTTP 200, pump.fun/Solscan 2개 HTTP 403으로 접근 검증 제한. CA 링크는 변경하지 않았습니다. 문서 내부 파일 링크 누락 0건.

dnfl1999 계정으로 제품 커밋 `2faf68de2ac1d6dafcb7e9783d009092d04ff3fd`를 main에 안전하게 게시했습니다. [Actions 42983271329](https://github.com/dnfl1999/memediff/actions/runs/42983271329)의 verify/deploy/public-qa 전부 성공. 아티팩트 확인 결과 Linux 빌드 모의 38/38, 공개 사이트 모의 38/38, 공개 사이트 **실제 GitHub API·JSON/PNG 다운로드 1/1 통과**. 로컬 모의 38건을 포함한 브라우저 결과는 **115 passed / 0 failed / 1 skipped**이며 skipped는 위의 로컬 실제 API 제한입니다. 단위 테스트는 별도 27/27 통과했습니다. 예상된 오류 시나리오 외 콘솔·네트워크 실패는 없습니다.

07:59:13 UTC(16:59:13 KST) 공개 사이트의 HTML/CSS/favicon/모든 JS 9개 파일이 HTTP 200, 로컬 배포 소스와 일치하며 한국어 리터럴 0건임을 확인했습니다. 공개 실제 브라우저 스크린샷의 영어 표시도 확인했습니다. [최종 QA 근거](docs/english-qa.json)에 시간·실제 API 응답·통과/건너뜀·파일 해시·링크 제한을 보존했습니다. 후속 기록 커밋은 문서만 `[skip ci]`로 게시해 검증된 Pages 배포를 유지합니다. 미완료 제품 작업은 없습니다. 다른 프로젝트·온체인 정보·지갑·거래는 변경하지 않았습니다.

## 이전 상태 — 신규 사용자 안내 및 피드백 운영 준비 (2026-11-11)

현재 앱 코드·기능을 보존했습니다. GitHub API에서 `has_issues=true`, `archived=false`, 접수 이슈 0건을 확인했고, 공개 사이트 HTTP 200 및 기존 Issues 링크를 확인했습니다. 사용자 피드백 없이 새로운 기능을 추가하지 않았습니다.

완료한 자료: [사용 안내](docs/GETTING_STARTED.md), [FAQ](docs/FAQ.md), [실제 과거 Receipt 예시](docs/examples/README.md), [기여·피드백 안내](CONTRIBUTING.md), `.github/ISSUE_TEMPLATE/`의 버그/개선 의견 템플릿 및 FAQ 연결. README에서 모두 찾아갈 수 있습니다. [X 소개·후속 소식 초안](docs/COMMUNITY_ANNOUNCEMENT.md)은 작성만 했으며 게시하지 않았습니다.

예시는 기존 실제 공개 API QA의 PNG/JSON을 변경 없이 복사했습니다. 관측 시각은 2026-11-11 07:31:25.463 UTC이며 현재 통계로 주장하지 않습니다. 원본 해시 일치, PNG CRC/1400×1020 디코딩, 실제 커밋 목록에서 두 기간 지표 재계산 일치, 문서 내부 파일 링크, 템플릿 front matter 필수 항목, X 초안 길이를 확인했습니다. PNG의 7일 선택과 원본 JSON의 `selectedDays=30` 차이는 예시 설명에 명시했습니다. 모의 데이터를 실제 자료처럼 게시하지 않았습니다.

이번 변경은 문서·기존 예시 파일·이슈 템플릿뿐입니다. 제품 코드 변경이 없어 단위/E2E 전체 재실행과 Pages 재배포는 하지 않습니다. 기존 제품 커밋 `0fd38d6c88fc3c71c29c1c2aaa410f7d625a090e`의 검증 결과는 아래 이력을 참조합니다. 새로운 테스트 통과로 재기록하지 않습니다. 기존 온체인·수수료·보상 운영 문서는 유지했고 과거 관측값을 새 조회값으로 바꾸지 않았습니다.

dnfl1999 인증·push 권한과 origin/main 일치를 확인했습니다. 문서 변경은 `[skip ci]`로 게시하여 기존 사이트를 보존합니다. 향후 제안: 사용자가 X 초안을 검토해 게시하고, 실제 이슈가 들어오면 재현 가능성과 필요성을 평가합니다. 게시·피드백 수집 성과·지속 모니터링을 이미 수행했다고 주장하지 않습니다. 다른 프로젝트, 지갑, 서명, 청구, 매매, SOL 지출은 작업 대상이 아닙니다.

## 이전 상태 — 실사용 및 운영 개선 (2026-11-11)

16:19:06–16:19:08 KST 기준 공식 CA의 Mainnet 상태·시장·전체 토큰 계정·수수료 금고·Season 공개 보상 현황을 읽기 전용으로 재확인했습니다. 출처·요청별 시각·응답은 [docs/operations-snapshot.json](docs/operations-snapshot.json), 해석 및 유사 서비스 비교는 [docs/OPERATIONS_UPDATE.md](docs/OPERATIONS_UPDATE.md)에 있습니다. DexScreener 유동성 필드는 없었으나, 16:31:50 KST GeckoTerminal 보조 조회에서 같은 풀의 준비금 평가액 $1,862.3936을 확인했습니다. 현금성 SOL·매도 가능 금액으로 단정하지 않았습니다. 홀더는 본딩 커브 포함/제외 주소 수를 구분했고, 공동 금고 몫과 실제 GitHub 계정 적립 잔액도 구분했습니다.

기존 PNG 기능을 재사용해 영어 Development Receipt로 개선했습니다. 정확한 UTC 시작·종료, 최근 원본 항목 링크, 부분 수집 경고, 30일 비교 범위 표시를 추가했습니다. 영어 사용 안내와 주요 버튼 병기, README 안내, 미게시 X 공지 초안도 정비했습니다. 새 데이터 수집·점수·지갑·유료 서비스·게시 자동화는 없습니다.

로컬 단위 테스트 **24/24**, 최종 Windows Chromium 데스크톱·모바일 E2E **32/32** 통과. 실제 PNG 파일을 열어 정상/부분 수집 카드 가독성 확인. 첫 E2E의 2건 실패는 영어를 병기한 기간 버튼 이름을 기존 exact-name 선택자가 찾지 못한 문제였고, 선택자 수정 후 전체 재검증을 통과했습니다. 실패 기록은 `qa-results/receipt-local/`, 최종 결과는 `qa-results/receipt-local-final/`에 보존했습니다. 기존 분석·비교·다운로드·주소 검증은 유지합니다.

dnfl1999 인증 및 push 권한, origin/main과 HEAD 일치를 확인한 후 제품 커밋 `0fd38d6c88fc3c71c29c1c2aaa410f7d625a090e`를 게시했습니다. [Actions 42979878190](https://github.com/dnfl1999/memediff/actions/runs/42979878190)의 **verify / deploy / public-qa 전부 성공**. 다운로드한 아티팩트 기준 Linux 빌드 32/32, Linux 공개 모의·UI 32/32, 실제 GitHub API·JSON/PNG 다운로드 1/1 성공입니다. 최종 실행 합계 **97 passed / 0 failed / 0 skipped**(로컬 32 포함); 앞선 선택자 실패 2건은 별도 이력으로 보존했습니다. [docs/receipt-qa.json](docs/receipt-qa.json)에 결과를 기록했습니다.

공개 URL https://dnfl1999.github.io/memediff/ 에서 HTML·CSS·app.js·receipt.js 모두 HTTP 200이며 로컬 검증 파일과 일치합니다. 실제 API로 생성한 7일 MemeDiff PNG도 열어 확인했습니다. 후속 운영 결과 문서 커밋은 `[skip ci]`로 불필요한 재배포를 생략하며 제품 코드는 동일합니다. 추가 개발/배포 작업 없음. X 초안은 미게시이며 로그인 후 CA별 보상 확인, 향후 청구·서명·자산 이동은 사용자 직접 승인 대상입니다. 기존 코인 감사 및 이전 QA는 아래 이력입니다.

## 이전 상태 — 코인 발행 후 감사 및 사이트 정비 (2026-11-11)

사용자가 직접 진행한 발행을 읽기 전용으로 확인했습니다. 공식 CA는 `DPcyk5GUWkjtZV6PXzrxsAyAUKGZ4pkUsHb9cFnBfork`입니다. Mint 생성, Forks 저장소 연결, 초기 0.2 SOL 매수, 토큰 수령, 50/30/20 creator-fee 배분 및 관리자 권한 폐기를 온체인에서 확인했습니다. 세부 정산과 한계는 [POST_LAUNCH_AUDIT.md](POST_LAUNCH_AUDIT.md), 공개 원본 관측은 [docs/launch-evidence.json](docs/launch-evidence.json)에 있습니다.

README 및 사이트에 영어 프로젝트 코인 정보와 CA 복사를 추가했습니다. 기존 분석 로직은 변경하지 않았습니다. [ROADMAP.md](ROADMAP.md), [운영 API 안내](docs/TOKEN_OPERATIONS.md), [미게시 영어 공지 초안](docs/COMMUNITY_ANNOUNCEMENT.md)을 작성했습니다. 다른 프로젝트는 변경하지 않았으며 이번 작업에서 지갑·서명·매수·청구·SOL 지출을 실행하지 않았습니다.

로컬 검증: 단위 테스트 **20/20**, 빌드 성공, Windows 독립 Chromium 데스크톱·모바일 E2E **28/28**. 기존 모의 API 회귀 24개와 새 코인 정보/클립보드 검증 4개입니다. JSON 다운로드 및 PNG 디코딩 포함. 콘솔·예상하지 않은 네트워크 실패 없음. 초기 샌드박스 실행은 자식 프로세스 `spawn EPERM`으로 차단되었으나, 승인된 외부 실행에서 같은 테스트가 통과했습니다. 두 화면 스크린샷을 실제 확인했습니다.

게시 전 dnfl1999 인증 및 push 권한 확인, origin/main과 HEAD 일치 확인 완료. 제품 커밋 `900edbf74e651b356c7254c9688d7964ae705a89`의 [Actions 42977232545](https://github.com/dnfl1999/memediff/actions/runs/42977232545)는 **verify / deploy / public-qa 모두 성공**했습니다. 아티팩트를 내려받아 Linux 빌드 E2E 28/28, Linux 공개 사이트 E2E 28/28, **실제 GitHub API·JSON/PNG 다운로드 1/1 성공**을 확인했습니다. 이번 로컬·CI 브라우저 실행 합계는 **85 passed / 0 failed / 0 skipped**입니다. API 모의 응답 84건과 실제 API 1건을 구분합니다. 초기 자식 프로세스 실행 차단은 실행 전 환경 오류로 별도 기록합니다.

공개 URL https://dnfl1999.github.io/memediff/ 의 index.html, style.css, src/token.js가 HTTP 200이며 검증된 로컬 파일과 일치함을 확인했습니다. 결과 요약: [docs/post-launch-qa.json](docs/post-launch-qa.json). 이후 문서 결과 기록 커밋은 `[skip ci]`이며 배포된 제품 코드는 동일합니다. 남은 개발/배포 작업 없음. 사용자 로그인 후 CA별 Season 보상 이력 확인과 향후 수수료 청구는 사용자 직접 작업이며, 이번 감사에서 실행하지 않았습니다.

아래는 코인 발행 이전 단계의 이력이며, 현재 발행 상태는 위 감사 문서를 우선합니다.

## 이전 상태 — 독립 Playwright 검증 완료

사용자가 독립 Playwright 사용을 명시적으로 요청하여 이전 연결 도구 장애를 우회했습니다. Windows Chromium에서 로컬 모의 API E2E 24/24, 공개 사이트 모의 API E2E 24/24 통과. Linux Chromium에서도 빌드 결과 24/24, 공개 사이트 24/24, **실제 비인증 GitHub API 및 JSON/PNG 다운로드 1/1 통과**했습니다. 환경별 반복 실행을 합해 **97 passed / 0 failed / 1 skipped**입니다. Windows 실제 API 1건의 403 제한은 skipped로 별도 보존했습니다. 기존 단위 테스트 20/20과 npm audit 0 vulnerabilities도 확인했습니다.

검증 및 Pages 배포 완료: [Actions 42961852898](https://github.com/dnfl1999/memediff/actions/runs/42961852898). 검증 커밋 `b6b959c7317c07108896a6d3cd3bc40cf584e109`. 제품 기능은 보존했고 새 제품 결함은 발견되지 않았습니다. 테스트 러너 범위를 분리하고 자동 E2E/아티팩트 보관을 추가했습니다. 상세 결과·한계·재현 명령: [docs/BROWSER_QA.md](docs/BROWSER_QA.md).

남은 필수 QA 없음. 기존 브라우저 연결 호스트의 내부 장애는 복구하지 않았으나 독립 환경에서 요구 기능을 검증했습니다. 모바일 검증은 Chromium 에뮬레이션이며 실제 휴대전화 기종 전체에 대한 보증은 아닙니다. 사용자에게 필요한 로그인·권한 변경·수동 조치는 없습니다. 지갑·서명·결제·발행은 여전히 실행하지 않았습니다.

아래의 브라우저 차단/미검증 표기는 이전 단계의 이력입니다. 최신 검증 결과는 위 문서를 우선합니다.

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

### 최종 완료 감사 및 차단 상태

세 번째 연속 목표 실행에서도 브라우저 목록 조회가 `The browser access host is unavailable`을 반환했습니다. 이전 실행에서는 네이티브 Chrome 접근/복구도 실패했습니다. 현재 제공된 브라우저 경로로 실제 화면 조작과 다운로드 검증을 완료할 수 없어 목표는 **완료가 아닌 blocked(외부 환경 복구 대기)** 상태입니다.

| 원래 요구 단계 | 현재 근거 및 판정 |
| --- | --- |
| 1. 현황·계정·독립성 | 빈 폴더, dnfl1999 인증 및 공개 저장소 확인. 다른 프로젝트 변경 없음 |
| 2. 서비스 기능 | 구현 및 핵심 로직 테스트 완료. 실제 브라우저 동작에 대한 최종 증거는 부족 |
| 3. 품질 | 자동 테스트 20/20, 빌드, 개인정보·비밀키·라이선스 검토 완료. 모바일 화면 및 E2E 미완료 |
| 4. GitHub 게시 | main에 정상 push, 강제 변경 없음. 앱 커밋 58a2a9713857cfc1b7a8bb9a359365362434afa7 |
| 5. Pages | 해당 앱 커밋 Actions 42960822763 성공, 변경된 공개 JS HTTP 200 및 빌드 일치. 공개 URL의 실제 클릭·내보내기 검증 미완료 |
| 6. Forks Wiki | 공식 현재 자료와 launch plan ok:true 확인. 비용 구성·후보·조건·불확실성 문서화. 지갑·서명·발행 미실행 |
| 7. 보고·재개 | 한국어 결과 보고 및 이 파일에 상태·검증 범위·재개 절차 기록 |

재개 조건: 브라우저 연결 호스트가 다시 사용 가능해야 합니다. 대안인 Windows 앱 경로를 쓰려면 Chrome을 최소화 해제하고 공개 MemeDiff 페이지를 연 상태가 필요합니다. 그 후 남은 검증만 이어갑니다. 사용자에게 인증값이나 지갑 권한은 필요하지 않습니다.

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
