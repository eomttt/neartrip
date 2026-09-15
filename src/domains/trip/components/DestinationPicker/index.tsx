import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flag, MapPin, Search, X } from 'lucide-react';
import { Button } from '@/common/design-system/components/Button';
import { Input } from '@/common/design-system/components/Input';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/common/design-system/components/Dialog';
import type { Place } from '../../models/model-trip';
import { tripQueries } from '../../queries/tripQueries';
import { useI18n } from '@/common/i18n/components/I18nProvider';
import { localizeTripText } from '../../i18n/localize-trip-text';

interface Props {
  value: Place | null;
  onChange: (place: Place | null) => void;
}

export function DestinationPicker({ value, onChange }: Props) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const search = useQuery(tripQueries.search(query));

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setInput('');
      setQuery('');
    }
    setOpen(nextOpen);
  }

  return (
    <div className="destination-picker mt-2 shrink-0">
      <p className="mb-1 text-xs text-muted-foreground">
        {t('destination.label')} <span className="text-[10px]">({t('destination.optional')})</span>
      </p>
      <div className="flex items-center gap-1">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="h-auto min-h-10 min-w-0 flex-1 justify-start px-3 py-2 text-xs"
              aria-label={value ? t('destination.change') : t('destination.add')}
            >
              <Flag size={14} />
              <span className="min-w-0 truncate">{value?.name ?? t('endpoints.return')}</span>
              <Search size={13} className="ml-auto" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('destination.dialogTitle')}</DialogTitle>
              <DialogDescription>{t('destination.dialogDescription')}</DialogDescription>
            </DialogHeader>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(input.trim());
              }}
            >
              <label htmlFor="destination-search" className="sr-only">
                {t('destination.searchLabel')}
              </label>
              <Input
                id="destination-search"
                placeholder={t('destination.placeholder')}
                maxLength={80}
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <Button
                type="submit"
                disabled={!input.trim()}
                aria-label={t('destination.searchButton')}
              >
                <Search size={16} />
              </Button>
            </form>
            <div
              className="max-h-[45dvh] overflow-y-auto overscroll-contain"
              role="region"
              aria-label={t('destination.results')}
              aria-busy={search.isFetching}
            >
              {search.isFetching ? (
                <p role="status" className="py-4 text-sm text-muted-foreground">
                  {t('search.loading')}
                </p>
              ) : search.error ? (
                <p role="alert" className="py-4 text-sm text-destructive">
                  {localizeTripText(locale, search.error.message)}
                </p>
              ) : query ? (
                search.data?.length ? (
                  search.data.map((place) => (
                    <Button
                      key={place.id}
                      variant="ghost"
                      className="h-auto w-full justify-start gap-3 whitespace-normal py-3 text-left"
                      onClick={() => {
                        onChange(place);
                        setOpen(false);
                      }}
                    >
                      <MapPin size={16} />
                      <span className="min-w-0">
                        <strong className="block text-sm font-medium">{place.name}</strong>
                        <small className="mt-1 block text-xs text-muted-foreground">
                          {place.address}
                        </small>
                      </span>
                    </Button>
                  ))
                ) : (
                  <p className="py-4 text-sm text-muted-foreground">{t('destination.noResults')}</p>
                )
              ) : (
                <p className="py-4 text-sm text-muted-foreground">{t('destination.hint')}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
        {value ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('destination.clear')}
            onClick={() => onChange(null)}
          >
            <X size={14} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
