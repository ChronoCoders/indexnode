import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

interface GraphQLError {
  message: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

/**
 * Server-side GraphQL fetch. Reads the incoming request's cookies via
 * next/headers and forwards them to the Rust backend so resolvers can pick
 * up the authenticated user from the HttpOnly auth_token cookie.
 *
 * `credentials: "include"` is a no-op outside a browser, so we set the
 * Cookie header explicitly.
 */
export async function serverGql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const res = await fetch(`${BACKEND_URL}/graphql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message);
  }
  if (json.data === undefined) {
    throw new Error("GraphQL response missing data field");
  }
  return json.data;
}

/**
 * Server-side REST fetch. Forwards cookies so the Rust backend can resolve
 * the authenticated user from the HttpOnly auth_token. Returns parsed JSON
 * for any 2xx response, or null for 401/404 so the page can render an empty
 * state. Throws on any other failure.
 */
export async function serverFetch<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}
