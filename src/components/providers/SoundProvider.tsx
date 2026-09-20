"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface SoundContextValue {
  muted: boolean;
  toggleMute: () => void;
  setMuted: (value: boolean) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(false);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  const value = useMemo(
    () => ({ muted, toggleMute, setMuted }),
    [muted, toggleMute]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSoundSettings() {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error("useSoundSettings must be used within SoundProvider");
  }
  return ctx;
}
