# LIRA MVP

移动端优先的 3 天可演示 MVP，主链路：

`Chatmode -> Character -> Chat(Agent) -> End Chat(Workflow) -> Summary/Reflection/Structure -> Memory`

## 技术栈

- Next.js 15 + TypeScript + Tailwind
- Zustand（`userId` / `currentSessionId` / `selectedRoleMode`）
- Prisma + Supabase Postgres

## 关键约束已实现

- 使用 Supabase Transaction Pooler（6543）+ `pgbouncer=true&connection_limit=1`
- `/api/chat/stream`：
  - 参数校验通过后立即落库 user 消息
  - SSE 完成（`[DONE]` / `completed`）后才落库 assistant 完整消息
  - 异常中断仅保留 user，丢弃不完整 assistant
- `/api/chat/end` 幂等防重：
  - `end_chat_locks` 防重锁
  - `end_chat_results(session_id)` 唯一约束
  - 同一 session 并发只触发一次 workflow
- `sessions.status` 仅 `active | ended`
- `app/layout.tsx` 外层容器：`max-width: 480px; margin: 0 auto;` + 阴影
- 默认角色 seed：
  - Reflective_Guide：冷静的反思镜
  - Gentle_Companion：温暖的树洞
  - Custom_Character：你的专属伙伴

## 环境变量

复制 `.env.example` 到 `.env` 并填写：

- `DATABASE_URL`（Supabase pooler 6543，且带 `?pgbouncer=true&connection_limit=1`）
- `DIRECT_URL`（Supabase direct 5432，仅用于 migrate）
- `COZE_API_BASE_URL`
- `COZE_API_TOKEN`
- `COZE_BOT_ID`
- `COZE_WORKFLOW_ID`

## 本地启动

Node 版本要求：`>=20`（当前 Next 15 / Prisma 6 必需）。

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

## 主要 API

- `POST /api/chat/session`
- `POST /api/chat/stream`
- `POST /api/chat/end`
- `GET /api/chat/end-result?sessionId=...`
- `GET /api/memory?userId=...`
- `GET/POST /api/characters`

