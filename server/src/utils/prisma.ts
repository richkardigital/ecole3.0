import { PrismaClient } from "@prisma/client";

const rawUrl = process.env.DATABASE_URL;
let url = rawUrl;

if (rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const isPooler = parsed.hostname.includes("pooler") || parsed.port === "6543";
    const hasPgbouncer = parsed.searchParams.get("pgbouncer") === "true";

    if (isPooler && !hasPgbouncer) {
      parsed.searchParams.set("pgbouncer", "true");
    }
    if (isPooler && !parsed.searchParams.get("connection_limit")) {
      parsed.searchParams.set("connection_limit", "1");
    }
    if (isPooler && !parsed.searchParams.get("statement_cache_size")) {
      parsed.searchParams.set("statement_cache_size", "0");
    }

    url = parsed.toString();
  } catch {
    url = rawUrl;
  }
}

const prisma = new PrismaClient(
  url
    ? {
        datasources: {
          db: { url },
        },
      }
    : undefined
);

export default prisma;
