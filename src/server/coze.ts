import { ENV } from '@/lib/env';
import { RoleMode } from '@prisma/client';

function buildHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${ENV.cozeToken}`,
    'Content-Type': 'application/json',
  };
}

export async function createCozeConversation(): Promise<string> {
  const response = await fetch(`${ENV.cozeBaseUrl}/v1/conversation/create`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ bot_id: ENV.cozeBotId }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[Coze Conversation API Failed]:', {
      endpoint: `${ENV.cozeBaseUrl}/v1/conversation/create`,
      status: response.status,
      statusText: response.statusText,
    });
    console.error('[Coze Conversation API Response Text]:', text);
    throw new Error(`Coze conversation create failed: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as { data?: { id?: string } };
  const conversationId = payload?.data?.id;

  if (!conversationId) {
    throw new Error('Coze conversation id missing in response payload');
  }

  return conversationId;
}

export async function requestCozeChatStream(args: {
  conversationId: string;
  userId: string;
  roleMode: RoleMode;
  message: string;
  signal?: AbortSignal;
}): Promise<Response> {
  const response = await fetch(
    `${ENV.cozeBaseUrl}/v3/chat?conversation_id=${encodeURIComponent(args.conversationId)}`,
    {
      method: 'POST',
      headers: buildHeaders(),
      signal: args.signal,
      body: JSON.stringify({
        bot_id: ENV.cozeBotId,
        user_id: args.userId,
        stream: true,
        custom_variables: {
          role_mode: args.roleMode,
        },
        additional_messages: [
          {
            role: 'user',
            content: args.message,
            content_type: 'text',
            type: 'question',
          },
        ],
      }),
    },
  );

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(`Coze stream request failed: ${response.status} ${text}`);
  }

  return response;
}

export async function runCozeEndChatWorkflow(args: {
  roleMode: RoleMode;
  chatHistory: string;
  userId: string;
}): Promise<unknown> {
  const parameters: { chat_history: string; user_id: string; role_mode: RoleMode } = {
    chat_history: args.chatHistory,
    user_id: args.userId,
    role_mode: args.roleMode,
  };

  console.log('[Coze Workflow Parameters]:', {
    keys: Object.keys(parameters),
    chat_history_length: parameters.chat_history.length,
    user_id: parameters.user_id,
    role_mode: parameters.role_mode,
  });

  const response = await fetch(`${ENV.cozeBaseUrl}/v1/workflow/run`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      workflow_id: ENV.cozeWorkflowId,
      bot_id: ENV.cozeBotId,
      parameters,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Coze workflow request failed: ${response.status} ${text}`);
  }

  return response.json();
}
