import { describe, expect, it } from "vitest";
// Local
import { type Sql, sql } from "../";
import { MainDb, db } from "./MainDb";

// NOTE: Many of the queries in here could be improved with better examples.

describe("Basic     ", () => {
  it("Statement with no parameters.", () => {
    const { query, values } = sql`SELECT * FROM "posts";`;
    console.log(query);
    expect(query).toEqual(`SELECT * FROM "posts";`);
    expect(values).toEqual([]);
  });
  it("Statement with parameters.", () => {
    const id = "1234";
    const status = "draft";
    const { query, values } =
      sql`SELECT * FROM "posts" WHERE "id" = ${id} AND "status" = ${status}`;
    console.log(query, " <- ", values);
    expect(query).toEqual(
      `SELECT * FROM "posts" WHERE "id" = ? AND "status" = ?`,
    );
    expect(values).toEqual([id, status]);
  });
  it("Conditional statements.", () => {
    const id = "1234";
    const status = "live";

    let whereSql: Sql | undefined =
      sql` WHERE "id" = ${id} AND "status" = ${status}`;

    const { query, values } = sql`SELECT * FROM "posts"${whereSql}`;
    console.log(query, " <- ", values);
    expect(query).toEqual(
      `SELECT * FROM "posts" WHERE "id" = ? AND "status" = ?`,
    );
    expect(values).toEqual([id, status]);

    whereSql = undefined;
    const { query: q2, values: v2 } = sql`SELECT * FROM "posts"${whereSql}`;
    console.log(q2, " <- ", v2);
    expect(q2).toEqual(`SELECT * FROM "posts"`);
    expect(v2).toEqual([]);
  });
});

describe("Referenced", () => {
  it("Statement with no parameters using table reference.", () => {
    const { query, values } = db.exec(({ $ }) => sql`SELECT * FROM ${$.posts}`);
    console.log(query, " <- ", values);
    expect(query).toEqual(`SELECT * FROM "posts"`);
    expect(values).toEqual([]);
  });
  it("Statement with table, field references + parameter.", () => {
    const id = "1234";
    const { query, values } = db.exec(
      ({ $ }) => sql`SELECT * FROM ${$.posts} WHERE ${$.posts.id} = ${id}`,
    );
    console.log(query, " <- ", values);
    expect(query).toEqual(`SELECT * FROM "posts" WHERE "id" = ?`);
    expect(values).toEqual([id]);
  });
  it("Statement with aliased table references and parameter.", () => {
    const id = "1234";
    const { query, values } = db.exec(
      ({ p }) => sql`SELECT * FROM ${p} WHERE ${p.id} = ${id}`,
    );
    console.log(query, " <- ", values);
    expect(query).toEqual(`SELECT * FROM "posts" as "p" WHERE "p"."id" = ?`);
    expect(values).toEqual([id]);
  });
  it("UPDATE with table, field references + parameter.", () => {
    const id = "1234";
    const title = "Hello, world!";
    const info = { foo: "Foo", bar: 10, baz: true };
    const { query, values } = db.exec(
      ({ p }) =>
        sql`UPDATE ${p} SET ${sql.assign(
          [p.title, title],
          [p.info, info],
        )} WHERE ${p.id} = ${id}`,
    );
    console.log(query, " <- ", values);
    expect(query).toEqual(
      `UPDATE "posts" as "p" SET "title" = ?, "info" = ?` +
        ` WHERE "p"."id" = ?`,
    );
    expect(values).toEqual([title, JSON.stringify(info), id]);

    const { query: q2, values: v2 } = db.exec(
      ({ p }) =>
        sql`UPDATE ${p} SET ${sql.assign({
          title,
          info,
        })} WHERE ${p.id} = ${id}`,
    );
    console.log(q2, " <- ", v2);
    expect(q2).toEqual(
      `UPDATE "posts" as "p" SET "title" = ?, "info" = ?` +
        ` WHERE "p"."id" = ?`,
    );
    expect(v2).toEqual([title, JSON.stringify(info), id]);
  });
});

describe("Nested    ", () => {
  it("Dynamic nested SQL fragments.", () => {
    const id = "1234";
    const where = sql`WHERE "id" = ${id}`;
    const { query, values } = sql`SELECT * FROM "table" ${where}`;
    console.log(query, " <- ", values);
    expect(query).toEqual(`SELECT * FROM "table" WHERE "id" = ?`);
    expect(values).toEqual([id]);
  });
  it("Dynamic AND condition object matches.", () => {
    const id = "1234";
    const name = "Bob";
    const matches = sql.matches({ id, name });
    const { query, values } = sql`SELECT * FROM "table" WHERE ${matches}`;
    console.log(query, " <- ", values);
    expect(query).toEqual(
      `SELECT * FROM "table" WHERE "id" = ? AND "name" = ?`,
    );
    expect(values).toEqual([id, name]);
  });
  it("Dynamic AND condition object matches with IS NULL.", () => {
    const id = "1234";
    const name = "Bob";
    const deleted_at = null;
    const matches = sql.matches({ id, name, deleted_at });
    const { query, values } = sql`SELECT * FROM "table" WHERE ${matches}`;
    console.log(query, " <- ", values);
    expect(query).toEqual(
      `SELECT * FROM "table" WHERE "id" = ? ` +
        `AND "name" = ? AND "deleted_at" IS NULL`,
    );
    expect(values).toEqual([id, name]);
  });
  it("Dynamic WHERE statement.", () => {
    const id = "1234";
    const name = "Bob";
    const where = sql.where({ id, name });
    const { query, values } = sql`SELECT * FROM "table" ${where}`;
    console.log(query, " <- ", values);
    expect(query).toEqual(
      `SELECT * FROM "table" WHERE "id" = ? AND "name" = ?`,
    );
    expect(values).toEqual([id, name]);
  });
  it("Dynamic JOIN condition matches.", () => {
    const id = "1234";
    const name = "Bob";
    const deleted_at = null;
    const matches = sql.matches({
      "t1.id": id,
      "t2.name": name,
      "t1.deleted_at": deleted_at,
    });
    const { query, values } =
      //
      sql`SELECT * FROM "t1" INNER JOIN "t2" ON ${matches}`;
    console.log(query, " <- ", values);
    expect(query).toEqual(
      `SELECT * FROM "t1" INNER JOIN "t2" ON "t1"."id" = ? ` +
        `AND "t2"."name" = ? AND "t1"."deleted_at" IS NULL`,
    );
    expect(values).toEqual([id, name]);
  });
  it("Dynamic JOIN condition matches with references.", () => {
    const title = "Hello, world!";
    // const deleted_at = null;
    const { t2 } = sql.refs(MainDb, { t2: "posts" });
    const matches = sql.matches({
      "t1.id": t2.id,
      "t2.title": title,
    });
    // TODO: Change matches or make new fn so we can do this:
    // const matches = sql.matches(
    //   [t1.site_id, t2.id],
    //   [t2.deleted_at, deleted_at],
    //   [t2.title, title],
    // );
    const { query, values } =
      //
      sql`SELECT * FROM "table" as "t1" INNER JOIN ${t2} ON ${matches}`;
    console.log(query, " <- ", values);
    expect(query).toEqual(
      `SELECT * FROM "table" as "t1" INNER JOIN "posts" as "t2" ON "t1"."id" = "t2"."id" AND "t2"."title" = ?`,
    );
    expect(values).toEqual([title]);
  });
});

describe("Advanced  ", () => {
  it("Convert value arrays to params.", () => {
    const id = "1234";
    const id2 = "5678";
    const { query, values } =
      sql`SELECT * FROM "table" WHERE "id" IN(${[id, id2]})`;
    console.log(query, " <- ", values);
    expect(query).toEqual(`SELECT * FROM "table" WHERE "id" IN(?, ?)`);
    expect(values).toEqual([id, id2]);
  });
  it("Convert reference arrays to field references.", () => {
    const id = "1234";
    const title = "Bob";
    const { query, values } = db.exec(
      ({ p }) =>
        sql`INSERT INTO ${p.$} (${[p.id.$, p.title.$]}) VALUES (${[id, title]})`,
    );
    console.log(query, " <- ", values);
    expect(query).toEqual(`INSERT INTO "posts" ("id", "title") VALUES (?, ?)`);
    expect(values).toEqual([id, title]);
  });
  it("Dynamic WHERE statement with SQL conditions array.", () => {
    const id = "1234";
    const name = "Bob";
    const where = sql.where(
      //
      sql`"id" = ${id}`,
      // sql`"name" IS NOT NULL`,
      {
        name,
      },
      sql`OR "name" LIKE ${name + "%"}`,
    );
    const { query, values } = sql`SELECT * FROM "table" ${where}`;
    console.log(query, " <- ", values);
    expect(query).toEqual(
      `SELECT * FROM "table" WHERE "id" = ? ` +
        // `AND "name" IS NOT NULL ` +
        `AND "name" = ? ` +
        `OR "name" LIKE ?`,
    );
    expect(values).toEqual([id, name, name + "%"]);
    // expect(values).toEqual([id, name]);
  });
  it("Concatenate SQL statements.", () => {
    const id = "1234";
    const name = "Bob";
    const where = sql.where({ id, name });
    const sq1 = sql`SELECT * FROM "table" ${where};`;

    const status = "live";
    const sq2 = sql`SELECT * FROM "posts" WHERE "id" = ${id} AND "status" = ${status};`;

    const { query, values } = sql.concat(sq1, sq2);

    console.log(query, " <- ", values);
    expect(query).toEqual(
      `SELECT * FROM "table" WHERE "id" = ? AND "name" = ?; ` +
        `SELECT * FROM "posts" WHERE "id" = ? AND "status" = ?;`,
    );
    expect(values).toEqual([id, name, id, status]);
  });
});
