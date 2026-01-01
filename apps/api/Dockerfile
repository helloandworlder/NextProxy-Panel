# Panel API Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ jq && \
    npm install -g pnpm

# Copy root workspace files
COPY package.json bun.lock turbo.json ./

# Remove packageManager restriction and create pnpm-workspace.yaml
RUN jq 'del(.packageManager)' package.json > tmp.json && mv tmp.json package.json && \
    printf 'packages:\n  - "apps/*"\n  - "packages/*"\n' > pnpm-workspace.yaml

# Copy shared package
COPY packages/shared ./packages/shared/

# Copy api package
COPY apps/api ./apps/api/

# Install all dependencies using pnpm (supports workspace protocol)
# Rebuild native modules for Alpine Linux
RUN pnpm install --shamefully-hoist && \
    cd /app/node_modules/.pnpm/bcrypt@*/node_modules/bcrypt && npm rebuild bcrypt --build-from-source

# Build api
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# Build shared package for runtime
WORKDIR /app/packages/shared
RUN echo '{"compilerOptions":{"target":"ES2020","module":"commonjs","outDir":"dist","declaration":true,"esModuleInterop":true},"include":["src/**/*"]}' > tsconfig.json && \
    $(find /app/node_modules -name tsc -type f | head -1) && \
    jq '.main = "./dist/index.js" | .types = "./dist/index.d.ts" | .exports["."] = "./dist/index.js"' package.json > package.prod.json

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built dist
COPY --from=builder /app/apps/api/dist ./dist

# Copy all node_modules from root (flatten bun structure)
COPY --from=builder /app/node_modules ./node_modules

# Copy prisma files and generated client (pnpm structure)
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma ./node_modules/.prisma

# Copy shared package (compiled)
COPY --from=builder /app/packages/shared/dist ./node_modules/@panel/shared/dist
COPY --from=builder /app/packages/shared/package.prod.json ./node_modules/@panel/shared/package.json

# Copy proto files
COPY --from=builder /app/apps/api/src/grpc/proto ./dist/grpc/proto

EXPOSE 3000

CMD ["node", "dist/main.js"]
