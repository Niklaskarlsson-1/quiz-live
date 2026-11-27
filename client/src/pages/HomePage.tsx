import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAME_MAX_LENGTH } from '@quiz/shared';
import { useGame } from '../lib/GameContext.tsx';
import { loadName, saveName } from '../lib/helpers.ts';

export function HomePage() {
  const { createRoom, joinRoom, connected, notice, clearNotice } = useGame();
  const navigate = useNavigate();
  const [name, setName] = useState(loadName);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => ReturnType<typeof createRoom>) => {
    setError(null);
    clearNotice();
    if (!name.trim()) {
      setError('Skriv ditt namn först.');
      return;
    }
    setBusy(true);
    const res = await action();
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    saveName(name.trim());
    navigate(`/room/${res.data.code}`);
  };

  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 4) {
      setError('Rumskoden har fyra bokstäver.');
      return;
    }
    void run(() => joinRoom(code, name));
  };

  return (
    <section className="home">
      <div className="hero">
        <h1>
          Frågesport <span className="accent">live</span>
        </h1>
        <p className="lead">Skapa ett rum, dela koden och tävla mot dina vänner i realtid.</p>
      </div>

      <div className="card home-card">
        {notice && <p className="notice">{notice}</p>}

        <label className="field">
          <span>Ditt namn</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX_LENGTH}
            placeholder="t.ex. Anna"
            autoComplete="nickname"
          />
        </label>

        <button className="btn primary big" disabled={busy || !connected} onClick={() => run(() => createRoom(name))}>
          Skapa nytt rum
        </button>

        <div className="divider"><span>eller gå med i ett rum</span></div>

        <form className="join-row" onSubmit={onJoin}>
          <input
            aria-label="Rumskod"
            className="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            maxLength={4}
            placeholder="KOD"
          />
          <button className="btn" type="submit" disabled={busy || !connected}>
            Gå med
          </button>
        </form>

        {error && <p className="error" role="alert">{error}</p>}
      </div>

      <ol className="how">
        <li><strong>1.</strong> En person skapar ett rum och delar den fyrbokstaviga koden.</li>
        <li><strong>2.</strong> Alla svarar på samma fråga samtidigt. Snabbt rätt svar ger mest poäng.</li>
        <li><strong>3.</strong> Flera rätt i rad ger bonus. Bästa resultaten hamnar på topplistan.</li>
      </ol>
    </section>
  );
}
