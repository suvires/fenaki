# syntax=docker/dockerfile:1.10
#
# Production image of Shortix: the Astro site, Payload CMS and the jobs worker in one image, so
# the three Kamal roles always run the same commit. `docker/app/shortix` picks the process:
#   docker run ghcr.io/suvires/shortix web|cms|jobs|migrate|setup-services
#
# Built for linux/amd64 (the VPS) from any machine: JavaScript is compiled on the build machine's
# own architecture, and only the production dependencies (native modules such as sharp) are
# installed for the target one.
#   docker buildx build --platform linux/amd64 -t shortix .

ARG NODE_IMAGE=node:26.11.1-trixie-slim
ARG PNPM_VERSION=12.15.0

# --- pnpm on top of Node --------------------------------------------------------------------
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS pnpm-build
ARG PNPM_VERSION
RUN npm install --global --no-fund --no-audit pnpm@${PNPM_VERSION}
ENV PNPM_HOME=/pnpm CI=true
WORKDIR /app

FROM ${NODE_IMAGE} AS pnpm-target
ARG PNPM_VERSION
RUN npm install --global --no-fund --no-audit pnpm@${PNPM_VERSION}
ENV PNPM_HOME=/pnpm CI=true
WORKDIR /app

# --- Workspace manifests only, so dependency layers survive source changes ----------------------
FROM pnpm-build AS manifests
COPY . /src
RUN cd /src \
  && find . -name package.json -not -path '*/node_modules/*' -exec cp --parents {} /app \; \
  && cp pnpm-lock.yaml pnpm-workspace.yaml /app

# --- Build: every dependency, then the tokens, the site and the CMS ----------------------------
FROM pnpm-build AS build
COPY --from=manifests /app ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 ASTRO_TELEMETRY_DISABLED=1 NODE_OPTIONS=--no-deprecation
RUN pnpm turbo run build --filter=@shortix/web --filter=@shortix/cms \
  && rm -rf apps/cms/.next/cache

# --- Production dependencies, for the target architecture --------------------------------------
FROM pnpm-target AS prod-deps
COPY --from=manifests /app ./
RUN --mount=type=cache,id=pnpm-store-target,target=/pnpm/store \
  pnpm install --frozen-lockfile --prod --filter=@shortix/web... --filter=@shortix/cms...

# --- Runtime ------------------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
RUN apt-get update \
  && apt-get install --yes --no-install-recommends tini \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
  NODE_OPTIONS=--no-deprecation \
  NEXT_TELEMETRY_DISABLED=1 \
  HOST=0.0.0.0 \
  PORT=4321
WORKDIR /app

# Sources the processes read at run time: the Payload config, collections and migrations (the
# CLI loads them for `migrate` and `jobs`), the workspace packages and the setup script.
COPY package.json pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/cms/package.json apps/cms/next.config.ts apps/cms/tsconfig.json apps/cms/
COPY apps/cms/src apps/cms/src
COPY apps/web/package.json apps/web/
COPY apps/web/scripts apps/web/scripts
COPY apps/web/src apps/web/src
COPY tsconfig.base.json ./
COPY --from=prod-deps /app ./
COPY --from=build /app/packages/tokens/dist packages/tokens/dist
COPY --from=build /app/apps/web/dist apps/web/dist
COPY --from=build /app/apps/cms/.next apps/cms/.next
COPY docker/app/shortix /usr/local/bin/shortix

# The application files stay owned by root and read only; the processes run as `node` and write
# only to Next's cache and the uploads directory (a volume in production).
RUN mkdir -p apps/cms/.next/cache apps/cms/documents \
  && chown node:node apps/cms/.next/cache apps/cms/documents
USER node

EXPOSE 3000 4321
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/shortix"]
CMD ["web"]
