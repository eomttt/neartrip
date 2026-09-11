import './style.css';
import { useState } from 'react';
import { Compass, Info } from 'lucide-react';
import { Button } from '@/common/design-system/components/Button';
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

interface Props {
  demo: boolean;
  configured: boolean;
}
export function TripHeader({ demo, configured }: Props) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <>
      <header className="app-header">
        <a href="/" className="brand" aria-label="가까이 홈">
          <span className="brand-logo">⌁</span>
          <span>
            가까이<small>neartrip</small>
          </span>
        </a>
        <span className="header-tagline">멀리 떠나지 않아도, 여행</span>
        <Dialog open={showHelp} onOpenChange={setShowHelp}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="help-button">
              <Compass size={16} /> 이용 방법
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="pr-5 leading-relaxed">
                장소 하나에서 시작하는 작은 여행
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                여행 중 묵는 숙소를 검색해보세요. 근처에서 마음에 드는 곳을 5곳까지 담으면 오늘의
                동선을 만들어요.
              </DialogDescription>
            </DialogHeader>
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
              <li>숙소를 출발점으로 정하고 맛집·카페·가볼 만한 곳을 골라요.</li>
              <li>숙소로 돌아오는 동선이 기본이에요. 마지막 도착점은 따로 정할 수도 있어요.</li>
              <li>
                동선을 만들면 2단계 지도에서 확인해요. 이동 안내를 누르면 구간을 살펴볼 수 있어요.
              </li>
            </ol>
            <p className="text-xs leading-relaxed text-muted-foreground">
              도착점을 선택하면 그곳에서 여행을 마치고, 비워두면 출발점으로 돌아와요.
              날짜·영업시간·체류시간은 포함되지 않아요.
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button>여행 시작하기</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>
      {demo ? (
        <div className="demo-banner">
          <Info size={14} />
          <span>
            <strong>예시로 둘러보는 중</strong> 가상의 맛집·카페와 개략도로 체험해보세요. 실제 장소
            검색은 카카오 키 연결 후 사용할 수 있어요.
          </span>
        </div>
      ) : !configured ? (
        <div className="demo-banner" role="alert">
          <Info size={14} />
          카카오 키 설정이 일부 빠져 있어요. .env.local의 REST 키와 JavaScript 키를 확인해주세요.
        </div>
      ) : null}
    </>
  );
}
