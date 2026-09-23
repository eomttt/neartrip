import './style.css';
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight, MapPin, Check } from 'lucide-react';
import { Input } from '@/common/design-system/components/Input';
import { Button } from '@/common/design-system/components/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/common/design-system/components/Dialog';
import { tripQueries } from '../../queries/tripQueries';
import type { Place } from '../../models/model-trip';
import { useI18n } from '@/common/i18n/components/I18nProvider';
import { PlaceAttributions } from '../PlaceAttributions';
import { localizeTripText } from '../../i18n/localize-trip-text';

interface Props {
  value: Place | null;
  demo: boolean;
  onChange: (place: Place) => void;
}
export function OriginPicker({ value, demo, onChange }: Props) {
  const { locale, t } = useI18n();
  const originSearch = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const search = useQuery(tripQueries.search(query, locale));
  function handleOriginSelect(place: Place) {
    onChange(place);
    setShowSearch(false);
    setInput('');
    setQuery('');
  }
  return (
    <>
      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!input.trim()) return;
          setQuery(input.trim());
          setShowSearch(true);
        }}
      >
        <Search size={19} />
        <label className="sr-only" htmlFor="origin-search">
          {t('origin.searchLabel')}
        </label>
        <Input
          className="h-10 border-0 px-0 text-base shadow-none focus-visible:ring-0 md:text-sm"
          ref={originSearch}
          id="origin-search"
          value={input}
          maxLength={80}
          onChange={(event) => setInput(event.target.value)}
          placeholder={demo ? t('origin.placeholderDemo') : t('origin.placeholder')}
        />
        <Button
          size="icon-sm"
          type="submit"
          aria-label={t('origin.searchButton')}
          disabled={!input.trim()}
        >
          <ArrowRight size={18} />
        </Button>
      </form>
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            originSearch.current?.focus({ preventScroll: true });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('origin.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('origin.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <section
            className="max-h-[45dvh] overflow-y-auto overscroll-contain"
            aria-label={t('origin.results')}
          >
            {search.isFetching ? (
              <p role="status">{t('search.loading')}</p>
            ) : search.error ? (
              <p role="alert">{localizeTripText(locale, search.error.message)}</p>
            ) : search.data?.length ? (
              search.data.map((place) => (
                <Button
                  variant="ghost"
                  className="search-result h-auto whitespace-normal rounded-none"
                  key={place.id}
                  onClick={() => handleOriginSelect(place)}
                >
                  <MapPin size={16} />
                  <span>
                    <strong>{place.name}</strong>
                    <small>{place.address}</small>
                  </span>
                  <ArrowRight size={15} />
                </Button>
              ))
            ) : (
              <p>{demo ? t('search.noResultsDemo') : t('search.noResults')}</p>
            )}
          </section>
          <PlaceAttributions places={search.data ?? []} />
        </DialogContent>
      </Dialog>
      {value ? (
        <div className="origin-card">
          <span className="origin-icon">
            <MapPin size={19} />
          </span>
          <div>
            <small>{t('origin.selected')}</small>
            <strong>{value.name}</strong>
          </div>
          <span className="origin-check">
            <Check size={15} />
          </span>
        </div>
      ) : (
        <div className="origin-placeholder">
          <MapPin size={18} /> {t('origin.empty')}
        </div>
      )}
    </>
  );
}
