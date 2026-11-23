import { useEffect, useRef, useState } from 'react';
import { formatRM } from '../game/format.ts';

export function AnimatedMoney({ amount, className = '' }: { amount: number; className?: string }) {
  const [shown, setShown] = useState(amount);
  const previous = useRef(amount);
  useEffect(() => {
    const startValue=previous.current;
    previous.current=amount;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced||startValue===amount){setShown(amount);return;}
    let frame=0;const start=performance.now();const duration=360;
    const tick=(now:number)=>{const t=Math.min(1,(now-start)/duration);const eased=1-Math.pow(1-t,3);setShown(Math.round(startValue+(amount-startValue)*eased));if(t<1)frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[amount]);
  return <span className={`money-count ${className}`} aria-label={formatRM(amount)}>{formatRM(shown)}</span>;
}
