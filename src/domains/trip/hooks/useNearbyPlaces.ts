import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { tripQueries } from '../queries/tripQueries';
import { categorySchema, type Category, type Place } from '../models/model-trip';
import { usePlaceCrowding } from './usePlaceCrowding';
import { mergePetPlaces } from '../utils/merge-pet-places';
import { distanceMeters } from '../utils/route-order';
import { isCrowdingFresh } from '../utils/crowding-freshness';
import type { CrowdingByPlace, CrowdingLevel } from '../models/model-crowding';

function filterPlaces(
  places: Place[],
  categories: Category[],
  petOnly: boolean,
  crowdingLevels: CrowdingLevel[],
  crowdingByPlace: CrowdingByPlace,
) {
  return places.filter((place) => {
    if (!categories.includes(place.category)) return false;
    if (petOnly && place.tourism?.kind !== 'pet') return false;
    if (crowdingLevels.length === 0) return true;
    const crowding = crowdingByPlace[place.id];
    return Boolean(
      crowding?.state === 'available' &&
      crowding.level &&
      crowdingLevels.includes(crowding.level) &&
      crowding.observedAt &&
      isCrowdingFresh(crowding.observedAt),
    );
  });
}

export function useNearbyPlaces(
  origin: Place | null,
  destination: Place | null,
  initialRadius = 1_000,
) {
  const [categories, setCategories] = useState<Category[]>(() => [...categorySchema.options]);
  const [radius, setRadius] = useState(initialRadius);
  const [crowdingLevels, setCrowdingLevels] = useState<CrowdingLevel[]>([]);
  const [petOnly, setPetOnly] = useState(false);
  const [festivalOnly, setFestivalOnly] = useState(false);
  // 자정이 지나면 쿼리 키의 한국 날짜도 갱신합니다.
  const [, setMinute] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setMinute((value) => value + 1), 60_000);
    return () => clearInterval(timer);
  }, []);
  const nearby = useQuery(tripQueries.nearbyList(origin, radius, !festivalOnly));
  const festivals = useInfiniteQuery(
    tripQueries.discovery(origin, 'festival', radius, festivalOnly),
  );
  const pets = useInfiniteQuery(tripQueries.discovery(origin, 'pet', radius, !festivalOnly));
  const candidatePlaces = useMemo(() => {
    const rows = festivalOnly
      ? (festivals.data?.pages.flatMap((page) => page.places) ?? [])
      : mergePetPlaces(nearby.data ?? [], pets.data?.pages.flatMap((page) => page.places) ?? []);
    return Array.from(new Map(rows.map((place) => [place.id, place])).values())
      .filter((place) => place.id !== origin?.id && place.id !== destination?.id)
      .toSorted((a, b) => (origin ? distanceMeters(origin, a) - distanceMeters(origin, b) : 0));
  }, [festivalOnly, nearby.data, pets.data, festivals.data, origin, destination]);
  const festivalRecommendations = useMemo(
    () =>
      festivals.data?.pages
        .flatMap((page) => page.recommendations)
        .filter((place) => place.id !== origin?.id && place.id !== destination?.id) ?? [],
    [festivals.data, origin, destination],
  );
  const crowdingPlaces = useMemo(
    () => [...candidatePlaces, ...festivalRecommendations],
    [candidatePlaces, festivalRecommendations],
  );
  const crowdingByPlace = usePlaceCrowding(crowdingPlaces);
  const places = useMemo(
    () => filterPlaces(candidatePlaces, categories, petOnly, crowdingLevels, crowdingByPlace),
    [candidatePlaces, categories, petOnly, crowdingLevels, crowdingByPlace],
  );
  const recommendations = useMemo(
    () =>
      filterPlaces(festivalRecommendations, categories, petOnly, crowdingLevels, crowdingByPlace),
    [festivalRecommendations, categories, petOnly, crowdingLevels, crowdingByPlace],
  );
  const activeDiscovery = festivalOnly ? festivals : pets;
  return {
    crowdingByPlace,
    places,
    recommendations,
    categories,
    radius,
    crowdingLevels,
    petOnly,
    festivalOnly,
    onFestivalOnlyChange: () => {
      if (!festivalOnly) setPetOnly(false);
      setFestivalOnly((current) => !current);
    },
    onCategoryToggle: (category: Category) =>
      setCategories((current) =>
        current.includes(category)
          ? current.filter((value) => value !== category)
          : [...current, category],
      ),
    onCrowdingLevelToggle: (level: CrowdingLevel) =>
      setCrowdingLevels((current) =>
        current.includes(level) ? current.filter((value) => value !== level) : [...current, level],
      ),
    onPetOnlyChange: () => {
      setPetOnly((current) => !current);
      setFestivalOnly(false);
    },
    onRadiusChange: setRadius,
    isFetching: festivalOnly
      ? festivals.isFetching && !festivals.isFetchingNextPage
      : nearby.isFetching,
    error: festivalOnly
      ? festivals.isFetchNextPageError
        ? null
        : festivals.error
      : petOnly && pets.error
        ? pets.error
        : nearby.error,
    onRetry: () =>
      festivalOnly ? festivals.refetch() : petOnly ? pets.refetch() : nearby.refetch(),
    hasMore: (festivalOnly || petOnly) && activeDiscovery.hasNextPage,
    isLoadingMore: activeDiscovery.isFetchingNextPage,
    loadMoreError: activeDiscovery.isFetchNextPageError ? activeDiscovery.error : null,
    onLoadMore: () => activeDiscovery.fetchNextPage(),
  };
}
