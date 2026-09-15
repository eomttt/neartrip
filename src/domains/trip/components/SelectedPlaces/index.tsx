import './style.css';
import { useState } from 'react';
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
import { ArrowDown, ArrowUp, RotateCcw, X } from 'lucide-react';
import { Button } from '@/common/design-system/components/Button';
import type { Place } from '../../models/model-trip';
import { useI18n } from '@/common/i18n/components/I18nProvider';

interface Props {
  places: Place[];
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (place: Place) => void;
  onReset: () => void;
}

export function SelectedPlaces({ places, onMove, onRemove, onReset }: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (places.length === 0) return null;
  return (
    <section className="selected-places" aria-label={t('selected.region')}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" className="h-10 w-full justify-between text-xs">
            {t('selected.trigger', { count: places.length })}
          </Button>
        </DialogTrigger>
        <DialogContent className="selected-places-dialog">
          <DialogHeader>
            <DialogTitle>{t('selected.title')}</DialogTitle>
            <DialogDescription>{t('selected.description')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                onReset();
              }}
            >
              <RotateCcw size={13} /> {t('selected.clear')}
            </Button>
          </div>
          <ol className="route-list">
            {places.map((place, index) => (
              <li key={place.id}>
                <span className="stop-number">{index + 1}</span>
                <div className="stop-copy">
                  <strong>{place.name}</strong>
                </div>
                <div className="stop-actions">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('selected.moveUp', { name: place.name })}
                    disabled={index === 0}
                    onClick={() => onMove(index, -1)}
                  >
                    <ArrowUp size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('selected.moveDown', { name: place.name })}
                    disabled={index === places.length - 1}
                    onClick={() => onMove(index, 1)}
                  >
                    <ArrowDown size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('selected.remove', { name: place.name })}
                    onClick={() => {
                      if (places.length === 1) setOpen(false);
                      onRemove(place);
                    }}
                  >
                    <X size={14} />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
          <DialogFooter>
            <DialogClose asChild>
              <Button>{t('selected.done')}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
