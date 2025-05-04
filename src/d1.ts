import type { D1Database, D1ExecResult } from "@cloudflare/workers-types";
// Local
import { sql } from "./builder";
import {
  type SqlDatabaseConfig,
  type SqlResult,
  SqlDatabase,
  SqlError,
} from "./db";
import type { Sql } from "./types";

export interface DatabaseD1Config<DB, A = unknown>
  extends SqlDatabaseConfig<DB, A> {
  binding: D1Database;
}

export class DatabaseD1<DB, A = unknown> extends SqlDatabase<DB, A> {
  protected db: D1Database;

  constructor(config: DatabaseD1Config<DB, A>) {
    super(config);
    const { binding: db } = config;
    this.db = db;
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
  /** Runs the given Sql command as required by the base class. */
  protected async run(cmd: Sql): Promise<SqlResult> {
    const { query, values } = cmd;
    let prepared = this.db.prepare(query);
    if (values.length > 0) {
      prepared = prepared.bind(...values);
    }
    try {
      const result = await prepared.run();
      return result;
    } catch (err: any) {
      throw new SqlError(err, cmd);
    }
  }

  protected async runBatch(cmds: Sql[]): Promise<SqlResult[]> {
    const db = this.db;
    const statements = cmds.map((cmd) => {
      const { query, values } = cmd;
      let prepared = db.prepare(query);
      if (values.length > 0) {
        prepared = prepared.bind(...values);
      }
      return prepared;
    });
    try {
      const result = await this.db.batch(statements);
      return result;
    } catch (err: any) {
      throw new SqlError(err, cmds[0]);
    }
  }
}
