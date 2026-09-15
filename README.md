# Punjab King — Frontend

This repo contains only the **frontend** (`apps/web`) of the PB Exchange project, split out from the main monorepo. It also includes `packages/types` since the frontend depends on it for shared TypeScript type definitions — no backend code is included.

## Setup

```bash
npm install
npm run dev      # start the Vite dev server
npm run build    # production build (outputs to apps/web/dist)
```

The dev server proxies `/api` requests to `http://localhost:4000` (see `apps/web/vite.config.ts`) — run the backend separately for local API calls to work.
