// Integrationstest: startar den riktiga servern (Express + Socket.io) och
// spelar ett helt spel med två riktiga Socket.io-klienter. Databasen byts mot
// data i minnet, så testet behöver ingen databasfil.
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Ack, ClientToServerEvents, JoinResult, RoomState, ServerToClientEvents } from '@quiz/shared';
import { createApp } from './app.ts';
import type { Room } from './game.ts';
import { makeQuestions } from './test/helpers.ts';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

let server: ReturnType<typeof createApp>;
let url: string;
let clients: Client[];
let saved: Room[];

beforeEach(async () => {
  saved = [];
  server = createApp({
    loadQuestions: async () => makeQuestions(2),
    saveResults: async (room) => {
      saved.push(structuredClone(room));
    },
    categories: async () => ['Test'],
    getLeaderboard: async (limit) =>
      [{ id: 1, playerName: 'Anna', score: 1500, correctCount: 2, questionCount: 2, category: 'Alla', createdAt: '2026-01-01T00:00:00.000Z' }].slice(0, limit),
    revealMs: 30, // kort paus mellan frågor så att testet går snabbt
  });
  await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
  url = `http://localhost:${(server.httpServer.address() as AddressInfo).port}`;
  clients = [];
});

afterEach(async () => {
  clients.forEach((c) => c.disconnect());
  await server.close();
});

async function newClient(): Promise<Client> {
  const client: Client = connect(url, { transports: ['websocket'], forceNew: true });
  clients.push(client);
  await new Promise<void>((resolve) => client.on('connect', () => resolve()));
  return client;
}

/** Väntar tills klienten får ett tillstånd som uppfyller villkoret. */
function waitForState(client: Client, predicate: (s: RoomState) => boolean): Promise<RoomState> {
  return new Promise((resolve) => {
    const handler = (s: RoomState) => {
      if (predicate(s)) {
        client.off('room:state', handler);
        resolve(s);
      }
    };
    client.on('room:state', handler);
  });
}

const create = (c: Client, name: string) =>
  new Promise<Ack<JoinResult>>((resolve) => c.emit('room:create', { name }, resolve));
const join = (c: Client, code: string, name: string) =>
  new Promise<Ack<JoinResult>>((resolve) => c.emit('room:join', { code, name }, resolve));
const start = (c: Client) => new Promise<Ack<null>>((resolve) => c.emit('game:start', resolve));

describe('REST-API', () => {
  it('svarar på /api/health', async () => {
    const res = await fetch(`${url}/api/health`);
    expect(await res.json()).toEqual({ ok: true, rooms: 0 });
  });

  it('listar kategorier', async () => {
    expect(await (await fetch(`${url}/api/categories`)).json()).toEqual(['Test']);
  });

  it('ger topplistan och begränsar antalet rader', async () => {
    const res = await fetch(`${url}/api/leaderboard?limit=1`);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].playerName).toBe('Anna');
  });

  it('svarar med fel 500 när databasen inte svarar', async () => {
    await server.close();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    server = createApp({
      loadQuestions: async () => [],
      saveResults: async () => {},
      categories: async () => {
        throw new Error('databasen ligger nere');
      },
      getLeaderboard: async () => [],
    });
    await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
    const port = (server.httpServer.address() as AddressInfo).port;

    const res = await fetch(`http://localhost:${port}/api/categories`);
    expect(res.status).toBe(500);
  });
});

describe('Socket.io', () => {
  it('skapar ett rum och låter en annan spelare gå med via koden', async () => {
    const host = await newClient();
    const guest = await newClient();

    const created = await create(host, 'Anna');
    expect(created.ok).toBe(true);
    const code = created.ok ? created.data.code : '';

    const hostSeesGuest = waitForState(host, (s) => s.players.length === 2);
    const joined = await join(guest, code.toLowerCase(), 'Bo'); // koden är inte skiftlägeskänslig
    expect(joined.ok).toBe(true);

    const state = await hostSeesGuest;
    expect(state.players.map((p) => [p.name, p.isHost])).toEqual([
      ['Anna', true],
      ['Bo', false],
    ]);
  });

  it('ger tydliga fel för okänd kod och upptaget namn', async () => {
    const host = await newClient();
    const guest = await newClient();
    const created = await create(host, 'Anna');
    const code = created.ok ? created.data.code : '';

    expect(await join(guest, 'ZZZZ', 'Bo')).toEqual({ ok: false, error: 'Hittade inget rum med den koden.' });
    expect(await join(guest, code, 'anna')).toEqual({ ok: false, error: 'Namnet är redan taget i det här rummet.' });
    expect(await join(guest, code, '')).toEqual({ ok: false, error: 'Skriv ett namn på 1–16 tecken.' });
  });

  it('låter bara värden starta spelet', async () => {
    const host = await newClient();
    const guest = await newClient();
    const created = await create(host, 'Anna');
    await join(guest, created.ok ? created.data.code : '', 'Bo');

    expect(await start(guest)).toEqual({ ok: false, error: 'Bara värden kan starta spelet.' });
  });

  it('spelar ett helt spel: frågor, svar, poäng och sparat resultat', async () => {
    const host = await newClient();
    const guest = await newClient();
    const created = await create(host, 'Anna');
    await join(guest, created.ok ? created.data.code : '', 'Bo');

    // Fråga 1: Anna svarar rätt, Bo fel. Rätt svar skickas inte i förväg.
    const q1 = waitForState(guest, (s) => s.phase === 'question' && s.question?.index === 0);
    expect(await start(host)).toEqual({ ok: true, data: null });
    const firstQuestion = (await q1).question!;
    expect(firstQuestion.options).toHaveLength(4);
    expect(JSON.stringify(await q1)).not.toContain('correctIndex');

    const correct = firstQuestion.options.indexOf('Rätt');
    const wrong = (correct + 1) % 4;

    const reveal1 = waitForState(host, (s) => s.phase === 'reveal');
    host.emit('game:answer', { questionIndex: 0, option: correct });
    guest.emit('game:answer', { questionIndex: 0, option: wrong });

    // Båda har svarat, så frågan avslutas direkt utan att vänta på timern.
    const revealed = await reveal1;
    expect(revealed.reveal?.correctIndex).toBe(correct);
    const [anna, bo] = revealed.players;
    expect(anna.score).toBeGreaterThan(900);
    expect(bo.score).toBe(0);

    // Fråga 2 kommer automatiskt efter pausen.
    const q2 = await waitForState(host, (s) => s.phase === 'question' && s.question?.index === 1);
    const finished = waitForState(guest, (s) => s.phase === 'finished');
    const correct2 = q2.question!.options.indexOf('Rätt');
    host.emit('game:answer', { questionIndex: 1, option: correct2 });
    guest.emit('game:answer', { questionIndex: 1, option: correct2 });

    const end = await finished;
    expect(end.players.find((p) => p.name === 'Anna')?.correctCount).toBe(2);
    expect(end.players.find((p) => p.name === 'Bo')?.correctCount).toBe(1);

    await vi.waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0].players.map((p) => p.name)).toEqual(['Anna', 'Bo']);
  });

  it('avslutar frågan när den som inte har svarat lämnar', async () => {
    const host = await newClient();
    const guest = await newClient();
    const created = await create(host, 'Anna');
    await join(guest, created.ok ? created.data.code : '', 'Bo');

    const q1 = waitForState(host, (s) => s.phase === 'question');
    await start(host);
    await q1;

    const revealed = waitForState(host, (s) => s.phase === 'reveal');
    host.emit('game:answer', { questionIndex: 0, option: 0 });
    guest.disconnect();

    const state = await revealed;
    expect(state.players.find((p) => p.name === 'Bo')?.connected).toBe(false);
  });

  it('tar bort rummet när alla har lämnat', async () => {
    const host = await newClient();
    await create(host, 'Anna');
    expect(server.rooms.roomCount).toBe(1);

    host.disconnect();
    await vi.waitFor(() => expect(server.rooms.roomCount).toBe(0));
  });
});
