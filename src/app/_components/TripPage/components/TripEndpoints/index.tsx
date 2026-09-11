import { useEffect, useRef, useState } from 'react';
import { ArrowRight, MapPin, Pencil } from 'lucide-react';
import { Button } from '@/common/design-system/components/Button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/common/design-system/components/Dialog';
import { OriginPicker } from '@/domains/trip/components/OriginPicker';
import { DestinationPicker } from '@/domains/trip/components/DestinationPicker';
import type { Place } from '@/domains/trip/models/model-trip';

interface Props {
  origin: Place | null;
  destination: Place | null;
  demo: boolean;
  onOriginChange: (place: Place) => void;
  onDestinationChange: (place: Place | null) => void;
}

export function TripEndpoints({
  origin,
  destination,
  demo,
  onOriginChange,
  onDestinationChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const hadOrigin = useRef(!!origin);

  useEffect(() => {
    if (origin && !hadOrigin.current) trigger.current?.focus({ preventScroll: true });
    hadOrigin.current = !!origin;
  }, [origin]);

  if (!origin) {
    return (
      <>
        <div className="discover-intro">
          <h1>숙소 근처, 오늘 어디 가지?</h1>
          <p>먼저 묵는 숙소나 출발할 장소를 골라주세요.</p>
        </div>
        <OriginPicker value={null} demo={demo} onChange={onOriginChange} />
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          ref={trigger}
          variant="outline"
          className="h-auto w-full justify-start gap-3 px-3 py-3 text-left"
          aria-label="출발·도착점 수정"
        >
          <MapPin className="shrink-0 text-primary" size={18} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{origin.name} 출발</span>
            <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowRight className="shrink-0" size={12} />
              <span className="truncate">
                {destination ? `${destination.name} 도착` : '출발점으로 돌아오기'}
              </span>
            </span>
          </span>
          <Pencil className="shrink-0 text-muted-foreground" size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent
        placement="bottom"
        className="overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <DialogHeader>
          <DialogTitle>출발·도착점 수정</DialogTitle>
          <DialogDescription>
            도착점을 정하지 않으면 출발점으로 돌아와요. 출발점을 바꾸면 담은 장소가 비워져요.
          </DialogDescription>
        </DialogHeader>
        <div>
          <OriginPicker value={origin} demo={demo} onChange={onOriginChange} />
          <DestinationPicker value={destination} onChange={onDestinationChange} />
        </div>
        <DialogClose asChild>
          <Button className="w-full shrink-0">장소 둘러보기</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
