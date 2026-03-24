import { useEffect, useRef, useState } from "react";

type Props = {
  isTyping: boolean;
  showPassword: boolean;
  hasPassword: boolean;
};

type Position = { faceX: number; faceY: number; bodySkew: number };

function Eye({
  blinking,
  forceLook,
}: {
  blinking?: boolean;
  forceLook?: { x: number; y: number };
}) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const calc = () => {
    if (forceLook) return forceLook;
    if (!ref.current) return { x: 0, y: 0 };
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = mouse.x - cx;
    const dy = mouse.y - cy;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 4);
    const angle = Math.atan2(dy, dx);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  };

  const pos = calc();

  return (
    <div ref={ref} className="auth-eye" style={{ height: blinking ? 2 : 14 }}>
      {!blinking && (
        <span
          className="auth-eye-pupil"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        />
      )}
    </div>
  );
}

export default function AnimatedCharactersHero({
  isTyping,
  showPassword,
  hasPassword,
}: Props) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [purpleBlinking, setPurpleBlinking] = useState(false);
  const [blackBlinking, setBlackBlinking] = useState(false);
  const [lookEachOther, setLookEachOther] = useState(false);

  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    if (!isTyping) {
      setLookEachOther(false);
      return;
    }
    setLookEachOther(true);
    const timer = setTimeout(() => setLookEachOther(false), 850);
    return () => clearTimeout(timer);
  }, [isTyping]);

  useEffect(() => {
    const schedule = () => {
      const timeout = setTimeout(() => {
        setPurpleBlinking(true);
        setTimeout(() => setPurpleBlinking(false), 150);
        schedule();
      }, Math.random() * 4000 + 3000);
      return timeout;
    };
    const timeout = schedule();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const schedule = () => {
      const timeout = setTimeout(() => {
        setBlackBlinking(true);
        setTimeout(() => setBlackBlinking(false), 150);
        schedule();
      }, Math.random() * 4000 + 3000);
      return timeout;
    };
    const timeout = schedule();
    return () => clearTimeout(timeout);
  }, []);

  const calc = (ref: React.RefObject<HTMLDivElement | null>): Position => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 3;
    const dx = mouse.x - cx;
    const dy = mouse.y - cy;
    return {
      faceX: Math.max(-15, Math.min(15, dx / 20)),
      faceY: Math.max(-10, Math.min(10, dy / 30)),
      bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
    };
  };

  const purplePos = calc(purpleRef);
  const blackPos = calc(blackRef);
  const orangePos = calc(orangeRef);
  const yellowPos = calc(yellowRef);

  const passwordPeeking = hasPassword && showPassword;

  return (
    <section className="auth-brand auth-brand-animated">
      <div className="auth-hero-top">研究生会活动管理系统</div>

      <div className="auth-characters-wrap">
        <div
          ref={purpleRef}
          className="auth-char auth-char-purple"
          style={{
            transform: passwordPeeking
              ? "skewX(0deg)"
              : lookEachOther
                ? `skewX(${purplePos.bodySkew - 12}deg) translateX(24px)`
                : `skewX(${purplePos.bodySkew}deg)`,
          }}
        >
          <div
            className="auth-char-eyes"
            style={{
              left: passwordPeeking ? 24 : 45 + purplePos.faceX,
              top: passwordPeeking ? 36 : 42 + purplePos.faceY,
            }}
          >
            <Eye
              blinking={purpleBlinking}
              forceLook={passwordPeeking ? { x: -3, y: -3 } : lookEachOther ? { x: 3, y: 4 } : undefined}
            />
            <Eye
              blinking={purpleBlinking}
              forceLook={passwordPeeking ? { x: -3, y: -3 } : lookEachOther ? { x: 3, y: 4 } : undefined}
            />
          </div>
        </div>

        <div
          ref={blackRef}
          className="auth-char auth-char-black"
          style={{
            transform: passwordPeeking
              ? "skewX(0deg)"
              : lookEachOther
                ? `skewX(${blackPos.bodySkew + 10}deg)`
                : `skewX(${blackPos.bodySkew}deg)`,
          }}
        >
          <div
            className="auth-char-eyes auth-char-eyes-sm"
            style={{ left: 28 + blackPos.faceX, top: 34 + blackPos.faceY }}
          >
            <Eye blinking={blackBlinking} />
            <Eye blinking={blackBlinking} />
          </div>
        </div>

        <div
          ref={orangeRef}
          className="auth-char auth-char-orange"
          style={{ transform: `skewX(${orangePos.bodySkew}deg)` }}
        >
          <div className="auth-dots" style={{ left: 84 + orangePos.faceX, top: 94 + orangePos.faceY }}>
            <span />
            <span />
          </div>
        </div>

        <div
          ref={yellowRef}
          className="auth-char auth-char-yellow"
          style={{ transform: `skewX(${yellowPos.bodySkew}deg)` }}
        >
          <div className="auth-dots" style={{ left: 52 + yellowPos.faceX, top: 40 + yellowPos.faceY }}>
            <span />
            <span />
          </div>
          <div className="auth-mouth" style={{ left: 40 + yellowPos.faceX, top: 88 + yellowPos.faceY }} />
        </div>
      </div>

      <div className="auth-brand-subtitle">灵动登录动效（参考 animated-characters-login-page）</div>
    </section>
  );
}
