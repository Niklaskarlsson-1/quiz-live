import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_CATEGORIES, MAX_PLAYERS, SETTINGS_LIMITS, type GameSettings } from '@quiz/shared';
import { useGame } from '../lib/GameContext.tsx';
import { PlayerChip } from './PlayerChip.tsx';

export function Lobby() {
  const { room, myId, updateSettings, startGame, leaveRoom } = useGame();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  if (!room) return null;
  const me = room.players.find((p) => p.id === myId);
  const isHost = !!me?.isHost;
  const host = room.players.find((p) => p.isHost);
  const inviteUrl = `${window.location.origin}/room/${room.code}`;

  const change = async (settings: Partial<GameSettings>) => {
    const res = await updateSettings(settings);
    setError(res.ok ? null : res.error);
  };

  const start = async () => {
    const res = await startGame();
    setError(res.ok ? null : res.error);
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Kunde inte kopiera. Dela koden i stället.');
    }
  };

  return (
    <section className="lobby">
      <div className="card lobby-code">
        <p className="eyebrow">Rumskod</p>
        <p className="room-code" aria-label={`Rumskod ${room.code.split('').join(' ')}`}>{room.code}</p>
        <button className="btn ghost small" onClick={copyInvite}>
          {copied ? 'Länken är kopierad ✓' : 'Kopiera inbjudningslänk'}
        </button>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Spelare</h2>
          <span className="muted">{room.players.length} / {MAX_PLAYERS}</span>
        </div>
        <ul className="player-list">
          {room.players.map((p) => (
            <li key={p.id}>
              <PlayerChip player={p} isMe={p.id === myId} />
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Inställningar</h2>
          {!isHost && <span className="muted">Väljs av {host?.name}</span>}
        </div>

        <label className="field">
          <span>Kategori</span>
          <select
            value={room.settings.category}
            disabled={!isHost}
            onChange={(e) => change({ category: e.target.value })}
          >
            <option value={ALL_CATEGORIES}>Alla kategorier</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>Antal frågor</span>
          <Segmented
            label="Antal frågor"
            values={SETTINGS_LIMITS.questionCount}
            value={room.settings.questionCount}
            disabled={!isHost}
            onChange={(v) => change({ questionCount: v })}
          />
        </div>

        <div className="field">
          <span>Sekunder per fråga</span>
          <Segmented
            label="Sekunder per fråga"
            values={SETTINGS_LIMITS.secondsPerQuestion}
            value={room.settings.secondsPerQuestion}
            disabled={!isHost}
            onChange={(v) => change({ secondsPerQuestion: v })}
          />
        </div>
      </div>

      <div className="lobby-actions">
        {isHost ? (
          <button className="btn primary big" onClick={start}>
            Starta spelet
          </button>
        ) : (
          <p className="waiting">Väntar på att {host?.name} startar spelet…</p>
        )}
        <button
          className="btn ghost"
          onClick={() => {
            leaveRoom();
            navigate('/');
          }}
        >
          Lämna rummet
        </button>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </section>
  );
}

function Segmented({
  label,
  values,
  value,
  disabled,
  onChange,
}: {
  label: string;
  values: readonly number[];
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {values.map((v) => (
        <button
          key={v}
          role="radio"
          aria-checked={v === value}
          className={v === value ? 'active' : ''}
          disabled={disabled}
          onClick={() => onChange(v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
