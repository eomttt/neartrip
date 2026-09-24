import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/common/i18n/locale';
import { pageMetadata } from '@/common/seo/site-metadata';

const copyByLocale = {
  ko: {
    title: '개인정보처리방침',
    description: 'neartrip의 서비스 데이터와 Google 광고 쿠키 사용 안내입니다.',
    updated: '최종 수정: 2026년 9월 24일',
    back: '가까이로 돌아가기',
    sections: [
      {
        title: '서비스 이용 정보',
        body: 'neartrip은 회원가입 없이 이용합니다. 장소 검색어, 선택한 장소와 좌표, 이동 조건은 주변 장소 검색과 동선 생성을 위해 서버로 전송됩니다. Google Maps와 Places에 지도·장소 검색 정보를 전달합니다. 공공 관광정보 서비스에는 주변 관광정보 조회에 필요한 정보를 전달합니다. 길찾기 링크를 누르면 선택한 두 장소의 이름과 좌표가 네이버 지도 또는 Google Maps에 전달됩니다.',
      },
      {
        title: '접속 정보와 오류 기록',
        body: '서비스 제공 과정에서 호스팅 제공업체인 Vercel이 접속 정보를 수신합니다. neartrip은 IP 주소를 요청 횟수 제한에 사용합니다. 오류 진단 기록에는 요청 내용과 외부 서비스 응답이 포함될 수 있으며 인증 정보는 가립니다.',
      },
      {
        title: 'Google 광고와 쿠키',
        body: 'neartrip은 Google AdSense 광고를 게재할 수 있습니다. Google과 제3자 광고 공급업체는 쿠키를 사용하며, 이 사이트나 다른 사이트의 이전 방문 기록에 따라 광고를 표시할 수 있습니다. 광고 쿠키는 개인 맞춤 광고와 광고 측정에 사용될 수 있습니다.',
      },
      {
        title: '쿠키와 개인 맞춤 광고 선택',
        body: 'Google 광고 설정에서 개인 맞춤 광고를 끌 수 있습니다. 제3자 공급업체의 개인 맞춤 광고는 해당 공급업체의 설정이나 아래 광고 선택 페이지에서 관리할 수 있습니다. 브라우저 설정에서도 쿠키를 삭제하거나 차단할 수 있습니다.',
      },
    ],
    linksTitle: '개인정보와 광고 설정',
    googlePrivacy: 'Google 개인정보처리방침',
    googleMapsTerms: 'Google Maps 이용약관',
    googlePartners: 'Google 파트너 사이트의 데이터 사용',
    adSettings: 'Google 광고 설정',
    adChoices: '제3자 개인 맞춤 광고 선택',
    naverPrivacy: '네이버 개인정보처리방침',
    vercelPrivacy: 'Vercel 개인정보처리방침',
  },
  en: {
    title: 'Privacy policy',
    description: 'How neartrip uses service data and Google advertising cookies.',
    updated: 'Last updated: September 24, 2026',
    back: 'Back to neartrip',
    sections: [
      {
        title: 'Information used by the service',
        body: 'neartrip does not require an account. Search terms, selected places and coordinates, and travel preferences are sent to our server to find nearby places and create routes. We send map and place searches to Google Maps and Places, and nearby tourism queries to public tourism services. Opening a directions link sends the two selected places and coordinates to NAVER Map or Google Maps.',
      },
      {
        title: 'Access information and error logs',
        body: 'Our hosting provider, Vercel, receives connection information when you use the service. neartrip uses IP addresses to limit request frequency. Diagnostic logs may include request details and responses from external services. Authentication information is redacted.',
      },
      {
        title: 'Google advertising and cookies',
        body: 'neartrip may display Google AdSense ads. Google and third-party advertising vendors use cookies and may show ads based on previous visits to this website or other websites. Advertising cookies may be used for personalized ads and measurement.',
      },
      {
        title: 'Your cookie and advertising choices',
        body: 'You can turn off personalized ads in Google Ads Settings. You can manage personalized advertising from other vendors through their settings or the advertising choices page below. You can also delete or block cookies in your browser settings.',
      },
    ],
    linksTitle: 'Privacy information and advertising settings',
    googlePrivacy: 'Google Privacy Policy',
    googleMapsTerms: 'Google Maps Terms of Service',
    googlePartners: 'How Google uses data from partner sites',
    adSettings: 'Google Ads Settings',
    adChoices: 'Third-party advertising choices',
    naverPrivacy: 'NAVER Privacy Policy',
    vercelPrivacy: 'Vercel Privacy Policy',
  },
};

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/privacy'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = copyByLocale[locale];
  return pageMetadata({
    locale,
    path: '/privacy',
    title: `${copy.title} | neartrip`,
    description: copy.description,
  });
}

export default async function PrivacyPage({ params }: PageProps<'/[locale]/privacy'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = copyByLocale[locale];
  const links = [
    { label: copy.googleMapsTerms, href: 'https://maps.google.com/help/terms_maps/' },
    { label: copy.googlePrivacy, href: 'https://policies.google.com/privacy' },
    { label: copy.googlePartners, href: 'https://policies.google.com/technologies/partner-sites' },
    { label: copy.adSettings, href: 'https://adssettings.google.com/' },
    { label: copy.adChoices, href: 'https://optout.aboutads.info/' },
    { label: copy.naverPrivacy, href: 'https://policy.naver.com/policy/privacy.html' },
    { label: copy.vercelPrivacy, href: 'https://vercel.com/legal/privacy-policy' },
  ];
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-6 py-10 text-foreground">
      <a href={`/${locale}`} className="text-sm text-primary underline underline-offset-4">
        {copy.back}
      </a>
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.updated}</p>
      </header>
      {copy.sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <p className="text-sm leading-7">{section.body}</p>
        </section>
      ))}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{copy.linksTitle}</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-primary underline underline-offset-4">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
