"use client";

import { SessionProvider } from "next-auth/react";
import { SoundProvider } from "@/components/providers/SoundProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SoundProvider>{children}</SoundProvider>
    </SessionProvider>
  );
}
