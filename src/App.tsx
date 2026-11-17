import { ExternalLink, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useStickmanGame } from './game/useStickmanGame';

const PORTFOLIO_URL =
  'https://ghufran-shahid-tech.github.io/Personal-Portfolio-/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAcGRvZgJzcnRjBmFwcF9pZA81NjcwNjczNDMzNTI0MjcAAacV1A-4JC8AaHMmfgJiGBD_y8yuQaQ2qGA_vxHOqbClo-DXubopUfr-NtL2sg_aem_VntXPuKkB2AS8_PIkhaDQw';

export default function App() {
  const {
    shellRef,
    canvasRef,
    score,
    best,
    gameState,
    hasInteracted,
    muted,
    togglePause,
    toggleMute,
    resetGame,
  } = useStickmanGame();

  const isPaused = gameState === 'PAUSED';

  return (
    <main
      ref={shellRef}
      aria-label="Stickman Launcher arcade game"
      className="fixed inset-0 isolate h-dvh w-full overflow-hidden bg-white text-[#111111] select-none"
    >
      <canvas
        ref={canvasRef}
        aria-label="Hold and drag to aim. Release to fire."
        className="absolute inset-0 block h-full w-full cursor-crosshair touch-none select-none"
      />

      {/* Top HUD */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] pt-[max(12px,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
        <button
          type="button"
          onClick={resetGame}
          aria-label="Reset game"
          title="Reset (R)"
          className="pointer-events-auto grid h-12 w-12 shrink-0 touch-manipulation place-items-center rounded-xl bg-[#707070] text-white shadow-md transition-colors hover:bg-[#595959] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111] sm:h-14 sm:w-14"
        >
          <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} aria-hidden="true" />
        </button>

        <div
          aria-live="polite"
          className="pointer-events-none flex min-w-[96px] flex-col items-center text-center leading-none"
        >
          <div className="font-display text-3xl font-extrabold tracking-tight text-[#080808] tabular-nums sm:text-5xl">
            {score}
          </div>
          <div className="mt-1.5 text-xs font-extrabold tracking-widest text-[#525252] uppercase tabular-nums sm:text-sm">
            BEST {best}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            title={muted ? 'Unmute (M)' : 'Mute (M)'}
            className="grid h-12 w-12 shrink-0 touch-manipulation place-items-center rounded-xl border border-neutral-300 bg-white/95 text-[#111111] shadow-sm transition-colors hover:bg-neutral-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111] sm:h-14 sm:w-14"
          >
            {muted ? (
              <VolumeX className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.4} aria-hidden="true" />
            ) : (
              <Volume2 className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.4} aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => togglePause()}
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
            title={isPaused ? 'Resume (P)' : 'Pause (P)'}
            className="grid h-12 w-14 shrink-0 touch-manipulation place-items-center rounded-xl bg-[#263747] text-white shadow-md transition-colors hover:bg-[#1c2936] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111] sm:h-14 sm:w-16"
          >
            {isPaused ? (
              <Play className="h-5 w-5 fill-current sm:h-6 sm:w-6" aria-hidden="true" />
            ) : (
              <Pause className="h-5 w-5 fill-current sm:h-6 sm:w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Initial Aim Prompt */}
      {!hasInteracted && !isPaused && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 px-4 text-center">
          <p className="rounded-lg border border-neutral-900/12 bg-white/90 px-4 py-2 text-xs font-extrabold tracking-wider whitespace-nowrap text-[#111111] uppercase shadow-xs sm:text-base">
            Hold to Aim · Release to Fire
          </p>
        </div>
      )}

      {/* Owner & Portfolio Footer */}
      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] pb-[max(8px,env(safe-area-inset-bottom))] sm:pb-3">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 rounded-xl border border-neutral-900/10 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-[#404040] shadow-xs backdrop-blur-xs sm:px-4 sm:py-2 sm:text-xs">
          <span>
            Owner &amp; Creator:{' '}
            <strong className="font-bold text-[#111111]">Ghufran Tech</strong>
          </span>
          <span className="text-neutral-300" aria-hidden="true">
            |
          </span>
          <a
            href={PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-bold text-[#263747] underline decoration-neutral-400 underline-offset-2 transition-colors hover:text-[#111111] hover:decoration-[#111111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]"
          >
            <span>Portfolio: Ghufran Tech</span>
            <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={2.4} aria-hidden="true" />
          </a>
        </div>
      </footer>

      {/* Pause Overlay */}
      {isPaused && (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Game paused"
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-white/80 px-6 backdrop-blur-[2px]"
        >
          <h1 className="font-display text-4xl font-extrabold tracking-widest text-[#111111] uppercase sm:text-5xl">
            Paused
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => togglePause(false)}
              className="inline-flex min-h-[48px] shrink-0 touch-manipulation items-center gap-2 rounded-xl bg-[#263747] px-6 py-3 text-base font-bold whitespace-nowrap text-white shadow-md transition-colors hover:bg-[#1c2936] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]"
            >
              <Play className="h-5 w-5 fill-current" aria-hidden="true" />
              <span>Resume</span>
            </button>

            <button
              type="button"
              onClick={resetGame}
              className="inline-flex min-h-[48px] shrink-0 touch-manipulation items-center gap-2 rounded-xl border border-neutral-300 bg-white px-6 py-3 text-base font-bold whitespace-nowrap text-[#111111] shadow-sm transition-colors hover:bg-neutral-100 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]"
            >
              <RotateCcw className="h-5 w-5" strokeWidth={2.3} aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
