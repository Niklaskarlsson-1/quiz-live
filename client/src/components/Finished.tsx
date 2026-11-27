import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../lib/GameContext.tsx';
import { formatScore, ranked } from '../lib/helpers.ts';
import { Avatar } from './PlayerChip.tsx';

export function Finished() {
  const { room, myId, playAgain, leaveRoom } = useGame();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  if (!room) return null;

  const standings = ranked(room.players);
  const podium = standings.slice(0, 3);
  const me = standings.find((p) => p.id === myId);
  const isHost = !!me?.isHost;

  return (
    <section className="finished">
      <h1 className="center">Resultat</h1>
      {me && (
        <p className="lead center">
          Du kom på plats {me.place} med {formatScore(me.score)} poäng.
        </p>
      )}

      {/* Pallen visas i ordningen 2–1–3, som på en riktig prispall. */}
      <ol className="podium" aria-label="Pallen">
        {[podium[1], podium[0], podium[2]].map(
          (p) =>
            p && (
              <li key={p.id} className={`podium-step place-${p.place}`}>
                <Avatar name={p.name} size={p.place === 1 ? 64 : 48} />
                <span className="podium-name">{p.name}</span>
                <span className="podium-score">{formatScore(p.score)}</span>
                <span className="podium-block">{p.place}</span>
              </li>
            )
        )}
      </ol>

      <div className="card">
        <ol className="scoreboard">
          {standings.map((p) => (
            <li key={p.id} className={p.id === myId ? 'me' : ''}>
              <span className="place">{p.place}</span>
              <Avatar name={p.name} size={28} />
              <span className="sb-name">
                {p.name}
                {!p.connected && <span className="tag">lämnade</span>}
              </span>
              <span className="muted small">{p.correctCount} rätt</span>
              <span className="sb-score">{formatScore(p.score)}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="lobby-actions">
        {isHost ? (
          <button
            className="btn primary big"
            onClick={async () => {
              const res = await playAgain();
              setError(res.ok ? null : res.error);
            }}
          >
            Spela igen
          </button>
        ) : (
          <p className="waiting">Väntar på att värden startar en ny omgång…</p>
        )}
        <div className="row">
          <Link className="btn ghost" to="/topplista">Se topplistan</Link>
          <button
            className="btn ghost"
            onClick={() => {
              leaveRoom();
              navigate('/');
            }}
          >
            Lämna rummet
          </button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
