import { useRef, useState, type ComponentProps } from 'react';
import { ListOrdered } from 'lucide-react';
import { Button } from '@/common/design-system/components/Button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/common/design-system/components/Dialog';
import { RouteSummary } from '@/domains/trip/components/RouteSummary';
import './style.css';

type Props = Omit<ComponentProps<typeof RouteSummary>, 'initiallyExpanded'> & {
  onReturnFocus: (target: 'map' | 'discover') => void;
};
export function RouteSheet({
  origin,
  destination,
  itinerary,
  activeRoute,
  onFocusRoute,
  onEdit,
  onReturnFocus,
}: Props) {
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const sheetReturnTarget = useRef<'trigger' | 'map' | 'discover'>('trigger');
  return (
    <Dialog
      open={showRouteDetails}
      onOpenChange={(open) => {
        sheetReturnTarget.current = 'trigger';
        setShowRouteDetails(open);
      }}
    >
      <div className="map-next-action">
        {itinerary ? (
          <DialogTrigger asChild>
            <Button className="w-full">
              <ListOrdered size={17} /> 이동 안내 보기
            </Button>
          </DialogTrigger>
        ) : (
          <Button className="w-full" onClick={onEdit}>
            <ListOrdered size={17} /> 장소 선택으로 돌아가기
          </Button>
        )}
      </div>
      <DialogContent
        placement="bottom"
        className="route-sheet h-[64dvh] overflow-hidden px-5 pt-6 pb-[max(16px,env(safe-area-inset-bottom))]"
        onCloseAutoFocus={(event) => {
          if (sheetReturnTarget.current === 'trigger') return;
          event.preventDefault();
          onReturnFocus(sheetReturnTarget.current);
        }}
      >
        <DialogTitle className="sr-only">이동 안내</DialogTitle>
        <DialogDescription className="sr-only">
          구간을 선택하면 안내를 닫고 지도에서 이동 경로를 보여줘요.
        </DialogDescription>
        <RouteSummary
          activeRoute={activeRoute}
          onFocusRoute={(legIndex, segmentIndex) => {
            sheetReturnTarget.current = 'map';
            setShowRouteDetails(false);
            onFocusRoute(legIndex, segmentIndex);
          }}
          onEdit={() => {
            sheetReturnTarget.current = 'discover';
            setShowRouteDetails(false);
            onEdit();
          }}
          origin={origin}
          destination={destination}
          itinerary={itinerary}
          initiallyExpanded
        />
      </DialogContent>
    </Dialog>
  );
}
