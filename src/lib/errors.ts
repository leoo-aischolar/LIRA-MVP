export type AppError = {
  code: string;
  message: string;
  detail?: unknown;
};

export function createAppError(code: string, message: string, detail?: unknown): AppError {
  return { code, message, detail };
}

export function jsonError(error: AppError, status = 400): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
