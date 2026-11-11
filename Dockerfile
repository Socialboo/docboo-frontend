# syntax=docker/dockerfile:1

# ---------- deps / dev ----------
FROM oven/bun:latest AS dev
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ENV VITE_USE_POLLING=1
EXPOSE 3000
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

# ---------- build ----------
FROM dev AS build
RUN bun run build

# ---------- runtime ----------
FROM nginx:latest AS final
# Rendered to /etc/nginx/conf.d/default.conf by the image entrypoint (envsubst) at start.
COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
# Where /api is proxied to. Default: the API published on the Docker host (see docker-compose.yml).
ENV API_UPSTREAM=http://host.docker.internal:5248
# Drop the stock nginx welcome page so only the SPA is served.
RUN find /usr/share/nginx/html -mindepth 1 -delete
COPY --from=build /app/dist/client /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD curl -fsS -o /dev/null http://127.0.0.1/nginx-health || exit 1
