import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAppError, jsonError } from '@/lib/errors';
import { streamChatSchema } from '@/server/api-schemas';
import { requestCozeChatStream } from '@/server/coze';

const FRAME_SEPARATOR = '\n\n';
const MAX_FRAME_BUFFER_CHARS = 512 * 1024;
const MAX_ASSISTANT_CHARS = 200_000;

function toSsePayload(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function parseFrame(frame: string): { eventName: string; dataText: string } {
  const lines = frame.split(/\r?\n/);
  let eventName = '';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  return {
    eventName,
    dataText: dataLines.join('\n').trim(),
  };
}

function parseFollowUpItems(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const directContent = record.content;

  if (Array.isArray(directContent)) {
    return directContent.map((item) => String(item));
  }

  if (typeof directContent === 'string') {
    return [directContent];
  }

  const followUps = record.follow_up;
  if (Array.isArray(followUps)) {
    return followUps.map((item) => String(item));
  }

  return [];
}

export async function POST(request: NextRequest) {
  let sessionIdForError = '';

  try {
    const body = await request.json();
    const parsed = streamChatSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(createAppError('BAD_REQUEST', 'Invalid request payload', parsed.error.flatten()), 400);
    }

    const { sessionId, userId, roleMode, message } = parsed.data;
    sessionIdForError = sessionId;

    const session = await prisma.session.findUnique({ where: { id: sessionId } });

    if (!session) {
      return jsonError(createAppError('SESSION_NOT_FOUND', 'Session does not exist'), 404);
    }

    if (session.userId !== userId) {
      return jsonError(createAppError('INVALID_USER', 'Session does not belong to this user'), 403);
    }

    if (session.roleMode !== roleMode) {
      return jsonError(createAppError('INVALID_ROLE_MODE', 'Role mode mismatch'), 400);
    }

    if (session.status !== 'active') {
      return jsonError(createAppError('SESSION_ENDED', 'Session already ended. Please create a new session.'), 409);
    }

    // Requirement: persist user message immediately once validation passes.
    await prisma.message.create({
      data: {
        sessionId,
        role: 'user',
        content: message,
      },
    });

    const upstreamAbortController = new AbortController();
    const cozeResponse = await requestCozeChatStream({
      conversationId: session.cozeConversationId,
      userId,
      roleMode,
      message,
      signal: upstreamAbortController.signal,
    });

    const upstreamBody = cozeResponse.body;
    if (!upstreamBody) {
      return jsonError(createAppError('COZE_STREAM_PARSE_FAILED', 'Missing SSE body from Coze'), 502);
    }

    const encoder = new TextEncoder();
    let isClientCancelled = false;
    let stopUpstream = async () => {
      upstreamAbortController.abort();
    };

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const reader = upstreamBody.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const assistantChunks: string[] = [];
        let assistantChars = 0;
        let assistantPersisted = false;
        let completed = false;
        let terminalPushed = false;
        let streamClosed = false;
        let upstreamStopped = false;

        const closeStream = () => {
          if (streamClosed) {
            return;
          }

          streamClosed = true;
          try {
            controller.close();
          } catch {
            // no-op
          }
        };

        stopUpstream = async () => {
          if (upstreamStopped) {
            return;
          }

          upstreamStopped = true;
          upstreamAbortController.abort();

          try {
            await reader.cancel();
          } catch {
            // no-op
          }
        };

        const pushEvent = (payload: unknown) => {
          if (streamClosed || isClientCancelled) {
            return;
          }

          try {
            controller.enqueue(encoder.encode(toSsePayload(payload)));
          } catch {
            streamClosed = true;
          }
        };

        const pushError = (code: string, messageText: string) => {
          if (terminalPushed) {
            return;
          }

          terminalPushed = true;
          pushEvent({
            type: 'error',
            code,
            message: messageText,
          });
        };

        const persistAssistantMessage = async () => {
          if (assistantPersisted) {
            return;
          }

          assistantPersisted = true;
          if (assistantChars === 0) {
            return;
          }

          const content = assistantChunks.join('');
          assistantChunks.length = 0;
          assistantChars = 0;

          if (content.trim().length === 0) {
            return;
          }

          await prisma.message.create({
            data: {
              sessionId,
              role: 'assistant',
              content,
            },
          });
        };

        const processFrame = async (frame: string) => {
          if (!frame || terminalPushed || isClientCancelled) {
            return;
          }

          const { eventName, dataText } = parseFrame(frame);
          if (eventName === 'conversation.chat.completed' || dataText === '[DONE]') {
            completed = true;
            await persistAssistantMessage();

            if (!terminalPushed) {
              terminalPushed = true;
              pushEvent({ type: 'complete' });
            }

            await stopUpstream();
            return;
          }

          if (!dataText) {
            return;
          }

          let parsedPayload: unknown;
          try {
            parsedPayload = JSON.parse(dataText);
          } catch {
            return;
          }

          if (!parsedPayload || typeof parsedPayload !== 'object') {
            return;
          }

          const payload = parsedPayload as Record<string, unknown>;

          const role = payload.role;
          const type = payload.type;
          const content = payload.content;

          if (
            eventName === 'conversation.message.delta' &&
            role === 'assistant' &&
            type === 'answer' &&
            typeof content === 'string'
          ) {
            if (assistantChars + content.length > MAX_ASSISTANT_CHARS) {
              await persistAssistantMessage();
              pushError('COZE_STREAM_MESSAGE_TOO_LARGE', 'Assistant response exceeded safe memory limits');
              await stopUpstream();
              return;
            }

            assistantChunks.push(content);
            assistantChars += content.length;
            pushEvent({ type: 'delta', delta: content });
            return;
          }

          if (type === 'follow_up') {
            const items = parseFollowUpItems(payload);
            if (items.length > 0) {
              pushEvent({ type: 'follow_up', items });
            }
          }
        };

        const run = async () => {
          try {
            while (!isClientCancelled && !upstreamStopped) {
              const { value, done } = await reader.read();
              if (done) {
                break;
              }

              const decoded = decoder.decode(value, { stream: true });
              if (!decoded) {
                continue;
              }

              buffer += decoded.replace(/\r\n/g, '\n');

              if (buffer.length > MAX_FRAME_BUFFER_CHARS) {
                pushError('COZE_STREAM_BUFFER_OVERFLOW', 'Incoming stream frame exceeded safe buffer limits');
                await stopUpstream();
                break;
              }

              let separatorIndex = buffer.indexOf(FRAME_SEPARATOR);
              while (separatorIndex !== -1) {
                const frame = buffer.slice(0, separatorIndex);
                buffer = buffer.slice(separatorIndex + FRAME_SEPARATOR.length);
                await processFrame(frame);

                if (isClientCancelled || upstreamStopped || terminalPushed) {
                  break;
                }

                separatorIndex = buffer.indexOf(FRAME_SEPARATOR);
              }
            }

            const tail = decoder.decode();
            if (tail) {
              buffer += tail.replace(/\r\n/g, '\n');
            }

            if (!isClientCancelled && !upstreamStopped && buffer.trim().length > 0) {
              await processFrame(buffer);
            }

            if (!terminalPushed && !completed && !isClientCancelled) {
              pushError('COZE_STREAM_INTERRUPTED', 'Stream interrupted before completion');
            }
          } catch (error) {
            if (!isClientCancelled && !terminalPushed) {
              pushError('COZE_STREAM_PARSE_FAILED', 'Failed to parse stream payload');
              console.error('chat stream parse error', error);
            }
          } finally {
            buffer = '';
            assistantChunks.length = 0;
            await stopUpstream();
            closeStream();
          }
        };

        run().catch((error) => {
          if (!isClientCancelled && !terminalPushed) {
            pushError('COZE_STREAM_PARSE_FAILED', 'Unexpected stream failure');
            console.error('chat stream unexpected error', error);
          }
          closeStream();
        });
      },
      async cancel() {
        isClientCancelled = true;
        await stopUpstream();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('chat stream error', sessionIdForError, error);
    return jsonError(createAppError('COZE_REQUEST_FAILED', 'Failed to start stream', error), 500);
  }
}
