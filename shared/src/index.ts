// Typer som delas mellan server och klient.
// Socket.io använder ClientToServerEvents och ServerToClientEvents för att
// typkontrollera varje händelse i båda ändar: skickar klienten fel data,
// eller lyssnar på en händelse som inte finns, blir det ett kompileringsfel.

export type Phase = 'lobby' | 'question' | 'reveal' | 'finished';

export const ALL_CATEGORIES = 'Alla';

export interface GameSettings {
  category: string; // en kategori eller ALL_CATEGORIES
  questionCount: number;
  secondsPerQuestion: number;
}

export const SETTINGS_LIMITS = {
  questionCount: [5, 10, 15],
  secondsPerQuestion: [10, 15, 20],
} as const;

export const DEFAULT_SETTINGS: GameSettings = {
  category: ALL_CATEGORIES,
  questionCount: 10,
  secondsPerQuestion: 15,
};

export const NAME_MAX_LENGTH = 16;
export const MAX_PLAYERS = 8;

export interface PublicPlayer {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  connected: boolean;
  /** Har svarat på den aktuella frågan (inte vad, bara att). */
  hasAnswered: boolean;
  /** Antal rätt i rad just nu. */
  streak: number;
  correctCount: number;
}

/** En fråga som den skickas till klienterna: utan rätt svar. */
export interface PublicQuestion {
  index: number; // 0-baserat
  total: number;
  category: string;
  text: string;
  options: string[];
  durationMs: number;
  /** Tid kvar när tillståndet skickades. Klienten räknar ned från detta. */
  remainingMs: number;
}

export interface RevealInfo {
  correctIndex: number;
  /** Varje spelares svar (null = svarade inte) och poäng för frågan. */
  results: Record<string, { answer: number | null; points: number }>;
  /** Tid tills nästa fråga visas. */
  nextInMs: number;
}

export interface RoomState {
  code: string;
  phase: Phase;
  players: PublicPlayer[];
  settings: GameSettings;
  question: PublicQuestion | null;
  reveal: RevealInfo | null;
}

export type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

export interface JoinResult {
  code: string;
  playerId: string;
}

export interface ClientToServerEvents {
  'room:create': (data: { name: string }, ack: (res: Ack<JoinResult>) => void) => void;
  'room:join': (data: { code: string; name: string }, ack: (res: Ack<JoinResult>) => void) => void;
  'room:leave': () => void;
  'game:settings': (settings: Partial<GameSettings>, ack: (res: Ack<null>) => void) => void;
  'game:start': (ack: (res: Ack<null>) => void) => void;
  'game:answer': (data: { questionIndex: number; option: number }) => void;
  'game:playAgain': (ack: (res: Ack<null>) => void) => void;
}

export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
}

export interface LeaderboardEntry {
  id: number;
  playerName: string;
  score: number;
  correctCount: number;
  questionCount: number;
  category: string;
  createdAt: string;
}
