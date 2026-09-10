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

interface Props {
  value: Place | null;
  onChange: (place: Place | null) => void;
}

export function DestinationPicker({ value, onChange }: Props) {
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
        도착점 <span className="text-[10px]">(선택)</span>
      </p>
      <div className="flex items-center gap-1">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="h-auto min-h-10 min-w-0 flex-1 justify-start px-3 py-2 text-xs"
              aria-label={value ? '도착점 변경' : '도착점 추가'}
            >
              <Flag size={14} />
              <span className="min-w-0 truncate">{value?.name ?? '출발점으로 돌아오기'}</span>
              <Search size={13} className="ml-auto" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>도착점 선택</DialogTitle>
              <DialogDescription>
                여행을 마칠 장소를 검색하세요. 도착점을 비워두면 출발점으로 돌아와요.
              </DialogDescription>
            </DialogHeader>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(input.trim());
              }}
            >
              <label htmlFor="destination-search" className="sr-only">
                도착 장소 검색
              </label>
              <Input
                id="destination-search"
                placeholder="역 이름, 숙소, 주소로 검색"
                maxLength={80}
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <Button type="submit" disabled={!input.trim()} aria-label="도착점 검색">
                <Search size={16} />
              </Button>
            </form>
            <div
              className="max-h-[45dvh] overflow-y-auto overscroll-contain"
              role="region"
              aria-label="도착점 검색 결과"
              aria-busy={search.isFetching}
            >
              {search.isFetching ? (
                <p role="status" className="py-4 text-sm text-muted-foreground">
                  장소를 찾고 있어요.
                </p>
              ) : search.error ? (
                <p role="alert" className="py-4 text-sm text-destructive">
                  {search.error.message}
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
                  <p className="py-4 text-sm text-muted-foreground">
                    검색 결과가 없어요. 다른 이름이나 주소로 찾아보세요.
                  </p>
                )
              ) : (
                <p className="py-4 text-sm text-muted-foreground">
                  도착점은 중간 방문지 5곳과 별도로 선택할 수 있어요.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
        {value ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="도착점 지우기"
            onClick={() => onChange(null)}
          >
            <X size={14} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
