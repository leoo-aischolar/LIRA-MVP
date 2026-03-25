export async function safeJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T;
  return data;
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      const errorMessage = (payload as { error?: { message?: string } })?.error?.message;
      if (errorMessage) {
        message = errorMessage;
      }
    } catch {
      // ignore json parse error for non-json payload
    }
    throw new Error(message);
  }
  return safeJson<T>(response);
}
