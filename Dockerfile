FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json* .npmrc ./
RUN npm ci

COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src

RUN npm run build


FROM python:3.11-slim AS python-deps

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /tmp/build

COPY backend/requirements.txt ./requirements.txt
RUN pip wheel --wheel-dir /tmp/wheels -r requirements.txt


FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    BACKEND_PORT=8000 \
    DATABASE_URL=sqlite:////data/sky_sentinel.db \
    FRONTEND_DIST_DIR=/app/static \
    SKY_SENTINEL_AUTO_BOOTSTRAP=1 \
    LLM_PROVIDER=mock

RUN apt-get update && \
    apt-get install -y --no-install-recommends libgomp1 tini && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
COPY --from=python-deps /tmp/wheels /tmp/wheels
RUN pip install --no-index --find-links=/tmp/wheels -r backend/requirements.txt && \
    rm -rf /tmp/wheels

COPY backend ./backend
COPY entrypoint.sh ./entrypoint.sh
COPY --from=frontend-builder /app/dist ./static

RUN mkdir -p /data && \
    chmod +x /app/entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=10 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.getenv(\"BACKEND_PORT\", \"8000\")}/api/health', timeout=3).read()"

ENTRYPOINT ["/usr/bin/tini", "--", "/app/entrypoint.sh"]
