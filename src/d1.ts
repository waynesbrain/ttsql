import type { D1Database } from "@cloudflare/workers-types";
// Local
import { type SqlResult, SqlDatabase } from "./db";
import type { Sql } from "./types";

export class DatabaseD1<DB, A = unknown> extends SqlDatabase<DB, A> {
  protected db: D1Database;

  constructor(db: D1Database, schema: DB, aliases?: A) {
    super(schema, aliases);
    this.db = db;
  }
  /**
   * Runs SQL with no parameters.
   * > Only use this method for maintenance and one-shot tasks e.g. migrations.
   * - https://developers.cloudflare.com/d1/worker-api/d1-database/#guidance-2
   */
  async bulk(sql: string): Promise<void> {
    await this.db.exec(sql);
  }

  protected async first(cmd: Sql): Promise<Record<string, unknown> | null> {
    const { query, values } = cmd;
    let prepared = this.db.prepare(query);
    if (values.length > 0) {
      prepared = prepared.bind(...values);
    }
    return prepared.first();
  }
  /** Runs the given Sql command as required by the base class. */
  protected async run(cmd: Sql): Promise<SqlResult> {
    const { query, values } = cmd;
    let prepared = this.db.prepare(query);
    if (values.length > 0) {
      prepared = prepared.bind(...values);
    }
    return prepared.run();
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
    return this.db.batch(statements);
  }
}
