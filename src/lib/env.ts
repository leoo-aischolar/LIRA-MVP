type RequiredEnvKey =
  | 'DATABASE_URL'
  | 'COZE_API_BASE_URL'
  | 'COZE_API_TOKEN'
  | 'COZE_BOT_ID'
  | 'COZE_WORKFLOW_ID';

export function getEnv(key: RequiredEnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export function validateDatabaseUrlForServerless(): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }

  if (parsed.port !== '6543') {
    throw new Error('DATABASE_URL must use Supabase Transaction Pooler port 6543');
  }

  if (parsed.searchParams.get('pgbouncer') !== 'true') {
    throw new Error('DATABASE_URL must include pgbouncer=true');
  }

  if (parsed.searchParams.get('connection_limit') !== '1') {
    throw new Error('DATABASE_URL must include connection_limit=1');
  }
}

export const ENV = {
  cozeBaseUrl: getEnv('COZE_API_BASE_URL'),
  cozeToken: getEnv('COZE_API_TOKEN'),
  cozeBotId: getEnv('COZE_BOT_ID'),
  cozeWorkflowId: getEnv('COZE_WORKFLOW_ID'),
};
