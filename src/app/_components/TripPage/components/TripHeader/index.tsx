import './style.css';
import { useState } from 'react';
import { Compass, Info, Navigation } from 'lucide-react';
import { Button } from '@/common/design-system/components/Button';
import { useI18n } from '@/common/i18n/components/I18nProvider';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/common/design-system/components/Dialog';

interface Props {
  demo: boolean;
  configured: boolean;
}
export function TripHeader({ demo, configured }: Props) {
  const { locale, t } = useI18n();
  const [showHelp, setShowHelp] = useState(false);
  return (
    <>
      <header className="app-header">
        <a href={`/${locale}`} className="brand" aria-label={t('brand.home')}>
          <span className="brand-logo" aria-hidden="true">
            <Navigation size={21} strokeWidth={2} />
          </span>
          <span>
            {t('brand.name')}
            {locale === 'ko' ? <small>neartrip</small> : null}
          </span>
        </a>
        <span className="header-tagline">{t('brand.tagline')}</span>
        <div className="header-actions">
          <a
            href={`/${locale}/guide`}
            className="text-xs text-primary underline underline-offset-4"
          >
            {locale === 'ko' ? '여행 가이드' : 'Travel guide'}
          </a>
          <Dialog open={showHelp} onOpenChange={setShowHelp}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="help-button">
                <Compass size={16} /> {t('help.button')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="pr-5 leading-relaxed">{t('help.title')}</DialogTitle>
                <DialogDescription className="leading-relaxed">
                  {t('help.description')}
                </DialogDescription>
              </DialogHeader>
              <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
                <li>{t('help.step1')}</li>
                <li>{t('help.step2')}</li>
                <li>{t('help.step3')}</li>
              </ol>
              <p className="text-xs leading-relaxed text-muted-foreground">{t('help.note')}</p>
              <DialogFooter>
                <a
                  href={`/${locale}/privacy`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mr-auto self-center text-sm text-muted-foreground underline underline-offset-4"
                >
                  {locale === 'ko' ? '개인정보처리방침 · 새 탭' : 'Privacy policy · new tab'}
                </a>
                <DialogClose asChild>
                  <Button>{t('help.start')}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      {demo ? (
        <div className="demo-banner">
          <Info size={14} />
          <span>
            <strong>{t('demo.title')}</strong> {t('demo.description')}
          </span>
        </div>
      ) : !configured ? (
        <div className="demo-banner" role="alert">
          <Info size={14} />
          {t('config.missing')}
        </div>
      ) : null}
    </>
  );
}
