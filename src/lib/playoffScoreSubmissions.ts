export const PLAYOFF_SCORE_NOTE_PREFIX = "rhino:playoff-game:";

export function makePlayoffScoreNote(gameId: string) {
  return `${PLAYOFF_SCORE_NOTE_PREFIX}${gameId}`;
}

export function parsePlayoffScoreGameId(note?: string | null) {
  if (!note?.startsWith(PLAYOFF_SCORE_NOTE_PREFIX)) return null;

  const gameId = note.slice(PLAYOFF_SCORE_NOTE_PREFIX.length);
  return /^[0-9a-f-]{36}$/i.test(gameId) ? gameId : null;
}
