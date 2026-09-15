# efoot-backend (cutover-ready, traffic disabled)

Separate Node.js + Fastify process. Production traffic stays on Next.js `app/api` until cutover.
`dormant` describes traffic state, not implementation completeness.

Default mode is **dormant**:

- no production traffic
- no DNS / Vercel / main cutover
- no writes, no real credit deductions, no cron
- MetalGate identity and wallet are `NOT IMPLEMENTED` (deferred to Tommaso)
- removed product APIs, including Live Coach / Realtime, are not exposed

```bash
cd backend
npm install
npm test
npm run dev
```

Listens on `127.0.0.1:4050`. Do not point the frontend here.

- `GET /health` `/ready` `/version` `/inventory` `/handoff/metalgate`
- Only routes called by the current UX have concrete Fastify handlers
- Removed/unused APIs (Live Coach, Tasks, Starter Pack, Card Advisor evaluate/unlock, transaction history, repair endpoints) are intentionally not exposed
- Dormant mode blocks writes, AI and costs
- Only deferred MetalGate capabilities return explicit HTTP 501 placeholders
- `src/inventory.js` audits every current `app/api` file and marks unused routes `legacy-do-not-migrate`
- Real Fastify paths and methods: `types/routes.ts`
- Types for Tommaso: `types/database.ts`, `types/routes.ts`, `types/notifications.ts`, `types/metalgate.ts`

Hero, Contromisure and Palestra Coach were extracted after their data foundations.
