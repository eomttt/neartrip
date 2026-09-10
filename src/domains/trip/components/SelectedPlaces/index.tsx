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

interface Props {
  places: Place[];
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (place: Place) => void;
  onReset: () => void;
}

export function SelectedPlaces({ places, onMove, onRemove, onReset }: Props) {
  const [open, setOpen] = useState(false);
  if (places.length === 0) return null;
  return (
    <section className="selected-places" aria-label="담은 장소">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" className="h-10 w-full justify-between text-xs">
            담은 장소 {places.length} / 5 · 방문 순서 변경
          </Button>
        </DialogTrigger>
        <DialogContent className="selected-places-dialog">
          <DialogHeader>
            <DialogTitle>방문 순서 변경</DialogTitle>
            <DialogDescription>위아래로 옮겨 방문할 순서를 정해주세요.</DialogDescription>
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
              <RotateCcw size={13} /> 비우기
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
                    aria-label={`${place.name} 앞으로`}
                    disabled={index === 0}
                    onClick={() => onMove(index, -1)}
                  >
                    <ArrowUp size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${place.name} 뒤로`}
                    disabled={index === places.length - 1}
                    onClick={() => onMove(index, 1)}
                  >
                    <ArrowDown size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${place.name} 일정에서 빼기`}
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
              <Button>순서 선택 완료</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
