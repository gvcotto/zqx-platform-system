# Public build-time configuration only. Server credentials are injected at runtime.
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Explicit local-only product sandbox. The default final stage remains production.
FROM dependencies AS demo
ENV NODE_ENV=development NEXT_TELEMETRY_DISABLED=1 ZQX_RUNTIME_MODE=demo PORT=3000 HOSTNAME=0.0.0.0
COPY package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs tailwind.config.ts eslint.config.mjs ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
RUN chown node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "node_modules/next/dist/bin/next", "dev", "--hostname", "0.0.0.0", "--port", "3000"]

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 ZQX_OUTPUT=standalone ZQX_RUNTIME_MODE=production
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3007
ARG NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=portable-public-placeholder
ARG NEXT_PUBLIC_GOOGLE_HOSTED_DOMAIN=
ARG NEXT_PUBLIC_PLATFORM_SYSTEM_URL=http://localhost:3007
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_GOOGLE_HOSTED_DOMAIN=$NEXT_PUBLIC_GOOGLE_HOSTED_DOMAIN \
    NEXT_PUBLIC_PLATFORM_SYSTEM_URL=$NEXT_PUBLIC_PLATFORM_SYSTEM_URL
COPY --from=dependencies /app/node_modules ./node_modules
# Explicit sources: never copy environment files, Git history or credentials.
COPY package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs tailwind.config.ts eslint.config.mjs ./
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 ZQX_RUNTIME_MODE=production
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
