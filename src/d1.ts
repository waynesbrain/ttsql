import type {
  D1Database,
  D1ExecResult,
  D1PreparedStatement,
} from "@cloudflare/workers-types";
// Local
import { sql } from "./builder";
import {
  type SqlDatabaseConfig,
  type SqlResult,
  SqlDatabase,
  SqlError,
} from "./db";
import type { Sql } from "./types";

/**
 * Cache compatible with `Map<string, D1PreparedStatement>` and
 * [quick-lru](https://www.npmjs.com/package/quick-lru),
 * for caching prepared statements by query.
 */
export interface DatabaseD1QueryCache {
  get(query: string): D1PreparedStatement | undefined;
  set(query: string, statement: D1PreparedStatement): any;
}
// CONSIDER: Add has(query: string):boolean; to DatabaseD1QueryCache if needed.

export interface DatabaseD1Config<DB, A = unknown>
  extends SqlDatabaseConfig<DB, A> {
  /** D1 Worker Database binding */
  binding: D1Database;
  /** Cache for re-using prepared statements. Use `quick-lru` on npm. */
  queryCache?: DatabaseD1QueryCache;
}

export class DatabaseD1<DB, A = unknown> extends SqlDatabase<DB, A> {
  protected db: D1Database;
  protected queryCache?: DatabaseD1QueryCache;

  constructor(config: DatabaseD1Config<DB, A>) {
    super(config);
    const { binding: db, queryCache } = config;
    this.db = db;
    this.queryCache = queryCache;
  }
  /**
   * Runs SQL with no parameters.
   * > Only use this method for maintenance and one-shot tasks e.g. migrations.
   * - https://developers.cloudflare.com/d1/worker-api/d1-database/#guidance-2
   */
  async bulk(rawSql: string): Promise<D1ExecResult> {
    try {
      const result = await this.db.exec(rawSql);
      return result;
    } catch (err: any) {
      throw new SqlError(err, sql([rawSql]));
    }
  }

  protected async first(cmd: Sql): Promise<Record<string, unknown> | null> {
    const { query, values } = cmd;
    let prepared = this.db.prepare(query);
    if (values.length > 0) {
      prepared = prepared.bind(...values);
    }
    try {
      const item = await prepared.first();
      return item;
    } catch (err: any) {
      throw new SqlError(err, cmd);
    }
  }

  #prepare(cmd: Sql) {
    const { query, values } = cmd;
    const { db, queryCache } = this;
    let prepared: D1PreparedStatement;
    if (!queryCache) {
      prepared = db.prepare(query);
    } else {
      prepared = queryCache.get(query);
      if (!prepared) {
        prepared = db.prepare(query);
      }
      queryCache.set(query, prepared);
    }
    if (values.length > 0) {
      prepared = prepared.bind(...values);
    }
    return { query, prepared, values };
  }

  /** Runs the given Sql command as required by the base class. */
  protected async run(cmd: Sql): Promise<SqlResult> {
    const { prepared } = this.#prepare(cmd);
    try {
      const result = await prepared.run();
      return result;
    } catch (err: any) {
      throw new SqlError(err, cmd);
    }
  }

  protected async runBatch(cmds: Sql[]): Promise<SqlResult[]> {
    const statements = cmds.map((cmd) => this.#prepare(cmd).prepared);
    try {
      const result = await this.db.batch(statements);
      return result;
    } catch (err: any) {
      throw new SqlError(err, cmds[0]);
    }
  }
}
