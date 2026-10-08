# Backrooms Event & Intrusive Memory System

This project contains a static front-end and a Node.js + Express API for Roblox Studio integration.

## Front-end

The UI in `index.html` is a static dashboard hosted on GitHub Pages. It is not the backend and will not run server-side logic.

Configure the backend URL before using it in production:

```js
window.BACKEND_URL = 'https://backtotheyellow.onrender.com';
```

The dashboard uses this HTTPS backend URL and keeps its interface available if the backend is temporarily unreachable.

## Backend

### Start locally

```bash
npm install
npm start
```

The API listens on port `3000` by default.

### Optional API key for protected writes

```bash
$env:API_KEY="your-secret-key"
npm start
```

Then send the header:

```http
X-API-Key: your-secret-key
```

## API endpoints

- `GET /api/health` — confirm the backend is up.
- `GET /api/status` — system status, uptime, request count, settings and recent logs.
- `GET /api/memories` — list enabled memories.
- `GET /api/memories?all=1` — list all memories including disabled ones.
- `GET /api/memories/:id` — fetch a specific memory.
- `GET /api/settings` — get deformation settings.
- `GET /api/director/next` — select the next memory using weighted probability and cooldowns.
- `POST /api/test-event` — test the event selection system; requires `X-API-Key` if configured.
- `POST /api/memories` — create a memory; requires `X-API-Key` if configured.
- `PUT /api/settings` — update all settings; requires `X-API-Key` if configured.
- `PATCH /api/memories/:id` — update a memory; requires `X-API-Key` if configured.
- `DELETE /api/memories/:id` — delete a memory; requires `X-API-Key` if configured.
- `GET /api/log` — get recent backend events.
- `DELETE /api/log` — clear the log; requires `X-API-Key` if configured.

## Deploy to a Node.js host

Use a service that supports Node.js and HTTPS, such as:

- Render
- Railway
- Fly.io
- Azure App Service
- Heroku
- VPS with Node.js and Nginx

Set the public backend URL in the static dashboard and in Roblox Studio scripts.

Example environment variables:

```bash
PORT=3000
API_KEY=change-me
NODE_ENV=production
```

Then expose the app over HTTPS and set `window.BACKEND_URL` in the dashboard to the public domain.
