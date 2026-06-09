# Face Recognition Platform - Frontend

Next.js 15 frontend for the Face Recognition Platform.

## Architecture

```
Frontend_web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── login/
│   │   ├── register/
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── camera-capture.tsx  # Webcam capture component
│   │   ├── job-poll.tsx        # Celery job polling
│   │   └── sidebar.tsx          # Dashboard navigation
│   └── lib/
│       ├── api-client.ts       # Axios API client with JWT
│       ├── auth-context.tsx    # Auth context provider
│       └── types.ts            # TypeScript interfaces
├── docker-compose.yml
├── Dockerfile
└── next.config.js
```

## Quick Start

### Development
```bash
npm install
npm run dev
```
Visit http://localhost:3000

### Production (Docker)
```bash
docker compose up -d
```
Frontend runs at http://localhost:3000

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `/api` | API Gateway URL |

For local development with Docker backend:
```env
NEXT_PUBLIC_API_URL=http://localhost/api
```

## Pages

| Route | Auth | Description |
|-------|------|-------------|
| `/` | No | Landing page |
| `/login` | No | Login form |
| `/register` | No | Registration form |
| `/dashboard` | Yes | Dashboard overview |
| `/dashboard/enroll` | Yes | Enroll face |
| `/dashboard/verify` | Yes | Verify face |
| `/dashboard/identify` | Yes | Identify face |
| `/dashboard/liveness` | Yes | Liveness check |
| `/dashboard/admin` | Admin | User management |

## API Integration

The frontend communicates with the backend via the API Gateway (http://localhost/api).

### Authentication Flow
1. User logs in via `/auth/login`
2. Backend returns `access_token` + `refresh_token`
3. Frontend stores tokens in localStorage
4. API client auto-attaches `Authorization: Bearer <token>` to requests
5. On 401 response, client auto-refreshes the access token

## Backend Repository

The backend code is in a separate repository: `Backend/`

For the full stack to work:
1. Start backend: `cd Backend && docker compose up -d`
2. Start frontend: `docker compose up -d`

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Axios
- react-webcam

## Build for Production

```bash
npm run build
npm start
```

Or use Docker:
```bash
docker build -t face-recognition-web .
docker run -p 3000:3000 face-recognition-web
```