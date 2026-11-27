import type { PublicPlayer } from '@quiz/shared';

// Varje spelare får en färg utifrån namnet, så att samma namn alltid har samma färg.
const AVATAR_COLORS = ['#7c5cff', '#ff6b8b', '#2fd29a', '#ffb347', '#4fb3ff', '#e86cff', '#ffd84f', '#5ce1e6'];

export function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ background: avatarColor(name), width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function PlayerChip({ player, isMe }: { player: PublicPlayer; isMe: boolean }) {
  return (
    <span className={`player-chip${player.connected ? '' : ' offline'}`}>
      <Avatar name={player.name} />
      <span className="player-name">
        {player.name}
        {isMe && <span className="tag">du</span>}
        {player.isHost && <span className="tag host">värd</span>}
        {!player.connected && <span className="tag">lämnade</span>}
      </span>
    </span>
  );
}
