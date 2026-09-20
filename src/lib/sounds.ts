/**
 * Sound design for the plan map.
 *
 * These were originally mp3 assets under public/sounds/, but that directory
 * has never existed in the repo, so every call was silently swallowed by
 * use-sound's error handlers. They are synthesized with the Web Audio API
 * instead: no assets to ship, and it matches the preview's tone() helper.
 */

export const SOUND_PATHS = {
  coursePlaced: "/sounds/click.mp3",
  courseTrashed: "/sounds/whoosh.mp3",
  agentHandoff: "/sounds/chime.mp3",
  generationComplete: "/sounds/complete.mp3",
  warning: "/sounds/warning.mp3",
} as const;

export type SoundId =
  | "coursePlaced"
  | "courseTrashed"
  | "agentHandoff"
  | "generationComplete"
  | "warning"
  | "tick"
  | "handoff"
  | "done";

interface Partial_ {
  freq: number;
  start: number;
  dur: number;
  type: OscillatorType;
  vol: number;
}

const VOICES: Record<SoundId, Partial_[]> = {
  // A station snapping into place.
  coursePlaced: [
    { freq: 880, start: 0, dur: 0.08, type: "triangle", vol: 0.25 },
    { freq: 1320, start: 0.06, dur: 0.14, type: "triangle", vol: 0.2 },
    { freq: 1760, start: 0.12, dur: 0.2, type: "sine", vol: 0.12 },
  ],
  courseTrashed: [
    { freq: 300, start: 0, dur: 0.18, type: "sawtooth", vol: 0.12 },
    { freq: 160, start: 0.08, dur: 0.25, type: "sawtooth", vol: 0.1 },
  ],
  warning: [
    { freq: 220, start: 0, dur: 0.12, type: "square", vol: 0.1 },
    { freq: 185, start: 0.12, dur: 0.18, type: "square", vol: 0.1 },
  ],
  // One station or one line arriving during the build.
  tick: [{ freq: 1200, start: 0, dur: 0.03, type: "sine", vol: 0.05 }],
  // One agent passing work to the next.
  handoff: [
    { freq: 523, start: 0, dur: 0.1, type: "triangle", vol: 0.15 },
    { freq: 784, start: 0.09, dur: 0.16, type: "triangle", vol: 0.13 },
  ],
  agentHandoff: [
    { freq: 523, start: 0, dur: 0.1, type: "triangle", vol: 0.15 },
    { freq: 784, start: 0.09, dur: 0.16, type: "triangle", vol: 0.13 },
  ],
  // The plan is ready.
  done: [
    { freq: 523, start: 0, dur: 0.12, type: "triangle", vol: 0.18 },
    { freq: 659, start: 0.1, dur: 0.12, type: "triangle", vol: 0.18 },
    { freq: 784, start: 0.2, dur: 0.12, type: "triangle", vol: 0.18 },
    { freq: 1047, start: 0.3, dur: 0.35, type: "sine", vol: 0.15 },
  ],
  generationComplete: [
    { freq: 523, start: 0, dur: 0.12, type: "triangle", vol: 0.18 },
    { freq: 659, start: 0.1, dur: 0.12, type: "triangle", vol: 0.18 },
    { freq: 784, start: 0.2, dur: 0.12, type: "triangle", vol: 0.18 },
    { freq: 1047, start: 0.3, dur: 0.35, type: "sine", vol: 0.15 },
  ],
};

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = ctx ?? new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Play one sound. No-ops when Web Audio is unavailable or blocked. */
export function playSound(id: SoundId): void {
  const ac = audioContext();
  if (!ac) return;
  const voices = VOICES[id];
  if (!voices) return;

  for (const v of voices) {
    try {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = v.type;
      osc.frequency.setValueAtTime(v.freq, ac.currentTime + v.start);
      gain.gain.setValueAtTime(v.vol, ac.currentTime + v.start);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + v.start + v.dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(ac.currentTime + v.start);
      osc.stop(ac.currentTime + v.start + v.dur);
    } catch {
      /* audio blocked until the first gesture; nothing to do */
    }
  }
}
