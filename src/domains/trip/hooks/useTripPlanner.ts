import { useEffect, useRef, useState } from 'react';
import type { Itinerary, Place } from '../models/model-trip';
import { useMutation } from '@tanstack/react-query';
import { postTripPlanMutations } from '../queries/postTripPlanMutations';
import { useI18n } from '@/common/i18n/components/I18nProvider';
import { localizeTripText } from '../i18n/localize-trip-text';

export function useTripPlanner(initialOrigin: Place | null) {
  const { locale, t } = useI18n();
  const [origin, setOrigin] = useState(initialOrigin);
  const [destination, setDestination] = useState<Place | null>(null);
  const [selected, setSelected] = useState<Place[]>([]);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState('');
  const planMutation = useMutation(postTripPlanMutations.create());
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  function clearRoute() {
    requestRef.current?.abort();
    setItinerary(null);
    setError('');
    planMutation.reset();
  }
  function changeOrigin(place: Place) {
    clearRoute();
    setOrigin(place);
    setSelected([]);
  }
  function changeDestination(place: Place | null) {
    clearRoute();
    setDestination(place);
    setSelected((current) => current.filter((item) => item.id !== place?.id));
  }
  function togglePlace(place: Place) {
    if (place.id === origin?.id || place.id === destination?.id) return;
    if (!selected.some((item) => item.id === place.id) && selected.length >= 5) {
      setError(t('planner.maxPlaces'));
      return;
    }
    clearRoute();
    setSelected((current) =>
      current.some((item) => item.id === place.id)
        ? current.filter((item) => item.id !== place.id)
        : [...current, place],
    );
  }
  function movePlace(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    clearRoute();
    setSelected((current) =>
      current.map((place, position) =>
        position === index
          ? (current[target] ?? place)
          : position === target
            ? (current[index] ?? place)
            : place,
      ),
    );
  }
  function resetPlaces() {
    clearRoute();
    setSelected([]);
  }
  async function buildPlan() {
    if (!origin || (selected.length === 0 && !destination)) return;
    clearRoute();
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const result = await planMutation.mutateAsync({
        body: { origin, destination, places: selected, order: 'manual' },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setSelected(result.places);
      setItinerary(result);
      return result;
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error ? localizeTripText(locale, cause.message) : t('planner.failed'),
        );
    }
  }
  return {
    origin,
    destination,
    selected,
    itinerary,
    error,
    isPlanning: planMutation.isPending,
    changeOrigin,
    changeDestination,
    togglePlace,
    movePlace,
    resetPlaces,
    buildPlan,
  };
}
