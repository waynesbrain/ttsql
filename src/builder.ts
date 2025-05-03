import {
  type Sql,
  type SqlBuilder,
  SqlRef,
  dbRefs,
  isSql,
  isSqlRef,
} from "./types";

/** The variable place-holder for SQLite parameterized queries. */
const VAR = "?";
// TODO: Make a dialect type so we can have options for the VAR character, etc.

/**
 * SQL tagged-template query builder.
 *
 * ## REQUIREMENT: We MUST coalesce to "" when reading `sources` elements.
 *
 * This avoids a whole class of bugs related to improper framing of manual calls
 * to `sql()` e.g. `sql(codes, ...values)`.
 */
function buildSql(sources: ReadonlyArray<string>, ...params: unknown[]): Sql {
  let { length } = params;
  /** Copy of sources that we can modify if necessary. */
  const srcs = [...sources];
  /** SQL source code segments pre-allocated with estimated capacity. */
  const codes: string[] = new Array(length + 1);
  /** Binding values pre-allocated with capacity for nested templates. */
  const values: any[] = new Array(Math.ceil(length * 1.5));
  let countCodes = 1;
  let countVals = 0;
  // REQUIREMENT: MUST `?? ""` when pulling srcs, see function comments.
  codes[0] = srcs[0] ?? "";
  for (let i = 0; i < length; i++) {
    let param = params[i];
    // Expand this param?
    if (Array.isArray(param) && param.length > 0) {
      // Expand this param array so that it produces a comma-separated list.
      //
      // We must expand `param` by adding each of it's elements to `params` in
      // such a way that this loop encounters the first element of the `param`
      // array next. We update length then add one element to `srcs` for
      // each expanded param element consisting of ", " so that when the loop
      // ends the params will be rendered to a comma delimited list.
      //
      // Add the first element at the current position (replacing the array).
      params[i] = param[0];
      if (param.length > 1) {
        // Insert the rest of the elements after the current position.
        params.splice(
          i + 1,
          0,
          // Map undefined array elements to null. No conditional SQL in lists.
          ...param.slice(1).map((it) => (it === undefined ? null : it)),
        );
        // Update the length to account for the newly added elements
        length += param.length - 1;
        // Add comma separators to the codes array for each additional element
        const commas: string[] = new Array(param.length - 1);
        for (let j = 0; j < param.length - 1; j++) {
          commas[j] = ", ";
        }
        srcs.splice(i + 1, 0, ...commas);
      }
      // Continue below using the expanded first element...
      param = params[i];
    }
    // Use this param as code?
    if (param && typeof param === "object" && SqlRef in param) {
      const ref = param[SqlRef] as SqlRef;
      const pre = ref.prefix ?? "";
      const suf = ref.suffix ?? "";
      let code = "";
      if (ref.type === "sql") {
        const sqlResult = param as Sql;
        // Add rendered query to our code.
        code = pre + sqlResult.query + suf;
        // Add template result values to our values.
        for (let j = 0; j < sqlResult.values.length; j++) {
          values[countVals++] = sqlResult.values[j];
        }
      } else {
        // Ref type "db|field|table"
        code = pre + `"${ref.name}"` + suf;
      }
      // Directly append our code and the next code to the previous code string.
      // (Since we've skipped a param, we must pull the next source in.)
      codes[countCodes - 1] += code + (srcs[i + 1] ?? "");
    } else if (param === undefined) {
      // Throw away undefined params so we can simply support conditional SQL.

      // CONSIDER: In the future if we want to allow undefined value-params,
      // we can add a unique symbol or ref to mean "no-op".

      // Directly append the next code to the previous code string.
      // (Since we've skipped a param, we must pull the next source in.)
      codes[countCodes - 1] += srcs[i + 1] ?? "";
    } else {
      // Param is not code. Add value and push the next source.

      values[countVals++] = parseParam(param);
      // Push the next source code.
      codes[countCodes++] = srcs[i + 1] ?? "";
    }
  }
  codes.length = countCodes;
  values.length = countVals;
  /** All source codes, joined with binding placeholders (`?`). */
  const query = codes.join(VAR);
  return {
    [SqlRef]: { name: "sql", type: "sql" },
    query,
    values,
  };
}
export const sql = buildSql as SqlBuilder;
sql.refs = dbRefs;

function parseParam(param: unknown) {
  const ptype = typeof param;
  switch (ptype) {
    case "bigint":
    case "boolean":
    case "string":
    case "number":
      return param;
  }
  if (!param) {
    // The param is null, undefined or something else we don't handle here.
    // So, we always cast to null here. Callers can pre-check for undefined
    // values and decide to do something different outside this function.
    return null;
  }
  if (param instanceof Date) {
    return param.toISOString();
  }
  // NOTE: JSON.stringify returns `undefined` for some types, so coalesce to
  // null here in those cases e.g. JSON.stringify(Symbol("Yada"));
  return JSON.stringify(param) ?? null;
}

sql.concat = function sqlConcat(...items) {
  const codes: string[] = new Array(items.length);
  const values: any[] = [];
  let i = 0;
  for (const item of items) {
    codes[i++] = item.query;
    values.push(...item.values);
  }
  return {
    [SqlRef]: { name: "sql", type: "sql" },
    query: codes.join(" "),
    values,
  };
};

sql.matches = function sqlMatches(...entries) {
  if (entries.length === 0) {
    return undefined;
  }
  const codes: string[] = [];
  const values: any[] = [];
  let i = 0;
  // NOTE: This loop is almost the same exact loop as in sql.assign.
  for (const entry of entries) {
    if (isSql(entry)) {
      // hasSql = true;
      if (i > 0) {
        const query = entry.query.trim();
        if (!(query.startsWith("OR ") || query.startsWith("AND "))) {
          codes.push(" AND ");
        } else {
          codes.push(" ");
        }
      } else {
        codes.push("");
      }
      // Add the SQL entry as a value to be processed by buildSql
      values.push(entry);
      i += 1;
    } else if (Array.isArray(entry)) {
      // Process tuple same as we would a single key in an object entry.
      let code = i > 0 ? " AND " : "";
      const key = entry[0];
      // Coerce undefined to null value.
      const value = entry[1] ?? null;
      let name = key;
      if (isSqlRef(key)) {
        const ref = key[SqlRef];
        name = (ref.prefix ?? "") + ref.name + (ref.suffix ?? "");
      } else if (key.includes(".")) {
        // TODO: Escape characters in identifier name...
        name = key.replaceAll(".", '"."');
      }
      if (value === null) {
        code += `"${name}" IS NULL`;
      } else {
        code += `"${name}" = `;
        values.push(value);
      }
      codes.push(code);
      i += 1;
    } else {
      // Process object.
      for (const key in entry) {
        let code = i > 0 ? " AND " : "";
        // Coerce undefined to null value.
        const value = entry[key] ?? null;
        const name = key.includes(".") ? key.replaceAll(".", '"."') : key;
        // TODO: Escape characters in identifier name...
        if (value === null) {
          code += `"${name}" IS NULL`;
        } else {
          code += `"${name}" = `;
          values.push(value);
        }
        codes.push(code);
        i += 1;
      }
    }
  }
  return sql(codes, ...values);
};

sql.assign = function sqlAssign(...entries) {
  const codes: string[] = [];
  const values: any[] = [];
  let i = 0;
  // NOTE: This loop is almost the same exact loop as in sql.matches.
  for (const entry of entries) {
    if (isSql(entry)) {
      if (i > 0) codes.push(", ");
      values.push(entry);
      i += 1;
    } else if (Array.isArray(entry)) {
      // Process tuple same as we would a single key in an object entry.
      let code = i > 0 ? ", " : "";
      const key = entry[0];
      // Coerce undefined to null value.
      const value = entry[1] ?? null;
      const name = isSqlRef(key) ? key[SqlRef].name : (key as string);
      // TODO: Escape characters in identifier name...
      if (value === null) {
        code += `"${name}" IS NULL`;
      } else {
        code += `"${name}" = `;
        values.push(value);
      }
      codes.push(code);
      i += 1;
    } else {
      // Process object.
      for (const key in entry) {
        let code = i > 0 ? ", " : "";
        // Coerce undefined to null value.
        const value = entry[key] ?? null;
        const name = key;
        // TODO: Escape characters in identifier name...
        if (value === null) {
          code += `"${name}" IS NULL`;
        } else {
          code += `"${name}" = `;
          values.push(value);
        }
        codes.push(code);
        i += 1;
      }
    }
  }
  return sql(codes, ...values);
};

sql.trim = function sqlTrim(sql) {
  return {
    [SqlRef]: sql[SqlRef],
    query: sql.query.trim(),
    values: sql.values,
  };
};

sql.where = function sqlWhere(...matches) {
  const result = sql.matches(...matches);
  if (result) {
    result.query = `WHERE ${result.query}`;
  }
  return result;
};
