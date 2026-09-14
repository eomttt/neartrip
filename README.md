# 가까이 · neartrip

숙소 근처의 맛집·카페·가볼 만한 곳·술집을 골라 오늘의 동선을 만듭니다.

[서비스](https://neartrip-one.vercel.app) · [스펙·컨셉](https://github.com/eomttt/neartrip/wiki) · [작업 티켓](https://github.com/eomttt/neartrip/issues)

## 실행

Node.js 22.12 이상이 필요합니다.

```sh
npm ci
npm run dev
```

화면과 API: http://127.0.0.1:5173

키가 없으면 가상 장소 8곳과 개략도를 쓰는 예시 모드로 실행됩니다.

## 카카오 연결

`.env.example`을 참고해 `.env.local`에 설정합니다.

```dotenv
KAKAO_REST_API_KEY=카카오_REST_API_키
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=카카오_JavaScript_키
DEMO_MODE=false
```

REST 키는 서버 전용이며 Vercel에서는 Secret으로 등록합니다. JavaScript 키는 브라우저에 공개되는 Config입니다. 카카오 JavaScript 키의 허용 도메인에 로컬 주소와 배포 주소를 등록하세요. 키 변경 후에는 다시 빌드합니다.

`.env.local`은 Git에서 제외됩니다. 기존 1Password 마운트의 `VITE_KAKAO_JAVASCRIPT_KEY`도 호환합니다.

## 행사·반려견 장소

공공데이터포털에서 [국문 관광정보](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15101578)와 [반려동물 동반여행](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15135102)을 각각 활용 신청합니다. Decoding 인증키를 서버 환경변수 `TOUR_API_SERVICE_KEY`로 설정합니다. Vercel에서는 Secret으로 등록하고 다시 배포합니다.

행사는 한국 시간으로 오늘부터 이번 주 일요일까지 열리는 곳을 찾으며, 월요일에 다음 주 범위로 바뀝니다. 반려견 동반 정보는 주변 장소 카드에 조건과 함께 표시합니다. 공공 장소는 반경 20km까지 조회할 수 있습니다. 가까운 후보 10곳씩 확인하므로 결과가 없어도 ‘주변에서 더 찾기’로 다음 후보를 조회할 수 있습니다. 운영 시간과 반려견 입장 조건은 방문 전에 확인하세요. 성공한 관광정보 응답은 서버 인스턴스에서 30분간 재사용합니다.

## 주변 혼잡도

[서울 열린데이터광장](https://data.seoul.go.kr/dataList/OA-21778/A/1/datasetView.do) 인증키를 Vercel Secret `SEOUL_OPEN_API_KEY`로 설정합니다. 서울시 121개 구역의 경계 안에 있는 장소에만 주변 혼잡도를 표시합니다. 개별 매장의 대기 인원이 아닙니다.

조회 결과는 구역별로 5분간 공유합니다. 갱신 시각을 표시하며 20분 넘은 데이터는 갱신 지연으로 구분합니다. 혼잡도 조회가 실패해도 장소 선택과 동선 생성은 계속 사용할 수 있습니다.

## 사용 흐름

1. 출발지를 검색하고 선택합니다.
2. 주변 장소·이번 주 행사 중에서 최대 5곳 담습니다. 출발·도착점 요약을 누르면 수정할 수 있으며 도착점은 선택 사항입니다.
3. 담은 순서대로 동선을 만듭니다. 도착점이 없으면 출발점으로 돌아옵니다.
4. 이동 안내 시트에서 구간을 눌러 지도에서 강조하거나 구간별 카카오맵 길찾기를 엽니다.

도보는 실선, 대중교통은 점선으로 표시합니다. 도보 20분·대중교통 5정거장 조건을 넘는 구간도 경고와 경로를 함께 보여줍니다. 예시 모드의 거리·시간·동선은 실제 길찾기가 아닙니다.

## 개발·배포

Next.js App Router · React · TypeScript · TanStack Query · shadcn/ui

```sh
npm run check
npm run format:check
```

Vercel의 Next.js 프리셋으로 화면과 API를 함께 배포합니다. Production과 Preview의 환경변수·카카오 허용 도메인은 각각 설정합니다. 현재 GitHub 자동 배포 연결은 완료되지 않았습니다.

API 요청 제한은 인스턴스별 분당 60회입니다. 알려진 경로 응답 오류는 [#7](https://github.com/eomttt/neartrip/issues/7)과 [#9](https://github.com/eomttt/neartrip/issues/9)에서 추적합니다.

오류가 발생하면 화면의 추적 ID로 Vercel Logs를 검색합니다. `api_failure` 로그에는 요청 본문, 구간별 카카오 응답과 관광정보 응답, 검증 실패 위치와 최종 응답이 담깁니다. 키·인증 정보는 가리고 긴 좌표 목록은 일부만 남깁니다. 정상 요청은 상태와 소요 시간만 기록합니다.
