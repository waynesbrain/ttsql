import type {
  Ensure,
  SchemaOptions,
  Static,
  TAnySchema,
  TArray,
  TObject,
  TOptional,
  TSchema,
  TUnion,
} from "@sinclair/typebox";
import { Kind, Type, TypeRegistry } from "@sinclair/typebox";

export type { Static, TAnySchema, TArray, TObject, TSchema, TUnion };
export { Type };

/** Return type of {@link Type.Optional}. */
type TAddOptional<T extends TSchema> =
  T extends TOptional<infer S> ? TOptional<S> : Ensure<TOptional<T>>;

/** Creates an optional property, e.g. `prop?: string;` */
export function Maybe<T extends TSchema>(schema: T): TAddOptional<T>;
/** Creates an optional, `null`able property, e.g. `prop?: string | null;` */
export function Maybe<T extends TSchema>(
  schema: T,
  nullable: null,
): TAddOptional<ReturnType<typeof Nullable<T>>>;
export function Maybe<T extends TSchema>(schema: T, nullable?: null) {
  if (nullable !== null) {
    return Type.Optional(schema);
  }
  return Type.Optional(Nullable(schema));
}
/** Creates a nullable property, e.g. `prop: T | null;` */
export function Nullable<T extends TSchema>(schema: T) {
  return Type.Union([schema, Type.Null()]);
}
/** Returns `Static<T[K]> if `T[K]` is a `TSchema`, else `unknown`. */
export type StaticIn<T, K extends keyof T> = T[K] extends TSchema
  ? Static<T[K]>
  : unknown;
/**
 * Allows creation of string enum, see
 * https://github.com/sinclairzx81/typebox#unsafe-types
 * and
 * https://github.com/sinclairzx81/typebox/issues/563
 * @example
 * const S = StringEnum(['A', 'B', 'C'])
 * // const S = { enum: ['A', 'B', 'C'] }
 * type S = Static<typeof T>
 * // type S = 'A' | 'B' | 'C'
 */
export function StringEnum<T extends string[]>(
  values: [...T] | ReadonlyArray<T[number]>,
  options?: SchemaOptions,
) {
  return Type.Unsafe<T[number]>({
    [Kind]: "StringEnum",
    type: "string",
    enum: values,
    ...options,
  });
}
TypeRegistry.Set("StringEnum", (schema: any, value) =>
  schema.enum.includes(value),
);
