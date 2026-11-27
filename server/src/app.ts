// Bygger Express-appen och Socket.io-servern. Hålls skild från index.ts
// så att testerna kan starta en server med egna beroenden.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import type { ClientToServerEvents, LeaderboardEntry, ServerToClientEvents } from '@quiz/shared';
import { toPublicState, type Room } from './game.ts';
import { RoomManager, type RoomDeps } from './rooms.ts';

export interface AppDeps extends Omit<RoomDeps, 'onChange'> {
  getLeaderboard: (limit: number) => Promise<LeaderboardEntry[]>;
}

export function createApp(deps: AppDeps) {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
  const now = deps.now ?? Date.now;

  // Varje rum är ett Socket.io-"room" med samma namn som koden.
  // Alla i rummet får det nya tillståndet när något ändras.
  const broadcast = (room: Room) => {
    io.to(room.code).emit('room:state', toPublicState(room, now()));
  };
  const rooms = new RoomManager({ ...deps, onChange: broadcast });

  // ---------- REST ----------

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.roomCount });
  });

  app.get('/api/categories', async (_req, res, next) => {
    try {
      res.json(await deps.categories());
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/leaderboard', async (req, res, next) => {
    try {
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
      res.json(await deps.getLeaderboard(limit));
    } catch (err) {
      next(err);
    }
  });

  // I produktion serverar samma server även den byggda React-appen.
  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api|socket\.io).*/, (_req, res) => res.sendFile(`${clientDist}/index.html`));
  }

  // ---------- Socket.io ----------

  io.on('connection', (socket) => {
    const joinSocketRoom = (code: string) => {
      for (const r of socket.rooms) if (r !== socket.id) socket.leave(r);
      socket.join(code);
      const room = rooms.get(code);
      if (room) socket.emit('room:state', toPublicState(room, now()));
    };

    socket.on('room:create', (data, ack) => {
      const res = rooms.create(socket.id, data?.name);
      if (res.ok) joinSocketRoom(res.data.code);
      ack?.(res);
    });

    socket.on('room:join', (data, ack) => {
      // rooms.join meddelar de andra i rummet; den nya spelaren får tillståndet av joinSocketRoom.
      const res = rooms.join(socket.id, data?.code, data?.name);
      if (res.ok) joinSocketRoom(res.data.code);
      ack?.(res);
    });

    socket.on('room:leave', () => {
      rooms.leave(socket.id);
      for (const r of socket.rooms) if (r !== socket.id) socket.leave(r);
    });

    socket.on('game:settings', async (settings, ack) => ack?.(await rooms.updateSettings(socket.id, settings)));
    socket.on('game:start', async (ack) => ack?.(await rooms.start(socket.id)));
    socket.on('game:answer', (data) => rooms.answer(socket.id, data?.questionIndex, data?.option));
    socket.on('game:playAgain', (ack) => ack?.(rooms.playAgain(socket.id)));

    socket.on('disconnect', () => rooms.leave(socket.id));
  });

  const close = async () => {
    rooms.dispose();
    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  };

  return { app, httpServer, io, rooms, close };
}
