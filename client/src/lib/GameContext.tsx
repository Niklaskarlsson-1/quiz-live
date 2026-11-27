// Håller anslutningen till servern och rummets tillstånd, och delar dem
// med alla komponenter via React Context.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Ack, ClientToServerEvents, GameSettings, JoinResult, RoomState, ServerToClientEvents } from '@quiz/shared';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface GameApi {
  connected: boolean;
  /** Den här klientens spelar-id (samma som socket-id:t). */
  myId: string | null;
  room: RoomState | null;
  /** Svaret man har valt på aktuell fråga. */
  myAnswer: number | null;
  /** Visas när servern har stängt rummet eller anslutningen bröts. */
  notice: string | null;
  createRoom: (name: string) => Promise<Ack<JoinResult>>;
  joinRoom: (code: string, name: string) => Promise<Ack<JoinResult>>;
  leaveRoom: () => void;
  updateSettings: (settings: Partial<GameSettings>) => Promise<Ack<null>>;
  startGame: () => Promise<Ack<null>>;
  answer: (option: number) => void;
  playAgain: () => Promise<Ack<null>>;
  clearNotice: () => void;
}

const GameContext = createContext<GameApi | null>(null);

// Socket.io:s ack-callbacks görs om till promises, med timeout om servern inte svarar.
function request<T>(send: (ack: (res: Ack<T>) => void) => void): Promise<Ack<T>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: 'Servern svarade inte. Försök igen.' }), 5000);
    send((res) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

export function GameProvider({ children, socket: injected }: { children: ReactNode; socket?: GameSocket }) {
  const [socket] = useState<GameSocket>(() => injected ?? io({ autoConnect: true }));
  const [connected, setConnected] = useState(socket.connected);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [answer, setAnswer] = useState<{ questionIndex: number; option: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      // Servern kopplar ihop spelare med anslutningen, så ett avbrott innebär att man lämnat rummet.
      setRoom((current) => {
        if (current) setNotice('Anslutningen till servern bröts, så du har lämnat rummet.');
        return null;
      });
    };
    const onState = (state: RoomState) => setRoom(state);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:state', onState);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:state', onState);
    };
  }, [socket]);

  const createRoom = useCallback(
    (name: string) => request<JoinResult>((ack) => socket.emit('room:create', { name }, ack)),
    [socket]
  );
  const joinRoom = useCallback(
    (code: string, name: string) => request<JoinResult>((ack) => socket.emit('room:join', { code, name }, ack)),
    [socket]
  );
  const leaveRoom = useCallback(() => {
    socket.emit('room:leave');
    setRoom(null);
  }, [socket]);
  const updateSettings = useCallback(
    (settings: Partial<GameSettings>) => request<null>((ack) => socket.emit('game:settings', settings, ack)),
    [socket]
  );
  const startGame = useCallback(() => request<null>((ack) => socket.emit('game:start', ack)), [socket]);
  const playAgain = useCallback(() => request<null>((ack) => socket.emit('game:playAgain', ack)), [socket]);

  const questionIndex = room?.question?.index ?? null;
  const answerFn = useCallback(
    (option: number) => {
      if (questionIndex === null) return;
      setAnswer({ questionIndex, option });
      socket.emit('game:answer', { questionIndex, option });
    },
    [socket, questionIndex]
  );

  const api = useMemo<GameApi>(
    () => ({
      connected,
      myId: socket.id ?? null,
      room,
      // Svaret gäller bara frågan det gavs på.
      myAnswer: answer && answer.questionIndex === questionIndex ? answer.option : null,
      notice,
      createRoom,
      joinRoom,
      leaveRoom,
      updateSettings,
      startGame,
      answer: answerFn,
      playAgain,
      clearNotice: () => setNotice(null),
    }),
    [connected, socket.id, room, answer, questionIndex, notice, createRoom, joinRoom, leaveRoom, updateSettings, startGame, answerFn, playAgain]
  );

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const api = useContext(GameContext);
  if (!api) throw new Error('useGame måste användas inuti <GameProvider>');
  return api;
}

/** För tester: låter en komponent få ett påhittat GameApi. */
export const GameContextProvider = GameContext.Provider;
