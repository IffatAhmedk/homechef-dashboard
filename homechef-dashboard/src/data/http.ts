import { mutate } from "swr";

export interface Result<T = Record<string, unknown>> {
  ok: boolean;
  data: T;
  /** A plain-words message from the server when something went wrong. */
  error?: string;
}

/** Sends JSON to the API and never throws: read `ok`, `data` and `error` from the result. */
export async function send<T = Record<string, unknown>>(url: string, method: string, body?: unknown): Promise<Result<T>> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, data, error: res.ok ? undefined : ((data as { error?: string }).error ?? "Something went wrong") };
}

/** Re-loads every cached request whose address starts with one of these. */
export function refresh(...prefixes: string[]) {
  return Promise.all(prefixes.map((p) => mutate((key) => typeof key === "string" && key.startsWith(p))));
}
