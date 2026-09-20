"use client";

import { useCallback } from "react";
import { playSound, type SoundId } from "@/lib/sounds";
import { useSoundSettings } from "@/components/providers/SoundProvider";

export function useAppSounds() {
  const { muted } = useSoundSettings();

  const play = useCallback(
    (id: SoundId) => {
      if (muted) return;
      playSound(id);
    },
    [muted]
  );

  return { play };
}
