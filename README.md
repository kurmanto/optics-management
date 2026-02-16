# Mint Vision Optique — Staff Portal

Internal staff portal for Mint Vision Optique. Replaces paper order cards, Google Sheets, and a legacy PMS.

**Stack:** Next.js 15 · PostgreSQL (Supabase) · Prisma 7 · Tailwind · shadcn/ui

---

## Quick Start

```bash
# Requires Node 22.12+
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

npm install
cp .env.example .env   # fill in Supabase credentials + SESSION_SECRET

npm run db:generate
npm run db:push
npm run db:seed        # creates admin@mintvisionsoptique.com / changeme123

npm run dev
```

See [`docs/setup_guide.md`](docs/setup_guide.md) for full instructions.

---

## Documentation

| Doc | Description |
|-----|-------------|
| [`docs/PRD.md`](docs/PRD.md) | Product requirements and feature roadmap |
| [`docs/architecture.md`](docs/architecture.md) | Technical architecture and data flow |
| [`docs/setup_guide.md`](docs/setup_guide.md) | Setup, environment, and migration guide |
| [`docs/reference_docs.md`](docs/reference_docs.md) | Developer reference (patterns, conventions, enums) |
| [`docs/project_status.md`](docs/project_status.md) | Current feature status and known issues |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Version history |
| [`CLAUDE.md`](CLAUDE.md) | AI assistant context (architecture rules, conventions) |
