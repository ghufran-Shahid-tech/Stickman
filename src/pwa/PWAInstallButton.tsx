import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'hud' | 'menu';
}

export function PWAInstallButton({ variant = 'hud' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    if (variant === 'menu') {
      return (
        <button
          type="button"
          onClick={() => void install()}
          onPointerDown={(e) => e.stopPropagation()}
          className="inline-flex min-h-[48px] shrink-0 touch-manipulation items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-600/90 px-6 py-3 text-base font-bold whitespace-nowrap text-white shadow-md transition-colors hover:bg-emerald-500 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100"
        >
          <Download className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
          <span>Install Offline App</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => void install()}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Install app for offline play"
        title="Install Offline App"
        className="grid h-11 shrink-0 touch-manipulation grid-flow-col place-items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-600/90 px-3 text-xs font-extrabold tracking-wide text-white shadow-sm transition-colors hover:bg-emerald-500 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100 sm:h-14 sm:px-4 sm:text-sm"
      >
        <Download className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} aria-hidden="true" />
        <span className="hidden sm:inline">Install</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          onPointerDown={(e) => e.stopPropagation()}
          className={
            variant === 'menu'
              ? 'inline-flex min-h-[48px] shrink-0 touch-manipulation items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-base font-bold whitespace-nowrap text-slate-100 shadow-sm transition-colors hover:bg-slate-800 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100'
              : 'inline-flex h-11 shrink-0 touch-manipulation items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-2.5 text-xs font-bold text-slate-100 shadow-sm transition-colors hover:bg-slate-800 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-100 sm:h-14 sm:px-3.5 sm:text-sm'
          }
        >
          <Download className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Install on iOS"
            onPointerDown={(e) => e.stopPropagation()}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
          >
            <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-extrabold text-white">
                  Install Stickman Launcher
                </h2>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install instructions"
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                1. Tap the <strong className="text-white">Share</strong> icon in Safari.
                <br />
                2. Scroll down and tap{' '}
                <strong className="text-white">Add to Home Screen</strong> for offline play.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-sky-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-500"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
