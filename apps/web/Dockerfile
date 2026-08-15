FROM node:20-alpine AS builder

WORKDIR /app/apps/web

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .
RUN npx prisma generate

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app/apps/web

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./public/_next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/apps/web/app/generated/prisma ./app/generated/prisma

EXPOSE 3000

CMD ["node", "server.js"]
