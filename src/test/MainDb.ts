import { type Sql, sql } from "../";
// Tables
import * as Users from "./users";
import * as Posts from "./posts";

/** Database table schemas. */
export const MainDb = {
  users: Users.Row,
  posts: Posts.Row,
};
/** References and aliases for the {@link MainDb} schema. */
const dbRef = sql.refs(MainDb, {
  u: "users",
  p: "posts",
});
// console.dir(dbRef, { depth: null });
export type MainDbRef = typeof dbRef;

/** Demonstration stub for a database class. */
export class MainDatabase {
  readonly ref = dbRef;

  exec(cmd: Sql | ((db: MainDbRef) => Sql)) {
    const result = typeof cmd === "function" ? cmd(dbRef) : cmd;
    // NOTE: Normally we'd execute the query here and return THOSE results...
    return result;
  }
}
export const db = new MainDatabase();
