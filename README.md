# Revipe

Open-source industrial application platform.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **API**: tRPC 11
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS 4
- **Auth**: WorkOS AuthKit (optional)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or Docker)

### Setup

1. Clone and install:
   ```bash
   git clone git@github.com:revipe/revipe.git
   cd revipe
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL
   ```

3. Start database (Docker):
   ```bash
   ./start-database.sh
   ```

4. Push schema to database:
   ```bash
   npm run db:push
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:push` | Push schema to database (dev) |
| `npm run db:generate` | Generate migration files |
| `npm run db:migrate` | Run migrations |
| `npm run db:studio` | Open Drizzle Studio GUI |

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
├── server/
│   ├── api/            # tRPC routers
│   └── db/             # Drizzle schema & connection
└── lib/                # Utilities
```

## License

See LICENSE.txt
