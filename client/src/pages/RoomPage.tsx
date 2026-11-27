import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NAME_MAX_LENGTH } from '@quiz/shared';
import { Finished } from '../components/Finished.tsx';
import { Lobby } from '../components/Lobby.tsx';
import { QuestionView } from '../components/QuestionView.tsx';
import { useGame } from '../lib/GameContext.tsx';
import { loadName, saveName } from '../lib/helpers.ts';

export function RoomPage() {
  const { code = '' } = useParams();
  const { room } = useGame();
  const navigate = useNavigate();

  // Om man hamnar i ett annat rum än det i adressen, följ med dit.
  useEffect(() => {
    if (room && room.code !== code.toUpperCase()) navigate(`/room/${room.code}`, { replace: true });
  }, [room, code, navigate]);

  // Inte med i rummet än (t.ex. via en delad länk): visa ett formulär för att gå med.
  if (!room) return <JoinByLink code={code.toUpperCase()} />;

  switch (room.phase) {
    case 'lobby':
      return <Lobby />;
    case 'question':
    case 'reveal':
      return <QuestionView />;
    case 'finished':
      return <Finished />;
  }
}

function JoinByLink({ code }: { code: string }) {
  const { joinRoom, connected } = useGame();
  const navigate = useNavigate();
  const [name, setName] = useState(loadName);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await joinRoom(code, name);
    if (res.ok) saveName(name.trim());
    else setError(res.error);
  };

  return (
    <section className="card narrow">
      <p className="eyebrow">Du är inbjuden till rum</p>
      <p className="room-code">{code}</p>
      <form onSubmit={onSubmit} className="stack">
        <label className="field">
          <span>Ditt namn</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX_LENGTH} autoFocus />
        </label>
        <button className="btn primary big" type="submit" disabled={!connected || !name.trim()}>
          Gå med
        </button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
      <button className="btn ghost" onClick={() => navigate('/')}>
        Till startsidan
      </button>
    </section>
  );
}
