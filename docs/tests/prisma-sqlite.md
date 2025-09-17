# SQLite-backed Prisma Test Path (Optional)

This repo ships with a Postgres Prisma schema by default. For local, lightweight tests you can generate a SQLite Prisma client without changing the main schema.

## Generate SQLite Client

- Prereq: Node deps installed; Prisma CLI available via `npx prisma`.
- Run:

```
scripts/setup-sqlite-prisma.sh
```

This script:
- Builds a temporary SQLite variant of `prisma/schema.prisma` (datasource `sqlite` + `file:./dev.db`).
- Generates a client into `generated/prisma-sqlite-client/`.

## Run Template Service tests against SQLite

The test `src/test/api/template.service.prisma.test.ts` will automatically skip unless `E2E_PRISMA_SQLITE=1` and the generated client exists.

Run:

```
E2E_PRISMA_SQLITE=1 npm run test -- src/test/api/template.service.prisma.test.ts
```

Notes:
- The test mocks `@/lib/db/prisma` to use the SQLite PrismaClient.
- This path doesn’t alter your main Postgres schema or client.
- For full DB coverage, create migration SQL and seed as needed, then point `DATABASE_URL` to a disposable DB.

