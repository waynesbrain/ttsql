import { type Static, Maybe, Type } from "./schema";

const Id = Type.String();
export type Id = string;

export const Row = Type.Object({
  id: Id,
  name: Type.String(),
  created_at: Type.String({ format: "date-time" }),
  updated_at: Type.String({ format: "date-time" }),
  deleted_at: Maybe(Type.String({ format: "date-time" }), null),
  description: Maybe(Type.String(), null),
});
export interface Row extends Static<typeof Row> {}
export interface Table extends Required<Row> {}
