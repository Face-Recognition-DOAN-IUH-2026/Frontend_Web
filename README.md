
![Uploading Hệ_sinh_thái_thư_viện.png…]()

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

---

## Installation

### Prerequisites

- Node.js 18+ (recommended: 20.x LTS)
- npm or yarn
- Docker Desktop (if running with Docker)

### Option 1: Local Development

#### Step 1: Install Dependencies

```bash
cd D:/IUH/test/Frontend_Web_Test
npm install
```

#### Step 2: Setup Environment

Create or edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost/api
```

#### Step 3: Start Backend

Make sure the backend is running first:

```bash
cd D:/IUH/test/Backend
docker-compose up -d
```

#### Step 4: Start Frontend

```bash
cd D:/IUH/test/Frontend_Web_Test
npm run dev
```

Visit http://localhost:3000

### Option 2: Docker

#### Step 1: Start Backend

```bash
cd D:/IUH/test/Backend
docker-compose up -d
```

#### Step 2: Start Frontend

```bash
cd D:/IUH/test/Frontend_Web_Test
docker-compose up -d
```

Frontend runs at http://localhost:3000

---

## Common Errors & Fixes

### 1. "Cannot find module 'next'" or other dependency errors

**Cause:** node_modules missing or corrupted.

**Fix:**
```bash
cd D:/IUH/test/Frontend_Web_Test
rm -rf node_modules package-lock.json
npm install
```

### 2. "NEXT_PUBLIC_API_URL is not set"

**Cause:** Environment variable not configured.

**Fix:** Create `.env.local` in the project root:

```env
NEXT_PUBLIC_API_URL=http://localhost/api
```

For Docker backend, ensure backend is running first.

### 3. "Hydration failed" or "Content mismatch" errors

**Cause:** SSR mismatch, usually with localStorage access during render.

**Fix:** Ensure API calls are wrapped in `useEffect` or use dynamic imports for components using browser-only APIs.

### 4. Port 3000 already in use

**Fix:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Or change port
npm run dev -- -p 3001
```

### 5. Webcam not working

**Cause:** Browser permissions or HTTPS requirement.

**Fix:**
- Allow camera permissions in browser
- For HTTPS: Use `https://localhost:3000` or Chrome flags:
  ```
  chrome://flags/#unsafely-treat-insecure-origin-as-secure
  ```

### 6. API requests failing (CORS errors)

**Cause:** Backend CORS not configured or backend not running.

**Fix:**
```bash
# Check if backend is running
cd D:/IUH/test/Backend
docker-compose ps

# Restart backend if needed
docker-compose restart

# Check gateway logs
docker-compose logs gateway
```

### 7. "Connection refused" to backend

**Cause:** Backend not running or wrong API URL.

**Fix:**
```bash
# Verify backend is running
cd D:/IUH/test/Backend
docker-compose ps

# All containers should be "Up" or "Healthy"

# Check .env.local has correct URL
NEXT_PUBLIC_API_URL=http://localhost/api
```

### 8. Docker build fails for frontend

**Cause:** Build context missing files.

**Fix:**
```bash
cd D:/IUH/test/Frontend_Web_Test
npm run build  # Test local build first
docker build -t face-recognition-web .
```

### 9. Login/Register not working

**Cause:** Backend services not healthy or JWT misconfiguration.

**Fix:**
```bash
# Check all backend services
docker-compose ps

# View user-service logs
docker-compose logs user-service

# View gateway logs
docker-compose logs gateway

# Restart if needed
docker-compose restart
```

### 10. Build errors with TypeScript

**Cause:** Type checking failures.

**Fix:**
```bash
cd D:/IUH/test/Frontend_Web_Test
# Check TypeScript
npx tsc --noEmit

# Build with skipping lint
npm run build -- --no-lint
```

---

## Development

### Available Scripts

```bash
npm run dev      # Start development server (Turbo)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Code Quality

```bash
# Format code
npm run lint -- --fix
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `/api` | API Gateway URL |

For local development with Docker backend:
```env
NEXT_PUBLIC_API_URL=http://localhost/api
```

---

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

---

## API Integration

The frontend communicates with the backend via the API Gateway (http://localhost/api).

### Authentication Flow

1. User logs in via `/auth/login`
2. Backend returns `access_token` + `refresh_token`
3. Frontend stores tokens in localStorage
4. API client auto-attaches `Authorization: Bearer <token>` to requests
5. On 401 response, client auto-refreshes the access token

---

## Backend Repository

The backend code is in: `D:/IUH/test/Backend/`

For the full stack to work:

1. **Start backend first:**
   ```bash
   cd D:/IUH/test/Backend
   # Build TypeScript services first
   cd user-service && npm install && npm run build && cd ..
   cd api-gateway && npm install && npm run build && cd ..
   # Then start Docker
   docker-compose up -d --build
   ```

2. **Start frontend:**
   ```bash
   cd D:/IUH/test/Frontend_Web_Test
   npm install
   npm run dev
   ```

---

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

---

## Troubleshooting Checklist

1. [ ] Docker Desktop is running
2. [ ] Backend is fully built and running (`docker-compose ps` shows all Up/Healthy)
3. [ ] TypeScript services built (`npm run build` succeeds locally)
4. [ ] `.env.local` exists with correct `NEXT_PUBLIC_API_URL`
5. [ ] `npm install` completed without errors
6. [ ] Port 3000 (frontend) and 80 (backend gateway) are free
7. [ ] Browser has camera permissions for face recognition features
