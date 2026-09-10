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

interface Props {
  value: Place | null;
  demo: boolean;
  onChange: (place: Place) => void;
}
export function OriginPicker({ value, demo, onChange }: Props) {
  const originSearch = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const search = useQuery(tripQueries.search(query));
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
          출발 장소 검색
        </label>
        <Input
          className="h-10 border-0 px-0 text-base shadow-none focus-visible:ring-0 md:text-xs"
          ref={originSearch}
          id="origin-search"
          value={input}
          maxLength={80}
          onChange={(event) => setInput(event.target.value)}
          placeholder={demo ? '예시: 성수역, 작은 식탁' : '지금 묵는 숙소 이름이나 주소'}
        />
        <Button size="icon-sm" type="submit" aria-label="장소 검색" disabled={!input.trim()}>
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
            <DialogTitle>여기서 출발할까요?</DialogTitle>
            <DialogDescription>검색한 장소 중 오늘의 출발점을 골라주세요.</DialogDescription>
          </DialogHeader>
          <section
            className="max-h-[45dvh] overflow-y-auto overscroll-contain"
            aria-label="출발 장소 검색 결과"
          >
            {search.isFetching ? (
              <p role="status">장소를 찾고 있어요.</p>
            ) : search.error ? (
              <p role="alert">{search.error.message}</p>
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
              <p>
                검색 결과가 없어요.{' '}
                {demo ? '예시 모드에서는 성수역을 검색해보세요.' : '장소명이나 주소를 바꿔보세요.'}
              </p>
            )}
          </section>
        </DialogContent>
      </Dialog>
      {value ? (
        <div className="origin-card">
          <span className="origin-icon">
            <MapPin size={19} />
          </span>
          <div>
            <small>오늘의 시작점</small>
            <strong>{value.name}</strong>
          </div>
          <span className="origin-check">
            <Check size={15} />
          </span>
        </div>
      ) : (
        <div className="origin-placeholder">
          <MapPin size={18} /> 묵는 숙소나 출발할 장소를 검색해주세요.
        </div>
      )}
    </>
  );
}
