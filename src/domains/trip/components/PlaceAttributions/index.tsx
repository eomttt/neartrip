import type { Place } from '../../models/model-trip';
import { getAttributionUrl } from '../../utils/place-detail';

export function PlaceAttributions({ places }: { places: Place[] }) {
  if (!places.some((place) => place.id.startsWith('google:'))) return null;
  const attributions = new Map(
    places
      .flatMap((place) => place.attributions ?? [])
      .map((attribution) => [attribution.name, attribution]),
  );
  return (
    <div className="px-2 py-2 text-xs text-muted-foreground">
      <span
        translate="no"
        className="whitespace-nowrap font-normal not-italic tracking-normal text-[#5e5e5e]"
      >
        Google Maps
      </span>
      {Array.from(attributions.values()).map((attribution) => {
        const url = getAttributionUrl(attribution.url);
        return (
          <span key={attribution.name}>
            {' '}
            ·{' '}
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
                {attribution.name}
              </a>
            ) : (
              attribution.name
            )}
          </span>
        );
      })}
    </div>
  );
}
