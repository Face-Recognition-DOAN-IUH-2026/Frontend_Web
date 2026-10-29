# Frontend_Web — image production (Next.js 16 / React 19)
# Build:
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://<api-domain> -t fe-web .
# NEXT_PUBLIC_API_URL là biến PUBLIC (không phải secret) — nhúng vào client bundle khi build.

# node:24 (Debian) — đầy đủ toolchain cho native module (isolated-vm/@n8n) và khớp engines >=24
FROM node:24

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

COPY package*.json ./
# --include=dev: bắt buộc vì ENV NODE_ENV=production phía trên làm npm bỏ devDeps
# (tailwindcss/typescript/postcss là devDependencies nhưng BẮT BUỘC có khi next build)
RUN npm ci --include=dev

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Typecheck toàn cục (tsc báo ĐẦY ĐỦ lỗi 1 lần — next build chỉ dừng ở lỗi đầu tiên)
RUN npx tsc --noEmit
RUN npm run build && npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start"]
