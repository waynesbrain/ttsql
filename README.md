# ttsql

A composable, type-safe, schema-based SQL tagged-template query builder created
with TypeScript allowing you to do more with templates like this:

``sql`SELECT * FROM ${tbl} WHERE ${tbl.id} = ${id}`;``

## Status

- High quality, tested but still in `alpha`.
- Targets SQLite initially.
- No "dialects" system yet.
- Developed for SQLite on Cloudflare D1.

## Features

- **Tagged Template SQL Builder**: Provides a `sql` tagged template function for
  safe, composable, and parameterized SQL queries.
- **Type References**: Allows easy, autocompleted access to reference database
  table and field schemas.
- **Composable SQL Fragments**: Supports dynamic composition of SQL fragments.
- **Automatic Parameter Binding**: Automatically handles parameter binding and
  placeholder substitution (`?`) for safe, injection-resistant queries.
- **Nested and Dynamic Queries**: Allows embedding of SQL fragments and dynamic
  conditions (including handling of `null` as `IS NULL` in SQL).
- **Batch and Transaction Support**: Abstract base class supports batch
  execution and transactions for multiple queries.
- **Extensible Database Backends**: Designed for extension to different database
  backends (e.g., D1/Cloudflare, with `D1Database` implementation).
- **Schema-Driven Querying**: Leverages TypeBox JSON schemas for database
  structure, enabling static analysis and code completion.
- **Tested Usage Patterns**: Comprehensive tests demonstrate usage for SELECT,
  UPDATE, JOINs, nested fragments, and dynamic conditions, ensuring robust query
  construction.

## Quick start

```ts
import { type Sql, sql } from "ttsql";
// Given MyDb, a record of TypeBox/JSON Schemas describing our tables.
import { MyDb } from "./my/db";
// e.g.  MyDb = { posts: Type.Object({ ... }), users, ... };

/** Make .$ reference our tables/fields and build common table aliases. */
const myDbRef = sql.refs(MyDb, { p: "posts", u: "users" });
const db = new MainDatabase();

const id = "a2z";
const { query, values } = sql`SELECT * FROM "users" WHERE "id" = ${id}`;
console.log(query); // 'SELECT * FROM "users" WHERE "id" = ?'
console.log(values); // ["a2z"]

const { query, values } = db.get(({ $ }) => sql`SELECT * FROM ${$.posts}`);
console.log(query); // 'SELECT * FROM "posts"'
console.log(values); // ["a2z"]

const { query, values } = db.get(({ p }) => sql`SELECT * FROM ${$.p}`);
console.log(query); // 'SELECT * FROM "posts" as "p"'
console.log(values); // ["a2z"]

const { query, values } = db.get(
  ({ p }) => sql`UPDATE ${p} SET ${p.title.$} = ${title} WHERE ${p.id} = ${id}`,
);
console.log(query);
// 'UPDATE "posts" as "p" SET "title" = ? WHERE "p."."id" = ?'
console.log(values);
// ["a2z", "The new post title"]

// NOTE: **ABOVE**, that we have to end with $ when using a table alias in an
// UPDATE SET statement e.g. ${p.title.$} so alternatively we can do:

const { query, values } = db.get(
  ({ $, p }) =>
    sql`UPDATE ${p} SET ${$.posts.title} = ${title} WHERE ${p.id} = ${id}`,
);
// Same results as above...

// Some more examples of dynamic assignments...

sql`UPDATE ${p} SET ${sql.assign(
  [p.title, title],
  [p.body, body],
)} WHERE ${p.id} = ${id}`;

sql`UPDATE ${p} SET ${sql.assign({
  title,
  body,
})} WHERE ${p.id} = ${id}`;

sql`UPDATE ${p} SET ${sql.assign(
  { title },
  [p.body, body],
  // ... //
)} WHERE ${p.id} = ${id}`;

/** Database implementation to show how yours could work. */
class MainDatabase {
  get(cmd: Sql | ((db: MyDbRef) => Sql)) {
    const sqlCmd = typeof cmd === "function" ? cmd(myDbRef) : cmd;
    const { query, values } = sqlCmd;
    console.log("// CONSIDER: Run this...", query, values);
    return sqlCmd;
  }
  // TODO: Check out our SqlDatabase class implementing this already and more...
}
type MyDbRef = typeof myDbRef;
```

## Why though?

The amount of work done to satiate the type systems of classical object/type
based ORMs and query builders like [Drizzle](https://orm.drizzle.team/) and
[Kysely](https://kysely.dev) got annoying. Before that, when using Sequelize,
Knex or Objection the drawbacks of mainting their bulk outweighed the benefits,
particularly for such _advanced_ scenarios as dynamic queries... _(/s)_

Furthermore, I enjoy _using SQL_ and the benefits of **knowing SQL** more than
knowing anything about this year's _razzle-dazzle, type-mangling_ and overly
verbose query-builder.

Also, it's a difficult problem area which has
[been around for a while](https://blog.codinghorror.com/object-relational-mapping-is-the-vietnam-of-computer-science/)
and is not adequately solved by existing solutions IMO.

This attempt tries to use **types** and **schemas** generated from
[TypeBox](https://github.com/sinclairzx81/typebox?tab=readme-ov-file#example)
<small>(_dynamic JSON-schema/TS-type creator, useful to create OpenAPI schema as
well_ 🤔)</small> to inform table/field autocomplete lookups (`types`) and do
validation (`schemas`) for the `sql` tagged-template builder which embeds these
as references like this:

``sql`SELECT * FROM ${tbl} WHERE ${tbl.id} = ${id}`;``

## Roadmap

Things to keep in mind for expanding....

- Aggregation functions - Support for COUNT, SUM, etc.
- Subquery support - More complex nesting than what's shown in tests.
- Pagination utilities - LIMIT/OFFSET helpers.
- Batch operations - Using D1 binding batch or D1 API.

## Similar libraries

- [kysely sql](https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html)
  &nbsp;⇢&nbsp;[`npm`](http://npmjs.com/package/kysely)
- [sql-template-tag](https://github.com/blakeembrey/sql-template-tag)
  &nbsp;⇢&nbsp;[`npm`](https://www.npmjs.com/package/sql-template-tag)
- [squid](https://github.com/andywer/squid)
  &nbsp;⇢&nbsp;[`npm`](https://www.npmjs.com/package/squid)
- [cuery](https://github.com/Schniz/cuery)
  &nbsp;⇢&nbsp;[`npm`](https://www.npmjs.com/package/cuery)
- [sqltt](https://github.com/bitifet/sqltt)
  &nbsp;⇢&nbsp;[`npm`](https://www.npmjs.com/package/sqltt)

_...among many other smaller librareis_
