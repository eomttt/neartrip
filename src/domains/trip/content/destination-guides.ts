import type { Locale } from '@/common/i18n/locale';

interface GuideCopy {
  title: string;
  description: string;
  introduction: string;
  sections: { id: string; title: string; paragraphs: string[]; sourceUrl?: string }[];
  checklist: string[];
}

interface DestinationGuide {
  slug: string;
  published: string;
  updated: string;
  copy: Record<Locale, GuideCopy>;
}

export const guideLabels = {
  en: {
    title: 'Korea travel guides',
    description: 'Plan a neighborhood outing and get comfortable finding your way around Korea.',
    planner: 'Korea trip planner',
    guide: 'Planning guide',
    author: 'neartrip',
    updated: 'Updated',
    contents: 'In this guide',
    source: 'Check the official information',
    checklist: 'Before you set off',
    action: 'Plan a day near your hotel',
    actionDescription:
      'Search for your hotel, choose nearby stops, and put them in your visiting order. No account needed.',
    related: 'More Korea travel guides',
    faqTitle: 'Planning your Korea trip with neartrip',
    introduction:
      'neartrip is a free Korea day trip planner for travelers who want to explore around their hotel. Search in English, compare Google place ratings, and build a visiting order with up to five restaurants, cafés, sights or bars. Open each leg in NAVER Map or Google Maps when you are ready to go.',
    questions: [
      {
        question: 'Can I use neartrip in English?',
        answer:
          'Yes. The site follows your browser’s preferred language and uses English unless Korean is preferred. Place searches use the page language. Some place names and public tourism information may still appear in Korean.',
      },
      {
        question: 'Does neartrip calculate walking times or book attractions?',
        answer:
          'neartrip helps you choose stops and arrange their order. It does not calculate road routes, book tickets, or check live opening hours. Use the directions links and each venue’s official information before leaving.',
      },
      {
        question: 'Is neartrip free and do I need an account?',
        answer:
          'You can use the planner without paying or creating an account. Map and search availability is subject to service limits. Venue admission, meals and transport are separate costs.',
      },
    ],
  },
  ko: {
    title: '한국 여행 가이드',
    description: '동네 여행 계획과 한국에서 길을 찾는 방법을 살펴보세요.',
    planner: '한국 여행 동선 만들기',
    guide: '여행 계획 가이드',
    author: 'neartrip',
    updated: '수정일',
    contents: '이 글의 내용',
    source: '공식 안내 확인하기',
    checklist: '출발 전 확인할 것',
    action: '숙소 근처 하루 여행 만들기',
    actionDescription:
      '숙소를 검색하고 주변 장소를 담아 방문 순서를 정하세요. 회원가입 없이 사용할 수 있습니다.',
    related: '함께 읽을 한국 여행 가이드',
    faqTitle: 'neartrip으로 한국 여행 계획하기',
    introduction:
      'neartrip은 숙소 주변을 둘러볼 여행자를 위한 무료 한국 여행 계획 도구입니다. 맛집·카페·명소·술집의 Google 별점을 비교하고 최대 다섯 곳의 방문 순서를 정할 수 있습니다. 실제 이동은 구간별 네이버 지도나 Google Maps 길찾기에서 확인하세요.',
    questions: [
      {
        question: '영어로도 사용할 수 있나요?',
        answer:
          '브라우저의 선호 언어를 따르며 한국어가 우선이 아니면 영어로 열립니다. 장소 검색도 화면 언어를 사용합니다. 일부 장소 이름과 공공 관광정보는 한국어로 표시될 수 있습니다.',
      },
      {
        question: '도보 시간 계산이나 관광지 예약도 되나요?',
        answer:
          'neartrip은 장소를 고르고 방문 순서를 정하는 도구입니다. 도로 경로 계산, 예약, 실시간 영업 여부 확인은 제공하지 않습니다. 출발 전에 길찾기 링크와 각 장소의 공식 안내를 확인하세요.',
      },
      {
        question: '무료인가요? 회원가입이 필요한가요?',
        answer:
          '결제나 회원가입 없이 여행 계획을 만들 수 있습니다. 지도와 검색은 서비스 사용 한도의 영향을 받습니다. 입장료·식비·교통비는 별도입니다.',
      },
    ],
  },
};

export const destinationGuides: DestinationGuide[] = [
  {
    slug: 'myeongdong-half-day-itinerary',
    published: '2026-09-24',
    updated: '2026-09-24',
    copy: {
      en: {
        title: 'Myeongdong Half-Day Itinerary from Your Hotel',
        description:
          'Plan a flexible Myeongdong outing with Namdaemun Market, a meal and Myeongdong Cathedral. Adjust the stops around your hotel and check each walking route.',
        introduction:
          'Staying in Myeongdong with an afternoon free? Start with one meal, one place to explore and a break. This suggested plan combines Namdaemun Market with the Myeongdong area without assuming that every traveler starts at the same station or walks at the same pace.',
        sections: [
          {
            id: 'choose-a-start',
            title: 'Start with your hotel and your finish time',
            paragraphs: [
              'Search for your exact hotel in neartrip and check the address before selecting it. If you need to finish at Seoul Station or another hotel, set that as your destination. Otherwise, the planner brings the visiting order back to your starting point.',
              'Treat half a day as a time budget rather than a promise about this route. For example, in four hours you might set aside an hour for a meal, an hour for browsing, half an hour for a café and the remainder for travel and delays. Check the actual journeys before deciding that everything fits.',
            ],
          },
          {
            id: 'namdaemun-market',
            title: 'Browse Namdaemun Market before committing to more shopping',
            paragraphs: [
              'The Korea Tourism Organization places Namdaemun Market near Myeongdong and Euljiro. It makes a useful candidate for a market stop, but choose what you want to do there before adding another shopping area to the day.',
              'Look for Namdaemun Market in the nearby list, using the Things to do filter and a wider radius if needed. Search results are a selection, not a complete directory. If a stop is absent, use an external map to check it rather than assuming it is closed.',
              'Market stalls and individual businesses can keep different hours. Check the specific shop or restaurant you want to visit. Leave room to shorten the browsing stop if your meal reservation or final train has a fixed time.',
            ],
            sourceUrl:
              'https://english.visitkorea.or.kr/svc/contents/contentsView.do?dataSetId=264&menuSn=929&vcontsId=249970',
          },
          {
            id: 'meal-and-cathedral',
            title: 'Choose a meal and a Myeongdong Cathedral visit',
            paragraphs: [
              'Pick one restaurant near the rest of your stops instead of crossing the city for every meal. Use the rating together with the number of reviews as a starting point, then open the full listing to check the menu and current hours. A high score alone cannot tell you whether the food, price or queue suits your day.',
              'Visit Seoul identifies Myeongdong Cathedral as Korea’s first Roman Catholic parish church. It is an active religious site, so check the cathedral’s visitor information and respect services when planning a visit.',
              'The order is yours: market, meal, cathedral and a café is one example. Reverse it if your hotel location or a booking makes that more convenient. You do not need to fill all five available stops.',
            ],
            sourceUrl:
              'https://english.visitseoul.net/attractions/Myeongdong%20Cathedral/ENP004036',
          },
          {
            id: 'check-the-route',
            title: 'Check each journey and keep one optional stop',
            paragraphs: [
              'After arranging the stops, open each leg in NAVER Map or Google Maps. Confirm the entrance and travel mode in the destination app. A nearby pin is not a walking-time estimate: crossings, slopes and the entrance you use can change the journey.',
              'Keep the café or extra shopping stop optional. If it rains or you run late, dropping that stop is easier than rushing the whole afternoon. neartrip provides a planning outline, not a live schedule or a booked tour.',
            ],
          },
        ],
        checklist: [
          'Confirm your hotel address and final destination.',
          'Check the specific shops, meal hours and cathedral visitor information.',
          'Review each walking or transit leg in a directions app.',
          'Leave one stop optional and allow time to return.',
        ],
      },
      ko: {
        title: '숙소에서 시작하는 명동 반나절 여행 코스',
        description:
          '남대문시장, 식사, 명동성당을 묶어 명동 반나절 일정을 만들어보세요. 숙소 위치에 맞게 순서를 바꾸고 구간별 실제 이동을 확인하는 안내입니다.',
        introduction:
          '명동 숙소에서 오후 시간이 남는다면 식사 한 번, 둘러볼 곳 하나, 휴식부터 정하세요. 남대문시장과 명동 주변을 묶은 계획 예시입니다. 출발역이나 걷는 속도를 모두 같다고 가정하지 않습니다.',
        sections: [
          {
            id: 'choose-a-start',
            title: '숙소와 마지막 도착 시간부터 정하기',
            paragraphs: [
              'neartrip에서 숙소 이름을 검색하고 주소를 확인한 뒤 출발점으로 선택하세요. 서울역이나 다른 숙소에서 마칠 예정이라면 도착점도 지정하세요. 비워두면 출발점으로 돌아오는 순서가 됩니다.',
              '반나절은 시간 예산이지 이 코스의 소요 시간을 뜻하지 않습니다. 네 시간 중 식사 한 시간, 구경 한 시간, 카페 30분을 잡고 나머지를 이동과 대기에 남기는 식입니다. 실제 길찾기를 확인한 뒤 일정에 들어가는지 판단하세요.',
            ],
          },
          {
            id: 'namdaemun-market',
            title: '남대문시장부터 둘러보고 쇼핑 일정 조절하기',
            paragraphs: [
              '한국관광공사는 남대문시장을 명동과 을지로 근처의 시장으로 소개합니다. 시장에서 무엇을 보고 싶은지 먼저 정하고 다른 쇼핑 장소를 더하세요.',
              '주변 목록의 가볼 만한 곳에서 남대문시장을 찾아보세요. 필요하면 검색 반경을 넓힐 수 있습니다. 결과에 없는 장소가 문을 닫았다는 뜻은 아니므로 외부 지도에서도 확인하세요.',
              '시장 안의 매장마다 운영 시간이 다를 수 있습니다. 방문할 가게와 식당의 안내를 확인하세요. 예약이나 열차 시간이 정해져 있으면 구경 시간을 줄일 여유를 남겨두세요.',
            ],
            sourceUrl:
              'https://english.visitkorea.or.kr/svc/contents/contentsView.do?dataSetId=264&menuSn=929&vcontsId=249970',
          },
          {
            id: 'meal-and-cathedral',
            title: '식사와 명동성당 방문 묶기',
            paragraphs: [
              '다른 방문지와 가까운 식당 하나를 고르세요. 별점과 리뷰 수를 함께 보고 상세 지도에서 메뉴와 영업시간을 확인하세요. 점수가 높아도 가격이나 대기 시간이 오늘 일정에 맞지 않을 수 있습니다.',
              '서울관광재단은 명동성당을 한국 최초의 천주교 본당으로 소개합니다. 예배가 열리는 종교 시설이므로 방문 안내를 확인하고 미사에 방해되지 않도록 계획하세요.',
              '시장, 식사, 성당, 카페는 방문 순서의 한 예시입니다. 숙소 위치나 예약에 맞춰 순서를 바꾸세요. 다섯 곳을 모두 채울 필요는 없습니다.',
            ],
            sourceUrl:
              'https://english.visitseoul.net/attractions/Myeongdong%20Cathedral/ENP004036',
          },
          {
            id: 'check-the-route',
            title: '구간별 이동을 확인하고 한 곳은 선택 사항으로 남기기',
            paragraphs: [
              '순서를 정한 뒤 네이버 지도나 Google Maps에서 구간별 길찾기를 여세요. 실제 입구와 이동 방식을 확인하세요. 가까워 보이는 표시점도 횡단보도나 경사 때문에 걷는 시간이 달라집니다.',
              '카페나 추가 쇼핑은 시간이 남으면 들를 곳으로 두세요. 비가 오거나 일정이 늦어지면 한 곳을 빼기 쉽습니다. neartrip은 계획 초안을 만드는 도구이며 실시간 시간표나 예약 상품이 아닙니다.',
            ],
          },
        ],
        checklist: [
          '숙소 주소와 마지막 도착점을 확인하세요.',
          '가게·식사 시간과 성당 방문 안내를 확인하세요.',
          '각 구간의 도보·대중교통 길찾기를 확인하세요.',
          '한 곳은 선택 사항으로 남기고 돌아올 시간을 잡으세요.',
        ],
      },
    },
  },
  {
    slug: 'naver-map-google-maps-korea',
    published: '2026-09-24',
    updated: '2026-09-24',
    copy: {
      en: {
        title: 'Google Maps or NAVER Map in Korea? A Traveler’s Guide',
        description:
          'Use Google place information to choose stops and NAVER Map or Google Maps to check each journey in Korea. Learn English setup and the neartrip planning workflow.',
        introduction:
          'For a day out in Korea, separate two decisions: where you want to go and how you will get there. neartrip lets you compare nearby places using Google Maps information, then open the next journey in either NAVER Map or Google Maps. Check the route in that app before setting off.',
        sections: [
          {
            id: 'choose-places',
            title: 'Use place details to decide where to go',
            paragraphs: [
              'Search for your hotel in English and verify its address. In the nearby list, compare restaurants, cafés, sights and bars. Where Google supplies them, neartrip displays a rating and the number of reviews. Open the Google Maps listing to read more before choosing a stop.',
              'A place result is not a reservation or confirmation that the venue is open today. Check the official venue page for current hours and booking rules. Public tourism entries may have a Korean name and no Google rating; an absent rating does not mean a score of zero.',
            ],
          },
          {
            id: 'naver-in-english',
            title: 'Set NAVER Map to English',
            paragraphs: [
              'NAVER’s help center documents English, Korean, Japanese and Simplified Chinese support. In the app, open the MY profile area, then Settings and Language. On iOS, you can also choose the preferred language in the device settings for NAVER Map.',
              'If English is missing from the iOS language menu, NAVER advises adding it to the device’s preferred languages. Check the official instructions below for your current app and operating system. Some place names may still appear in Korean, so keep the street address handy.',
            ],
            sourceUrl: 'https://help.naver.com/service/5637/contents/8275?osType=MOBILE',
          },
          {
            id: 'directions',
            title: 'Check walking or transit directions for each leg',
            paragraphs: [
              'NAVER Map provides a Walking tab where you enter a start and destination. Its documented walking options include recommended routes, main roads first and avoiding stairs. Choose the option that matches your needs and still check the route on the ground.',
              'In neartrip, Walk & transit links initially open a public transport search. Switch to Walking in the external app when appropriate. Car & taxi opens a driving search. Check the destination entrance and your departure time before following the result.',
              'You can also open the same leg in Google Maps. Available routes can differ by travel mode and location. If the result you need is missing, use the other map link and confirm the journey there. neartrip does not supply its own turn-by-turn directions or travel-time estimate.',
            ],
            sourceUrl: 'https://help.naver.com/service/5637/contents/8285?osType=COMMONOS',
          },
          {
            id: 'keep-the-plan-small',
            title: 'Build a small plan before leaving your hotel',
            paragraphs: [
              'Start with two or three stops in one area. Put them in your intended visiting order, then check every leg, including the return to your hotel. Add meal, queue and visiting time separately from the travel times shown by the map app.',
              'Save your hotel’s address somewhere you can find it again. With similar business names, compare the address and map pin rather than choosing by the name alone. Neartrip works without an account, but it does not promise an offline saved itinerary.',
            ],
          },
        ],
        checklist: [
          'Set your map app to a language you can read.',
          'Check names, addresses and the exact destination entrance.',
          'Choose the travel mode inside the directions app.',
          'Include the journey back and time spent at each stop.',
        ],
      },
      ko: {
        title: '한국 여행에서 구글 지도와 네이버 지도 쓰는 방법',
        description:
          'Google 장소 정보로 방문지를 고르고 네이버 지도·Google Maps로 실제 이동을 확인하세요. 영어 설정과 neartrip에서 길찾기로 이어지는 순서를 안내합니다.',
        introduction:
          '한국에서 하루를 계획할 때 갈 곳을 고르는 일과 실제 이동을 나눠 생각해보세요. neartrip에서는 Google 지도 정보로 주변 장소를 비교합니다. 다음 구간은 네이버 지도나 Google Maps에서 열어 출발 전에 경로를 확인할 수 있습니다.',
        sections: [
          {
            id: 'choose-places',
            title: '장소 정보로 갈 곳 고르기',
            paragraphs: [
              '숙소를 영어로 검색하고 주소를 확인하세요. 주변 목록에서 맛집·카페·명소·술집을 비교할 수 있습니다. Google에서 제공하는 장소에는 별점과 리뷰 수를 표시하며 상세 지도에서 더 살펴볼 수 있습니다.',
              '검색 결과는 예약이나 오늘의 영업 여부를 뜻하지 않습니다. 방문할 장소의 공식 운영 안내를 확인하세요. 공공 관광정보에는 한국어 이름만 있거나 Google 별점이 없을 수 있습니다. 별점이 없다는 뜻을 0점으로 해석하지 마세요.',
            ],
          },
          {
            id: 'naver-in-english',
            title: '네이버 지도 영어 설정하기',
            paragraphs: [
              '네이버 고객센터는 한국어·영어·일본어·중국어 간체 지원을 안내합니다. 앱의 MY 프로필에서 설정과 언어로 이동하세요. iOS에서는 기기 설정의 네이버 지도에서도 선호하는 언어를 선택할 수 있습니다.',
              'iOS 언어 메뉴에 영어가 없으면 기기의 선호 언어에 영어를 추가하라는 것이 네이버의 안내입니다. 사용 중인 앱과 운영체제에 맞는 공식 설명을 확인하세요. 일부 장소 이름은 한국어로 남을 수 있으니 주소도 함께 준비하세요.',
            ],
            sourceUrl: 'https://help.naver.com/service/5637/contents/8275?osType=MOBILE',
          },
          {
            id: 'directions',
            title: '각 구간의 도보·대중교통 길찾기 확인하기',
            paragraphs: [
              '네이버 지도는 도보 탭에서 출발지와 도착지를 지정할 수 있습니다. 공식 안내에는 추천 경로, 큰길 우선, 계단 회피가 있습니다. 본인에게 맞는 조건을 선택하고 실제 보행 환경도 확인하세요.',
              'neartrip의 도보·대중교통 링크는 대중교통 검색으로 열립니다. 필요하면 외부 지도에서 도보로 바꾸세요. 차량·택시는 자동차 검색으로 열립니다. 안내를 따르기 전에 도착점의 입구와 출발 시간을 확인하세요.',
              '같은 구간을 Google Maps에서도 열 수 있습니다. 이동 방식과 지역에 따라 결과가 다를 수 있으므로 필요한 경로가 없으면 다른 지도 링크에서 확인하세요. neartrip은 자체 길안내나 이동 시간 추정을 제공하지 않습니다.',
            ],
            sourceUrl: 'https://help.naver.com/service/5637/contents/8285?osType=COMMONOS',
          },
          {
            id: 'keep-the-plan-small',
            title: '숙소에서 작은 계획부터 만들기',
            paragraphs: [
              '한 지역의 두세 곳부터 담으세요. 원하는 방문 순서로 정리한 뒤 숙소로 돌아오는 길까지 확인하세요. 식사·관람·대기 시간은 지도 앱의 이동 시간에 따로 더해야 합니다.',
              '숙소 주소를 다시 찾기 쉬운 곳에 보관하세요. 이름이 비슷한 가게는 주소와 표시점을 함께 비교하세요. neartrip은 회원가입 없이 이용하지만 오프라인 일정 저장을 제공하는 서비스는 아닙니다.',
            ],
          },
        ],
        checklist: [
          '읽을 수 있는 언어로 지도 앱을 설정하세요.',
          '이름·주소·실제 입구를 확인하세요.',
          '길찾기 앱 안에서 이동 방식을 선택하세요.',
          '돌아오는 구간과 체류 시간을 계획에 더하세요.',
        ],
      },
    },
  },
];
