# PostgreSQL with pgvector (vector similarity, for «Si te ha gustado»), production and local.
# On the official Alpine image on purpose: the data directory was created by it, and a Debian
# image (glibc) sorts text differently from Alpine (musl), which would corrupt the text indexes.
# pgvector has no Alpine package for this build of PostgreSQL, so it is compiled here: without
# `-march=native` (CI builds it, the server runs it) and without LLVM bitcode (no JIT for it).
FROM postgres:18.6-alpine3.24
ARG PGVECTOR_VERSION=0.8.7
RUN apk add --no-cache --virtual .build-pgvector build-base git \
  && git clone --branch "v$PGVECTOR_VERSION" --depth 1 https://github.com/pgvector/pgvector.git /tmp/pgvector \
  && make -C /tmp/pgvector OPTFLAGS="" with_llvm=no \
  && make -C /tmp/pgvector install with_llvm=no \
  && rm -rf /tmp/pgvector \
  && apk del .build-pgvector
