import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";
import { getConfig } from "../config.js";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: pg.Pool | null = null;

export function getDb() {
  if (!_db) {
    const config = getConfig();
    _pool = new pg.Pool({ connectionString: config.DATABASE_URL });
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

export type Db = ReturnType<typeof getDb>;
