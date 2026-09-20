/** Sound asset paths under public/. Missing files are handled gracefully in hooks. */
export const SOUND_PATHS = {
  coursePlaced: "/sounds/click.mp3",
  courseTrashed: "/sounds/whoosh.mp3",
  agentHandoff: "/sounds/chime.mp3",
  generationComplete: "/sounds/complete.mp3",
  warning: "/sounds/warning.mp3",
} as const;

export type SoundId = keyof typeof SOUND_PATHS;
