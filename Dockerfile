FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production VERIPLANE_HOST=0.0.0.0 VERIPLANE_PORT=4317 VERIPLANE_DB_PATH=/data/veriplane.db
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
VOLUME ["/data"]
EXPOSE 4317
CMD ["node", "dist/server/src/server/index.js"]
