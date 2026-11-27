# Quiz Live

Frågesport i realtid för 2–8 spelare. En person skapar ett rum, delar den fyrbokstaviga koden
(eller en länk) och alla svarar på samma fråga samtidigt. Snabbt rätt svar ger mest poäng,
flera rätt i rad ger bonus och de bästa resultaten sparas på en topplista.

Fullstack-projekt i TypeScript: **React** i webbläsaren, **Node.js + Express + Socket.io** på servern
och **Prisma + SQLite** som databas.

## Funktioner

- Skapa rum och gå med via kod eller inbjudningslänk (`/room/ABCD`)
- Lobby där spelare dyker upp i realtid; värden väljer kategori, antal frågor och tid per fråga
- Frågor med nedräkning; man ser hur många som har svarat, men inte vad
- Efter varje fråga: rätt svar, poäng för frågan och aktuell ställning
- Poäng: 500–1000 beroende på hur snabbt man svarar, plus 100–300 i bonus för rätt svar i rad
- Prispall och resultat, "Spela igen" för värden
- Topplista med de 20 bästa resultaten genom tiderna
- Värdskapet går vidare om värden lämnar; spelare som lämnar mitt i ett spel behåller sina poäng

## Arkitektur

```
quiz-live/
├── shared/   Gemensamma TypeScript-typer för alla Socket.io-händelser och API-svar
├── server/   Express + Socket.io + Prisma
│   ├── src/game.ts    Spelets regler som rena funktioner (inga timers, ingen nätverkskod)
│   ├── src/rooms.ts   Rumshantering och tidtagning
│   ├── src/app.ts     REST-API och Socket.io-händelser
│   ├── src/db.ts      Databasanrop via Prisma
│   └── prisma/        Databasschema och 48 frågor i fyra kategorier
└── client/   React + Vite
    ├── src/lib/GameContext.tsx   Anslutningen till servern, delad via React Context
    ├── src/pages/                Start, rum och topplista
    └── src/components/           Lobby, frågevy och resultat
```

**Servern bestämmer allt.** Klienterna skickar bara "jag vill gå med", "starta" och "jag svarar B".
Servern håller tiden, räknar poäng och skickar ut ett nytt tillstånd till alla i rummet efter varje
ändring. Rätt svar skickas aldrig till webbläsaren förrän frågan är slut, så det går inte att fuska
genom att titta i nätverkstrafiken. Svarsalternativen blandas dessutom om för varje spel.

**Typade händelser i båda ändar.** `shared/src/index.ts` beskriver varje Socket.io-händelse.
Både server och klient använder samma typer, så en felstavad händelse eller fel data blir ett
kompileringsfel i stället för en bugg i produktion.

**Testbar spellogik.** Reglerna i `game.ts` tar emot tiden som parameter i stället för att läsa
klockan själva, så testerna kan simulera exakt när varje svar kom in.

## Kom igång

Kräver Node.js 20 eller senare.

```bash
npm run setup   # installerar paket, skapar databasen och lägger in frågorna
npm run dev     # startar servern (port 3001) och klienten (port 5173)
```

Öppna http://localhost:5173 i två webbläsarfönster för att spela mot dig själv.

### Produktion

```bash
npm run build   # bygger React-appen
npm start       # servern levererar appen, API:t och WebSockets på samma port
```

## Tester

```bash
npm test        # alla tester (server + klient)
npm run typecheck
```

- **Spellogik** (`server/src/game.test.ts`): poängräkning, sviter, tidsgränser, värdbyte, att rätt svar inte läcker
- **Integration** (`server/src/app.test.ts`): startar den riktiga servern och spelar ett helt spel med två Socket.io-klienter
- **Komponenter** (`client/src/**/*.test.tsx`): lobbyn för värd och gäst, frågevyn före och efter svar, placeringar vid lika poäng

## Möjliga förbättringar

- Återanslutning: i dag lämnar man rummet om anslutningen bryts eller sidan laddas om
- Användarkonton med statistik per spelare
- PostgreSQL i produktion (byt `provider` i `schema.prisma`) och publicering på t.ex. Render eller Fly.io
- Uppgradera Prisma, Vite och Vitest till nästa huvudversion (`npm audit` varnar för äldre versioner av utvecklingsverktygen)
- Fler frågor och möjlighet för värden att skriva egna
