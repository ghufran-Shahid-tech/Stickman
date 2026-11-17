import { GAME_ASSETS } from './assets';

function createAudio(src: string, volume = 1): HTMLAudioElement {
  const audio = new Audio();
  audio.src = src;
  audio.preload = 'auto';
  audio.volume = volume;
  return audio;
}

function createAudioPool(
  src: string,
  size: number,
  volume = 1,
): HTMLAudioElement[] {
  return Array.from({ length: size }, () => createAudio(src, volume));
}

export class GameAudioController {
  private readonly enemies: HTMLAudioElement[];
  private readonly firePool: HTMLAudioElement[];
  private readonly hitPool: HTMLAudioElement[];
  private readonly missAudio: HTMLAudioElement;
  private fireCursor = 0;
  private hitCursor = 0;
  private muted: boolean;

  constructor(initialMuted = false) {
    this.muted = initialMuted;
    this.enemies = GAME_ASSETS.enemyAudio.map((src) => createAudio(src));
    this.firePool = createAudioPool(GAME_ASSETS.fireAudio, 4, 0.35);
    this.hitPool = createAudioPool(GAME_ASSETS.hitAudio, 2);
    this.missAudio = createAudio(GAME_ASSETS.missAudio);
    this.applyMutedState();
  }

  private get allElements(): HTMLAudioElement[] {
    return [...this.enemies, ...this.firePool, ...this.hitPool, this.missAudio];
  }

  private applyMutedState(): void {
    for (const audio of this.allElements) {
      audio.muted = this.muted;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMutedState();
    if (muted) {
      this.pauseAll();
    }
  }

  private playElement(audio: HTMLAudioElement | undefined, restart = true): void {
    if (!audio || this.muted) return;
    try {
      if (restart) {
        audio.currentTime = 0;
      }
      const promise = audio.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {});
      }
    } catch {
      // Ignore autoplay errors prior to user interaction
    }
  }

  private stopElement(audio: HTMLAudioElement | undefined, rewind = true): void {
    if (!audio) return;
    try {
      audio.pause();
      if (rewind) {
        audio.currentTime = 0;
      }
    } catch {
      // Ignore media state errors
    }
  }

  playEnemy(index: number, restart = true): void {
    this.playElement(this.enemies[index], restart);
  }

  playFire(): void {
    const audio = this.firePool[this.fireCursor];
    this.fireCursor = (this.fireCursor + 1) % this.firePool.length;
    this.playElement(audio, true);
  }

  playHit(): void {
    const audio = this.hitPool[this.hitCursor];
    this.hitCursor = (this.hitCursor + 1) % this.hitPool.length;
    this.playElement(audio, true);
  }

  playMiss(): void {
    if (this.muted) return;
    if (
      !this.missAudio.paused &&
      !this.missAudio.ended &&
      this.missAudio.currentTime < 0.65
    ) {
      return;
    }
    this.playElement(this.missAudio, true);
  }

  stopMiss(rewind = true): void {
    this.stopElement(this.missAudio, rewind);
  }

  stopAllEnemies(rewind = true): void {
    for (const audio of this.enemies) {
      this.stopElement(audio, rewind);
    }
  }

  pauseAll(): void {
    this.stopAllEnemies(false);
    this.stopMiss(false);
    for (const audio of this.firePool) {
      this.stopElement(audio, false);
    }
    for (const audio of this.hitPool) {
      this.stopElement(audio, false);
    }
  }

  stopAll(): void {
    this.stopAllEnemies(true);
    this.stopMiss(true);
    for (const audio of this.firePool) {
      this.stopElement(audio, true);
    }
    for (const audio of this.hitPool) {
      this.stopElement(audio, true);
    }
  }
}
