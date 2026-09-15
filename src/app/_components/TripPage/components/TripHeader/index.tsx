import './style.css';
import { useState } from 'react';
import { Compass, Globe2, Info } from 'lucide-react';
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
  const { locale, setLocale, t } = useI18n();
  const [showHelp, setShowHelp] = useState(false);
  return (
    <>
      <header className="app-header">
        <a href={`/${locale}`} className="brand" aria-label={t('brand.home')}>
          <span className="brand-logo">⌁</span>
          <span>{t('brand.name')}</span>
        </a>
        <span className="header-tagline">{t('brand.tagline')}</span>
        <div className="header-actions">
          <Button
            variant="ghost"
            size="sm"
            className="language-button"
            aria-label={t('language.switchLabel')}
            onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
          >
            <Globe2 size={15} /> {t('language.switch')}
          </Button>
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
