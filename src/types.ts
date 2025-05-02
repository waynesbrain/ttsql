import type { Static, TSchema, TObject } from "@sinclair/typebox";

// #region - TypeBox

/** Returns `Static<T[K]> if `T[K]` is a `TSchema`, else `unknown`. */
export type StaticIn<T, K extends keyof T> = T[K] extends TSchema
  ? Static<T[K]>
  : unknown;
// #endregion
// #region - Core types: SqlRef, SqlRefType

/** Types of entities that can be referenced and composed via {@link SqlRef}. */
export type SqlRefType = "db" | "field" | "table" | "sql";

/** Symbol used to access referenced metadata. */
export const SqlRef: unique symbol = Symbol("SqlRef");

/** Reference to a given {@link SqlRefType}. */
export interface SqlRef<T extends SqlRefType = SqlRefType> {
  /** Name of the `db|field|table|sql`. */
  name: string;
  /** One of `db|table|field`. See {@link SqlRefType}. */
  type: T;
  /** Code prefix for this reference e.g. `"my_table".` for a `field` ref. */
  prefix?: string;
  /** Code suffix for this reference e.g. ` as "mt"` for a `table` ref. */
  suffix?: string;
}
// #endregion
// #region - Object types: Db, Field, Table

/** Reference to a database, tables and fields. */
export type SqlDbRef<DB> = {
  /** Table reference. */
  [TBL in keyof DB]: DB[TBL] extends TObject
    ? SqlTableRef<Required<Static<DB[TBL]>>>
    : never;
};
/*** References to a database, tables and fields with optional table aliases. */
export type SqlDbRefs<DB, A = unknown> = {
  /** Full database reference. */
  $: SqlDbRef<DB>;
} & (A extends Record<string, keyof DB>
  ? {
      /** Aliased table reference. */
      [K in keyof A]: SqlDbRef<DB>[A[K]];
    }
  : never);

/** Reference to a field. */
export type SqlFieldRef = {
  [SqlRef]: SqlRef<"field">;
  /** A full reference to the field, without aliased table prefix. */
  $?: SqlRef<"field">;
};

/** Reference to a table. */
export type SqlTableRef<Table> = {
  /** Field reference. */
  [FLD in keyof Table]-?: SqlFieldRef;
} & {
  [SqlRef]: SqlRef<"table">;
  /** A full reference to the table, without alias. */
  $?: SqlRef<"field">;
};
// #endregion
// #region - Query types: Sql, SqlBuilder

/** Query and binding values created from {@link sql}. */
export interface Sql {
  [SqlRef]: SqlRef<"sql">;
  /** SQL with `?` binding placeholders. */
  query: string;
  /** Binding values. */
  values: any[];
}
/**  SQL tagged-template query builder and adjunct function namespace. */
export interface SqlBuilder {
  (sources: ReadonlyArray<string>, ...params: unknown[]): Sql;
  /**
   * Renders field assignments for an `UPDATE SET` clause.
   *
   * @example
   * sql`UPDATE ${dbs} SET ${sql.assign(
   *   [dbs.name, name],
   *   [dbs.info, info],
   * )} WHERE ${dbs.id} = ${id}`;
   * @example
   * sql`UPDATE ${dbs} SET ${sql.assign({
   *   name,
   *   info,
   * })} WHERE ${dbs.id} = ${id}`;
   * @example
   * sql`UPDATE ${dbs} SET ${sql.assign(
   * [dbs.name, name],
   * { info },
   * )} WHERE ${dbs.id} = ${id}`;
   */
  assign(...entries: SetEntry[]): Sql;
  /** Joines multiple {@link sql} statements with a space. */
  concat(...items: Sql[]): Sql;
  /** Renders a set of dynamic {@link sql} conditions. */
  matches(...entries: SetEntry[]): Sql | undefined;
  /** Creates a tree of rerences for using the DB schema with {@link sql}. */
  refs<DB, A extends Record<string, keyof DB>>(
    schema: DB,
    aliases?: A,
  ): SqlDbRefs<DB, A>;
  /** Trims the leading and trailing whitespace from the given SQL query */
  trim(sql: Sql): Sql;
  /** Renders an optional WHERE statement based on the given conditions. */
  where(...entries: SetEntry[]): Sql | undefined;
}

// CONSIDER: Expose the following types? Rename them?

type SetPair = [string | SqlRef, any];
type SetObject = Record<string, any>;
type SetEntry = Sql | SetPair | SetObject;

// #endregion

// #region - Reference builders

/** Creates a reference to a database schema. */
export function dbRef<DB>(schema: DB): SqlDbRef<DB> {
  const node = {} as SqlDbRef<DB>;
  for (const name in schema) {
    (node as any)[name] = tableRef(schema[name] as TObject, name);
  }
  return node;
}
/***
 * Creates references to a database, tables and fields with optional table
 * aliases.
 */
export function dbRefs<DB, A extends Record<string, keyof DB>>(
  schema: DB,
  aliases?: A,
): SqlDbRefs<DB, A> {
  const db = dbRef(schema);
  /** Reference to {@link db} and aliases within `db` created here. */
  const refs = {
    $: db,
  } as any;
  if (aliases) {
    for (const alias in aliases) {
      // For just TypeScript aliases do aliased[alias] = db[aliases[alias]];
      // But we want the alias to be used in the resulting SQL. Therefore, if
      // you use a field from `aliased` here, you get `"table"."field"` SQL.
      // To do that we add a prefix to all of our field refs here...
      const via = db[aliases[alias]];
      const aliasTarget: Record<string, any> = {
        [SqlRef]: {
          ...via[SqlRef],
          suffix: ` as "${alias}"`,
        },
      };
      // Clone each property of via and modify its SqlRef property
      for (const prop in via) {
        const original = via[prop];
        if (original && typeof original === "object" && SqlRef in original) {
          // Create a clone with modified SqlRef property
          const originalRef = original[SqlRef] as SqlRef;
          aliasTarget[prop] = {
            ...original,
            // Modify field refs to use a prefix of the table alias by default.
            [SqlRef]: {
              ...originalRef,
              prefix: `"${alias}".`,
            },
            // Users can short-cut to the full $ ref for update set fields.
            $: original,
          };
        } else {
          // For non-SqlRef properties, just copy them
          aliasTarget[prop] = original;
        }
      }
      // Users can short-cut to the full $ ref for INSERT INTO tables.
      aliasTarget.$ = via;
      refs[alias] = aliasTarget;
    }
  }
  return refs;
}
/** Creates a reference to a field. */
export function fieldRef(name: string): SqlFieldRef {
  return { [SqlRef]: { name, type: "field" } };
}
/** Creates a reference to a table. */
export function tableRef<Table = unknown>(
  schema: TObject,
  name: string,
): SqlTableRef<Table> {
  const node = {} as SqlTableRef<Table>;
  for (const name in schema.properties) {
    (node as any)[name] = fieldRef(name);
  }
  node[SqlRef] = { name, type: "table" };
  return node;
}
// #endregion
// #region - Type predicates

export function isSql(value: unknown): value is Sql {
  if (value && typeof value === "object" && SqlRef in value) {
    return (value[SqlRef] as SqlRef)?.type === "sql";
  }
  return false;
}

export function isSqlRef(value: unknown): value is { [SqlRef]: SqlRef } {
  if (value && typeof value === "object" && SqlRef in value) {
    return true;
  }
  return false;
}
// #endregion
