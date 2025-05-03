import {
  type Static,
  type TAnySchema,
  type TSchema,
  TypeGuard,
} from "@sinclair/typebox";
// Local
import { type Sql, type SqlDbRefs, type StaticIn, dbRefs } from "./types";

// Custom error for SQL operations
export class SqlError extends Error {
  command: Sql;
  constructor(error: any, command: Sql) {
    super(error + "", { cause: error });
    this.name = "SqlError";
    this.command = command;
  }
  toString() {
    const { query, values } = this.command;
    return (
      `${this.name}: ${this.message}\n` +
      `in ( ${query} )\n` +
      `of ${JSON.stringify(values)}\n` +
      this.stack
    );
  }
}

/** Similar to {@link D1Response} for now. */
export interface SqlResponse {
  success: true;
  meta: {
    changed_db: boolean;
    changes: number;
    last_row_id: number;
  } & Record<string, unknown>;
  error?: never;
}
/** Similar to {@link D1Result}. */
export interface SqlResult<T = unknown> extends SqlResponse {
  results: T[];
}

export abstract class SqlDatabase<DB, A = unknown> {
  /** Common table aliases. */
  readonly aliases: A | undefined;
  /** References for use in `sql`. */
  readonly refs: SqlDbRefs<DB, A>;
  /** TypeBox JSON schemas for database tables. */
  readonly schema: DB;

  constructor(schema: DB, aliases?: A, refs?: SqlDbRefs<DB, A>) {
    this.schema = schema;
    this.aliases = aliases;
    this.refs =
      refs ??
      (dbRefs(schema, aliases as Record<string, keyof DB>) as SqlDbRefs<DB, A>);
  }
  protected abstract first(cmd: Sql): Promise<Record<string, unknown> | null>;
  protected abstract run(cmd: Sql): Promise<SqlResult>;
  protected abstract runBatch(cmd: Sql[]): Promise<SqlResult[]>;

  /** Execute multiple commands with multiple results. */
  async batch(
    cmds:
      | Array<Sql | ((db: SqlDbRefs<DB, A>) => Sql)>
      | ((db: SqlDbRefs<DB, A>) => Sql[]),
  ): Promise<SqlResult[]> {
    const sqlCmds =
      typeof cmds === "function"
        ? cmds(this.refs)
        : cmds.map((cmd) => (typeof cmd === "function" ? cmd(this.refs) : cmd));
    return this.runBatch(sqlCmds);
    // TODO: Call parseResults here to transform each results[number].results.
  }
  /** Execute a command with no results. */
  async exec(cmd: Sql | ((db: SqlDbRefs<DB, A>) => Sql)): Promise<SqlResponse> {
    const sqlCmd = typeof cmd === "function" ? cmd(this.refs) : cmd;
    return this.run(sqlCmd);
  }
  // #region - get

  /** Execute a command and get results. */
  get<T>(cmd: Sql | ((db: SqlDbRefs<DB, A>) => Sql)): Promise<T[]>;
  get<T extends TSchema>(
    schema: T,
    cmd: Sql | ((db: SqlDbRefs<DB, A>) => Sql),
  ): Promise<Required<Static<T>>[]>;
  get<T extends keyof DB>(
    table: T,
    cmd: Sql | ((db: SqlDbRefs<DB, A>) => Sql),
  ): Promise<Required<StaticIn<DB, T>>[]>;
  async get(
    schemaOrTable: string | TSchema | Sql | ((db: SqlDbRefs<DB, A>) => Sql),
    cmd?: Sql | ((db: SqlDbRefs<DB, A>) => Sql),
  ): Promise<any> {
    const schema =
      typeof schemaOrTable === "string"
        ? (this.schema[schemaOrTable as keyof DB] as TSchema)
        : TypeGuard.IsSchema(schemaOrTable)
          ? schemaOrTable
          : undefined;
    const sqlCmd =
      typeof schemaOrTable === "string" || TypeGuard.IsSchema(schemaOrTable)
        ? typeof cmd === "function"
          ? cmd(this.refs)
          : cmd!
        : typeof schemaOrTable === "function"
          ? schemaOrTable(this.refs)
          : schemaOrTable;
    const { results } = await this.run(sqlCmd);
    return this.parseResults(results, schema);
  }
  // #endregion
  // #region - getOne

  /** Execute a command and get one result or a `null`. */
  async getOne<T>(
    cmd: Sql | ((db: SqlDbRefs<DB, A>) => Sql),
  ): Promise<T | null>;
  getOne<T extends TSchema>(
    schema: T,
    cmd: Sql | ((db: SqlDbRefs<DB, A>) => Sql),
  ): Promise<Required<Static<T>> | null>;
  getOne<T extends keyof DB>(
    table: T,
    cmd: Sql | ((db: SqlDbRefs<DB, A>) => Sql),
  ): Promise<Required<StaticIn<DB, T>> | null>;
  async getOne(
    schemaOrTable: string | TSchema | Sql | ((db: SqlDbRefs<DB, A>) => Sql),
    cmd?: Sql | ((db: SqlDbRefs<DB, A>) => Sql),
  ): Promise<any> {
    const schema =
      typeof schemaOrTable === "string"
        ? (this.schema[schemaOrTable as keyof DB] as TSchema)
        : TypeGuard.IsSchema(schemaOrTable)
          ? schemaOrTable
          : undefined;
    const sqlCmd =
      typeof schemaOrTable === "string" || TypeGuard.IsSchema(schemaOrTable)
        ? typeof cmd === "function"
          ? cmd(this.refs)
          : cmd!
        : typeof schemaOrTable === "function"
          ? schemaOrTable(this.refs)
          : schemaOrTable;
    const result = await this.first(sqlCmd);
    if (result !== null) {
      return this.parseResults([result], schema)[0];
    }
    return null;
  }
  // #endregion
  // #region - getOneOrThrow

  /** Execute a command and get one result or an exception. */
  async getOneOrThrow<T>(
    cmd: Sql | ((db: SqlDbRefs<DB, A>) => Sql),
  ): Promise<T>;
  getOneOrThrow<T extends TSchema>(
    schema: T,
    cmd: Sql | ((db: SqlDbRefs<DB, A>) => Sql),
  ): Promise<Required<Static<T>>>;
  getOneOrThrow<T extends keyof DB>(
    table: T,
    cmd: Sql | ((db: SqlDbRefs<DB, A>) => Sql),
  ): Promise<Required<StaticIn<DB, T>>>;
  async getOneOrThrow(
    schemaOrTable: string | TSchema | Sql | ((db: SqlDbRefs<DB, A>) => Sql),
    cmd?: Sql | ((db: SqlDbRefs<DB, A>) => Sql),
  ): Promise<any> {
    const schema =
      typeof schemaOrTable === "string"
        ? (this.schema[schemaOrTable as keyof DB] as TSchema)
        : TypeGuard.IsSchema(schemaOrTable)
          ? schemaOrTable
          : undefined;
    const sqlCmd =
      typeof schemaOrTable === "string" || TypeGuard.IsSchema(schemaOrTable)
        ? typeof cmd === "function"
          ? cmd(this.refs)
          : cmd!
        : typeof schemaOrTable === "function"
          ? schemaOrTable(this.refs)
          : schemaOrTable;
    const result = await this.first(sqlCmd);
    if (result === null) throw new Error(`First element not found in query.`);
    return this.parseResults([result], schema)[0];
  }
  // #endregion

  /** Given a table schema, parses JSON from results. */
  protected parseResults<T>(results: T[], schema?: TAnySchema): T[] {
    if (!schema || schema.type !== "object") return results;
    const parseKeys: string[] = [];
    const { properties } = schema;
    for (const key in properties) {
      const type =
        (properties[key] as TAnySchema).type ??
        (properties[key] as TAnySchema).anyOf?.[0]?.type;
      switch (type) {
        case "boolean":
        case "number":
        case "null":
        case "string":
          continue;
      }
      parseKeys.push(key);
    }
    if (parseKeys.length > 0) {
      for (const row of results) {
        for (const key of parseKeys) {
          (row as any)[key] = JSON.parse((row as any)[key]);
        }
      }
    }
    return results;
  }
}
