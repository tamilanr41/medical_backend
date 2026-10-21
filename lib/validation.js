import { z } from "zod";

/**
 * Entity-driven validation (§24). One Zod schema per entity is built from
 * config/entities.js and shared by the resource API; the same builder is
 * reused client-side by the form screens so both sides always agree.
 */

const schemaCache = new Map();

function fieldSchema(field, { mode }) {
  switch (field.type) {
    case "number":
    case "currency": {
      const numeric = z
        .union([z.number(), z.string()])
        .optional()
        .refine(
          (value) =>
            value === undefined ||
            value === null ||
            String(value).trim() === "" ||
            Number.isFinite(Number(value)),
          { message: `Enter a valid number for ${field.label}.` }
        );

      if (mode === "create" && field.required) {
        return numeric.refine(
          (value) =>
            !(value === undefined || value === null || String(value).trim() === ""),
          { message: `${field.label} is required.` }
        );
      }
      return numeric;
    }

    case "email": {
      const email = z
        .string()
        .trim()
        .email(`Enter a valid email for ${field.label}.`);
      return field.required && mode === "create"
        ? email.min(1, `${field.label} is required.`)
        : email.optional().or(z.literal(""));
    }

    case "password": {
      const password = z
        .string()
        .min(8, `${field.label} must be at least 8 characters.`);
      return mode === "create" && field.required
        ? password
        : password.optional().or(z.literal(""));
    }

    default: {
      const text = z.string().trim();
      return field.required && mode === "create"
        ? text.min(1, `${field.label} is required.`)
        : text.optional().or(z.literal(""));
    }
  }
}

/** Builds (and caches) the Zod object schema for an entity. */
export function buildSchema(entity, { mode = "create" } = {}) {
  const cacheKey = `${entity.label}:${mode}`;
  if (schemaCache.has(cacheKey)) return schemaCache.get(cacheKey);

  const shape = {};
  for (const field of entity.fields) {
    shape[field.name] = fieldSchema(field, { mode });
  }

  const schema = z.object(shape);
  schemaCache.set(cacheKey, schema);
  return schema;
}

/** Converts Zod issues into a flat `{ field: message }` map. */
export function issuesToFieldErrors(error) {
  const errors = {};
  for (const issue of error.issues ?? []) {
    const key = issue.path?.[0] ?? "_";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Parses a request body against the entity; returns data or field errors. */
export function parseBody(entity, body, { mode = "create" } = {}) {
  const result = buildSchema(entity, { mode }).safeParse(body ?? {});
  if (result.success) {
    return { values: normalizeValues(entity, result.data), errors: null };
  }
  return { values: null, errors: issuesToFieldErrors(result.error) };
}

/** Coerces numeric fields to JS numbers before they reach MongoDB. */
export function normalizeValues(entity, input) {
  const out = {};
  for (const field of entity.fields) {
    const value = input[field.name];
    if (value === undefined) continue;

    if (field.type === "number" || field.type === "currency") {
      if (value === "" || value === null) {
        out[field.name] = null;
      } else {
        const numeric = Number(value);
        out[field.name] = Number.isFinite(numeric) ? numeric : null;
      }
      continue;
    }

    out[field.name] = value;
  }
  return out;
}

/** Escapes user input for a safe RegExp search. */
export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Fields the default full-text search scans for a collection. */
export function searchFields(entity) {
  if (Array.isArray(entity.search) && entity.search.length > 0) {
    return entity.search;
  }
  return entity.fields
    .filter((field) => field.type === "text" || field.type === "email")
    .slice(0, 6)
    .map((field) => field.name);
}
