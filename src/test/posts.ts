import { type Static, Maybe, StringEnum, Type } from "./schema";

const Id = Type.String();
export type Id = string;

export const Info = Type.Object({
  foo: Type.String(),
  bar: Type.Number(),
  baz: Type.Boolean(),
});

export const Row = Type.Object({
  id: Id,
  user_id: Type.String(),
  status: StringEnum(["draft", "published"]),
  title: Type.String(),
  body: Type.String(),
  created_at: Type.String({ format: "date-time" }),
  updated_at: Type.String({ format: "date-time" }),
  deleted_at: Maybe(Type.String({ format: "date-time" }), null),
  info: Maybe(Info, null),
});
export interface Row extends Static<typeof Row> {}
export interface Table extends Required<Row> {}
