# 가까이 · neartrip

숙소 근처의 맛집·카페·가볼 만한 곳·술집을 골라 오늘의 동선을 만듭니다.

[서비스](https://neartrip-one.vercel.app) · [스펙·컨셉](neartrip.wiki/Home.md) · [작업 티켓](https://github.com/eomttt/neartrip/issues)

## 실행

Node.js 22.12 이상이 필요합니다.

```sh
npm ci
npm run dev
```

화면과 API: http://127.0.0.1:5173

키가 없으면 가상 장소 8곳과 개략도를 쓰는 예시 모드로 실행됩니다.
첫 화면과 `/privacy`, `/guide`는 브라우저의 선호 언어 순서에 따라 한국어 또는 영어로 열립니다. `next-i18next`가 `Accept-Language`의 우선순위를 반영하며 지원 언어가 없으면 영어로 표시합니다. 언어 전환 버튼과 언어 저장 쿠키는 사용하지 않습니다. `/ko`, `/en`으로 직접 들어오면 주소에 지정된 언어로 열립니다.

## Google 지도와 장소 검색

`.env.example`을 참고해 `.env.local`에 설정합니다. 1Password 마운트는 파일을 복사하지 않고 Environment에서 갱신합니다.

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=Google_브라우저_키
GOOGLE_PLACES_API_KEY=Google_서버_키
DEMO_MODE=false
```

Google Cloud 프로젝트에서 결제 계정과 Maps JavaScript API, Places API (New)가 필요합니다. 두 Google 키를 분리합니다. 공개 키는 Maps JavaScript API와 웹사이트 리퍼러로 제한하고 `http://127.0.0.1:5173/*`, `https://neartrip-one.vercel.app/*` 및 사용하는 Preview 도메인을 허용합니다. 서버 키는 Places API (New)만 허용하며 `NEXT_PUBLIC_` 이름을 쓰지 않습니다. Vercel의 서버 키는 Secret으로 등록합니다. 공개 키 변경 후에는 다시 빌드합니다.

지도·검색·주변 장소에 화면 언어 `ko` 또는 `en`을 전달합니다. Google에 해당 언어의 번역이 없는 장소는 현지 언어로 반환될 수 있습니다. 일반 검색은 최대 8곳, 주변 검색은 네 카테고리에 각각 최대 20곳을 요청하고 중복 장소를 합칩니다. 한국 밖 결과와 반경 밖 결과는 제외합니다. 주변의 모든 장소를 수집하는 기능은 아닙니다. 주변 장소 목록은 Google 평점과 리뷰 수를 함께 요청합니다. 출발·도착지 검색에는 평점 필드를 요청하지 않습니다. 사진이나 리뷰 본문은 가져오지 않습니다. 검색 요청에 실패해도 자동으로 과금 요청을 반복하지 않습니다.

키가 일부만 등록된 경우에는 가상 결과로 전환하지 않고 설정 오류를 표시합니다. 지도 표시와 장소 검색은 Google을 사용합니다. Neartrip은 방문 순서와 위치를 정리하며 실제 이동 경로와 시간은 구간별 네이버 지도·Google Maps 링크에서 확인합니다. 관광청의 행사·반려동물 정보도 기존 원문을 유지합니다.

[Google 키 제한](https://developers.google.com/maps/api-security-best-practices) · [Places 요금](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) · [한국 지도 지원 범위](https://developers.google.com/maps/coverage)

### Google 운영 전 확인

결제 계정을 연결한 뒤 Maps JavaScript API와 Places API (New)의 할당량을 확인합니다. 필요한 API만 켜고 자동 할당량 증액은 사용하지 않습니다. 호출 한도에 도달하면 지도나 검색을 사용할 수 없습니다. 예산 알림은 청구를 차단하지 않으며 무료 한도를 자동으로 지켜주는 설정이 아닙니다.

2026년 9월 24일 기준 월 무료 사용량은 Dynamic Maps 10,000회, Text Search Pro 5,000회, Nearby Search Enterprise 1,000회입니다. 같은 결제 계정의 프로젝트 사용량을 합산합니다. 전체 카테고리 주변 검색 한 번은 Nearby Search 최대 4회, 방문 순서 정리는 외부 경로 API를 호출하지 않습니다. 방문자 수와 API 호출 수를 같은 값으로 계산하지 않습니다. [현재 가격표](https://developers.google.com/maps/billing-and-pricing/pricing)와 [비용 관리 문서](https://developers.google.com/maps/billing-and-pricing/manage-costs)를 배포 전에 다시 확인합니다.

2026년 9월 24일 프로젝트 일일 한도는 지도 로드 300회, 장소 검색 150회, 주변 검색 30회로 설정했습니다. 사용하지 않는 Places 메서드와 3D 지도·Grounding Widget의 일일 한도는 0입니다. 이 설정은 현재 요청 필드와 같은 결제 계정의 다른 사용량이 변하지 않는다는 전제이며 요금 0원을 보장하지 않습니다. `neartrip-first-charge` 예산은 Neartrip에서 월 1원 사용 시 소유자에게 알립니다.

Production에 두 Google 키를 등록하고 재빌드한 뒤 실제 지도 표시, 한국어·영어 검색, 주변 장소 선택을 검증합니다. 지도 화면을 이동 안내 시트가 가리지 않는지도 모바일과 데스크톱에서 확인합니다. 키가 없는 상태로 현재 브랜치를 배포하지 않습니다.

한국의 Google 자동차·도보 경로 API 지원 제한 때문에 내부 도로 경로 계산을 제공하지 않습니다. 구간별 네이버 지도·Google Maps 링크로 실제 길찾기를 엽니다. 차량·택시는 자동차 모드, 도보·대중교통은 대중교통 모드로 열며 외부 앱에서 변경할 수 있습니다.

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
4. 이동 안내 시트에서 구간을 눌러 도착 장소를 확인하고 구간별 네이버 지도·Google Maps 길찾기를 엽니다.

PC는 화면 폭 1,024px부터 장소 목록과 지도를 나란히 보여줍니다. 기본 검색 반경은 10km이며 차량·택시 이동으로 시작합니다. 모바일 기본값은 반경 1km와 도보·대중교통입니다. 모든 화면에서 검색 반경을 최대 20km까지 넓히고 이동 방식을 바꿀 수 있습니다. 창 크기를 바꿔도 선택한 반경과 이동 방식은 유지합니다.

실제 지도에는 선택한 장소와 방문 순서를 표시합니다. 실제 일정에 이동 시간·거리·도로 경로를 추정해 표시하지 않습니다. 예시 모드의 거리·시간·동선은 조작 방법을 보여주기 위한 가상 데이터입니다.

## 개발·배포

### Google AdSense

공통 레이아웃에는 게시자 `pub-9152190009267204`의 확인 메타 태그만 넣습니다. `/ads.txt`에서도 같은 게시자를 확인할 수 있습니다. 광고 코드는 본문을 서버에서 표시하는 `/ko/guide`, `/en/guide`에서만 불러옵니다. 검색·지도, 개인정보 안내, 오류 화면에는 광고 코드를 넣지 않습니다. 개발 서버와 Vercel Preview에서도 불러오지 않으며, `ADSENSE_ENABLED=false`로 설정하고 다시 배포하면 광고를 끕니다.

애드센스의 사이트 목록에 `neartrip-one.vercel.app`을 등록하고 배포 후 소유권 확인과 검토 요청을 완료합니다. 승인 후 사이트의 자동 광고를 켜야 광고가 표시됩니다. 가이드에서 광고 미리보기를 확인하고, 검색·지도와 개인정보 안내 경로는 자동 광고에서 제외합니다. 로딩 화면만 수집되지 않도록 첫 화면의 공개 설정을 서버에서 전달하고 가이드 요약도 서버에서 표시합니다. `/robots.txt`와 `/sitemap.xml`에서 공개 콘텐츠 경로를 안내합니다. 최종 승인 여부는 Google의 재검토 결과로 확인합니다.

개인정보처리방침은 `/ko/privacy`와 `/en/privacy`에 있으며 사용법 창에서 열 수 있습니다. 유럽 경제 지역·영국·스위스 방문자의 광고 동의는 애드센스의 '개인 정보 보호 및 메시지'에서 Google 인증 동의 메시지를 설정합니다.

[사이트 연결 안내](https://support.google.com/adsense/answer/7584263?hl=ko) · [ads.txt 안내](https://support.google.com/adsense/answer/12171612?hl=ko) · [광고 쿠키 필수 안내](https://support.google.com/adsense/answer/1348695?hl=ko)

### 검증과 배포

Next.js App Router · React · TypeScript · TanStack Query · shadcn/ui

```sh
npm run check
npm run format:check
```

Vercel의 Next.js 프리셋으로 화면과 API를 함께 배포합니다. Production과 Preview의 환경변수·Google 허용 리퍼러는 각각 설정합니다. `main`에 푸시하면 Vercel의 GitHub 연결을 통해 자동 배포됩니다.

API 요청 제한은 인스턴스별 분당 60회입니다. 실제 길찾기는 외부 지도에서 제공합니다.

오류가 발생하면 화면의 추적 ID로 Vercel Logs를 검색합니다. `api_failure` 로그에는 요청 본문, 관광정보 응답, 검증 실패 위치와 최종 응답이 담깁니다. 키·인증 정보는 가리고 긴 좌표 목록은 일부만 남깁니다. Google 장소 응답 원문은 공급자 로그에 저장하지 않습니다. 정상 요청은 상태와 소요 시간만 기록합니다.
