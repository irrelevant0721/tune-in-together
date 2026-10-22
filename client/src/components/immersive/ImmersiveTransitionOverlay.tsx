import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Sparkles } from 'lucide-react';
import { immersiveTimingCssVars, type ImmersiveTransitionState } from '../../lib/immersiveTransition';

interface Props {
  transition: ImmersiveTransitionState | null;
  coverUrl?: string | null;
}

function stepProgress(steps: ImmersiveTransitionState['steps']): number {
  if (!steps.length) return 0;
  const done = steps.filter((s) => s.status === 'done').length;
  const active = steps.some((s) => s.status === 'active') ? 0.35 : 0;
  return Math.min(100, ((done + active) / steps.length) * 100);
}

export default function ImmersiveTransitionOverlay({ transition, coverUrl }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!transition) {
      setMounted(false);
      return;
    }
    setMounted(true);
  }, [transition]);

  const progress = useMemo(
    () => (transition ? stepProgress(transition.steps) : 0),
    [transition],
  );

  if (!transition || !mounted) return null;

  const isReveal = transition.phase === 'reveal';
  const isEnter = transition.direction === 'enter';

  const title = isReveal
    ? isEnter
      ? '沉浸视界已就绪'
      : '已回到标准视图'
    : isEnter
      ? '正在构建沉浸视界'
      : '正在退出沉浸模式';

  const hint = isReveal
    ? isEnter
      ? '视界展开中'
      : '界面还原中'
    : '请稍候，基础资源就绪后将自动过渡';

  const ringRadius = 42;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = ringCirc - (progress / 100) * ringCirc;

  return createPortal(
    <div
      className={[
        'immersive-transition-overlay',
        isEnter ? 'is-enter' : 'is-exit',
        isReveal ? 'is-revealing' : 'is-loading',
      ].join(' ')}
      style={immersiveTimingCssVars()}
      role="status"
      aria-live="polite"
      aria-busy={!isReveal}
    >
      <div className="immersive-transition-noise" aria-hidden />
      {coverUrl ? (
        <div
          className="immersive-transition-cover"
          style={{ backgroundImage: `url(${coverUrl})` }}
          aria-hidden
        />
      ) : null}
      <div className="immersive-transition-vignette" aria-hidden />
      <div className="immersive-transition-scrim" aria-hidden />

      <div className="immersive-transition-content">
        <div className="immersive-transition-ring-wrap" aria-hidden>
          <svg className="immersive-transition-ring" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="immersive-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(196, 181, 253, 0.95)" />
                <stop offset="100%" stopColor="rgba(0, 245, 212, 0.85)" />
              </linearGradient>
            </defs>
            <circle className="immersive-transition-ring-track" cx="50" cy="50" r={ringRadius} />
            <circle
              className="immersive-transition-ring-progress"
              cx="50"
              cy="50"
              r={ringRadius}
              style={{
                strokeDasharray: ringCirc,
                strokeDashoffset: isReveal ? 0 : ringOffset,
              }}
            />
          </svg>
          <div className="immersive-transition-ring-core">
            {isReveal ? (
              <Sparkles className="immersive-transition-spark" />
            ) : (
              <span className="immersive-transition-percent">{Math.round(progress)}</span>
            )}
          </div>
        </div>

        <p className="immersive-transition-label">{title}</p>
        <p className="immersive-transition-hint">{hint}</p>

        {!isReveal ? (
          <ul className="immersive-transition-steps">
            {transition.steps.map((step) => (
              <li
                key={step.id}
                className={[
                  'immersive-transition-step',
                  step.status === 'active' ? 'is-active' : '',
                  step.status === 'done' ? 'is-done' : '',
                  step.status === 'error' ? 'is-error' : '',
                ].filter(Boolean).join(' ')}
              >
                <span className="immersive-transition-step-dot" aria-hidden>
                  {step.status === 'done' ? <Check strokeWidth={3} /> : null}
                </span>
                <span>{step.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
