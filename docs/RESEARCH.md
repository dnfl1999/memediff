# 독립성 검토 · 2026-11-11

GitHub 활동 집계 자체는 새로운 기능이 아닙니다. 다음 공식 자료와 기능 범위를 비교했습니다. 이 목록은 전 세계 모든 프로젝트에 대한 중복 검사 또는 독창성 인증이 아닙니다.

| 도구 | 겹치는 기능 | MemeDiff의 구체적인 초점 |
| --- | --- | --- |
| [GitHub Pulse](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/using-pulse-to-view-a-summary-of-repository-activity) | 기간별 커밋 활동 및 기여자 | 사용자 입력 토큰 주소와 결합한 로컬 기준, SHA 관측 차이, 보고서 내보내기 |
| [OSSInsight](https://ossinsight.io/) | GitHub 저장소 활동 분석 | 별도 수집 서버 없는 정적 도구, 조회별 API 원본과 수집 한계 표시 |
| [CHAOSS CollectOSS](https://github.com/chaoss/CollectOSS/) | 오픈소스 커뮤니티 지표 수집 | 소규모 공개 자료 확인에 집중한 무설치 브라우저 흐름 |

어느 도구의 소스도 복제하지 않았습니다. 차별화는 단순 UI 변경이 아니라 **동일 저장소·브랜치·토큰의 과거 SHA 증거와 현재 증거를 비교하고, 기간 이동과 수집 불완전성을 설명하는 기능**입니다. 가격·신뢰도·안전성을 점수로 환산하지 않습니다.

API 기준: [GitHub commits](https://docs.github.com/en/rest/commits/commits), [rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).
