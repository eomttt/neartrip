import { useEffect, useRef, useState } from 'react';
import type { Itinerary, Place } from '../models/model-trip';
import { requestPlan } from '../queries/searchTripQueries';

export function useTripPlanner(initialOrigin: Place | null) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [selected, setSelected] = useState<Place[]>([]);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  function clearRoute() {
    requestRef.current?.abort();
    setItinerary(null);
    setError('');
    setIsPlanning(false);
  }
  function changeOrigin(place: Place) {
    clearRoute();
    setOrigin(place);
    setSelected([]);
  }
  function togglePlace(place: Place) {
    if (place.id === origin?.id) return;
    if (!selected.some((item) => item.id === place.id) && selected.length >= 5) {
      setError('한 번에 5곳까지 담을 수 있어요.');
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
  async function buildPlan(order: 'nearby' | 'manual') {
    if (!origin || selected.length === 0) return;
    clearRoute();
    const controller = new AbortController();
    requestRef.current = controller;
    setIsPlanning(true);
    try {
      const result = await requestPlan({ origin, places: selected, order }, controller.signal);
      if (controller.signal.aborted) return;
      setSelected(result.places);
      setItinerary(result);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error ? cause.message : '동선을 만들지 못했어요. 다시 시도해주세요.',
        );
    } finally {
      if (!controller.signal.aborted) setIsPlanning(false);
    }
  }
  return {
    origin,
    selected,
    itinerary,
    error,
    isPlanning,
    changeOrigin,
    togglePlace,
    movePlace,
    resetPlaces,
    buildPlan,
  };
}
