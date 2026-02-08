# syntax=docker/dockerfile:1

FROM ubuntu:22.04

LABEL \
    maintainer="Martin Bjeldbak Madsen <me@martinbjeldbak.com>" \
    org.opencontainers.image.title="acestream-http-proxy" \
    org.opencontainers.image.description="Stream AceStream sources without needing to install AceStream player" \
    org.opencontainers.image.authors="Martin Bjeldbak Madsen <me@martinbjeldbak.com>" \
    org.opencontainers.image.url="https://github.com/martinbjeldbak/acestream-http-proxy" \
    org.opencontainers.image.vendor="https://martinbjeldbak.com"

ENV DEBIAN_FRONTEND="noninteractive" \
    CRYPTOGRAPHY_DONT_BUILD_RUST=1 \
    PIP_BREAK_SYSTEM_PACKAGES=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_ROOT_USER_ACTION=ignore \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_NO_CACHE=true \
    UV_SYSTEM_PYTHON=true \
    PYTHON_EGG_CACHE=/.cache

ENV VERSION="3.2.11_ubuntu_22.04_x86_64_py3.10" \
    ALLOW_REMOTE_ACCESS="no" \
    EXTRA_FLAGS=''

USER root
WORKDIR /app

# hadolint ignore=DL4006,DL3008,DL3013
RUN \
    apt-get update \
    && \
    apt-get install --no-install-recommends --no-install-suggests -y \
        bash \
        ca-certificates \
        catatonit \
        curl \
        jq \
        nano \
        libgirepository1.0-dev \
        libstdc++6 \
    	libgcc-s1 \
    	libglib2.0-0 \
    	libnss3 \
    	tzdata \
    	locales \
    && groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid 1000 -m appuser \
    && mkdir -p /app \
    && mkdir -p /.cache \
    && curl -fsSL "https://download.acestream.media/linux/acestream_${VERSION}.tar.gz" \
        | tar xzf - -C /app \
    && apt-get install -y python3.10=3.10.12* python3-pip libpython3.10  \
    && python3.10 -m pip install --upgrade pip \
    && python3.10 -m pip install -r /app/requirements.txt \
    && chown -R appuser:appuser /.cache /app && chmod -R 755 /app \
    && apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /tmp/* /var/lib/apt/lists/* /var/tmp/

COPY . /

RUN mkdir -p /dev/disk/by-id

RUN chmod +x /entrypoint.sh

RUN chown -R appuser:appuser /app && chmod 755 /app/data/webui/webplayer

USER appuser

ENTRYPOINT ["/usr/bin/catatonit", "--", "/entrypoint.sh"]

EXPOSE 6878/tcp

