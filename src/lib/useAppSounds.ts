"use client";

import useSound from "use-sound";
import { useCallback } from "react";
import { SOUND_PATHS, type SoundId } from "@/lib/sounds";
import { useSoundSettings } from "@/components/providers/SoundProvider";

const noop = () => {};

export function useAppSounds() {
  const { muted } = useSoundSettings();

  const opts = {
    volume: muted ? 0 : 0.4,
    soundEnabled: !muted,
    onloaderror: noop,
    onplayerror: noop,
  };

  const [playClick] = useSound(SOUND_PATHS.coursePlaced, opts);
  const [playWhoosh] = useSound(SOUND_PATHS.courseTrashed, opts);
  const [playChime] = useSound(SOUND_PATHS.agentHandoff, opts);
  const [playComplete] = useSound(SOUND_PATHS.generationComplete, opts);
  const [playWarning] = useSound(SOUND_PATHS.warning, opts);

  const play = useCallback(
    (id: SoundId) => {
      if (muted) return;
      const map: Record<SoundId, () => void> = {
        coursePlaced: playClick,
        courseTrashed: playWhoosh,
        agentHandoff: playChime,
        generationComplete: playComplete,
        warning: playWarning,
      };
      try {
        map[id]();
      } catch {
        /* missing asset */
      }
    },
    [muted, playClick, playWhoosh, playChime, playComplete, playWarning]
  );

  return { play };
}
