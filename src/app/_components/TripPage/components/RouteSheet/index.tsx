import { useId, useRef, type ComponentProps, type KeyboardEvent } from 'react';
import { ArrowLeft, ChevronDown, ListOrdered } from 'lucide-react';
import { Button } from '@/common/design-system/components/Button';
import type { Place } from '@/domains/trip/models/model-trip';
import { RouteSummary } from '@/domains/trip/components/RouteSummary';
import './style.css';
import { useI18n } from '@/common/i18n/components/I18nProvider';

type Props = ComponentProps<typeof RouteSummary> & {
  selected: Place[];
  isOpen: boolean;
  isPlanning: boolean;
  onOpenChange: (open: boolean) => void;
  onRebuild: () => void;
};
export function RouteSheet({
  origin,
  destination,
  itinerary,
  selected,
  activeRoute,
  isOpen,
  isPlanning,
  onFocusRoute,
  onEdit,
  onOpenChange,
  onRebuild,
}: Props) {
  const { t } = useI18n();
  const detailsId = useId();
  const toggleButton = useRef<HTMLButtonElement>(null);
  const canRebuild = selected.length > 0 || !!destination;

  function handleDirectionsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onOpenChange(false);
    toggleButton.current?.focus({ preventScroll: true });
  }

  function handlePendingAction() {
    if (canRebuild) {
      onRebuild();
      return;
    }
    onOpenChange(false);
    onEdit();
  }

  return (
    <div className="route-sheet" data-open={isOpen}>
      {itinerary ? (
        <>
          <Button
            ref={toggleButton}
            variant="ghost"
            className="route-sheet-toggle"
            aria-expanded={isOpen}
            aria-controls={detailsId}
            onClick={() => onOpenChange(!isOpen)}
          >
            <ListOrdered size={17} />
            <span>{isOpen ? t('routeSheet.expandMap') : t('routeSheet.showDirections')}</span>
            <ChevronDown size={17} className={isOpen ? '' : 'rotate-180'} aria-hidden="true" />
          </Button>
          <div
            id={detailsId}
            className="route-sheet-content"
            hidden={!isOpen}
            onKeyDown={handleDirectionsKeyDown}
          >
            <RouteSummary
              activeRoute={activeRoute}
              onFocusRoute={onFocusRoute}
              onEdit={() => {
                onOpenChange(false);
                onEdit();
              }}
              origin={origin}
              destination={destination}
              itinerary={itinerary}
            />
          </div>
        </>
      ) : (
        <div className="route-sheet-pending">
          {isOpen ? (
            <>
              <strong>{t('routeSheet.changed')}</strong>
              <p>{t('routeSheet.changedDescription')}</p>
              {selected.length > 0 ? (
                <ol aria-label={t('routeSheet.currentPlaces')}>
                  {selected.map((place, index) => (
                    <li key={place.id}>
                      <span>{index + 1}</span>
                      <span>{place.name}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </>
          ) : null}
          <Button
            className="route-sheet-rebuild"
            disabled={canRebuild && isPlanning}
            onClick={handlePendingAction}
          >
            {canRebuild && isPlanning ? (
              <span className="spinner" />
            ) : canRebuild ? (
              <ListOrdered size={17} />
            ) : (
              <ArrowLeft size={17} />
            )}
            {canRebuild
              ? isPlanning
                ? t('routeSheet.rebuilding')
                : t('routeSheet.rebuild')
              : t('routeSheet.chooseOther')}
          </Button>
        </div>
      )}
    </div>
  );
}
