export async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {})
    },
    ...options
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = (isJson ? await res.json() : null) as T | null;

  if (!res.ok) {
    const errorBody = body as unknown as { error?: string; message?: string } | null;
    const message =
      errorBody?.error ??
      errorBody?.message ??
      `Request to ${path} failed with ${res.status}`;
    throw new Error(message);
  }

  return body as T;
}

