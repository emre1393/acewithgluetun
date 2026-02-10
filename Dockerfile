FROM python:3.10-slim

LABEL \
    maintainer="Martin Bjeldbak Madsen <me@martinbjeldbak.com>" \
    org.opencontainers.image.title="acestream-http-proxy" \
    org.opencontainers.image.description="Stream AceStream sources without needing to install AceStream player" 

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1


ENV VERSION="3.2.11_ubuntu_22.04_x86_64_py3.10" \
    ALLOW_REMOTE_ACCESS="no" \
    EXTRA_FLAGS=''

USER root
WORKDIR /app

RUN \
    apt-get update \
    && \
    apt-get install -yq wget \
    && groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid 1000 -m appuser \
    && mkdir -p /app \
    && wget -qO- "https://download.acestream.media/linux/acestream_${VERSION}.tar.gz" \
        | tar xzf - -C /app \
    && pip install -q --no-cache-dir -U -r /app/requirements.txt \
    && chown -R appuser:appuser /app && chmod -R 755 /app \
    && apt-get purge -y --auto-remove -o APT::AutoRemove::RecommendsImportant=false \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /tmp/* /var/lib/apt/lists/* /var/tmp/

COPY . /

RUN chmod +x /entrypoint.sh

RUN chown -R appuser:appuser /app && chmod 755 /app/data/webui/webplayer

USER appuser

ENTRYPOINT ["/entrypoint.sh"]

EXPOSE 6878/tcp

HEALTHCHECK CMD wget -q -t1 -O- 'http://127.0.0.1:6878/webui/api/service?method=get_version' | grep '"error": null'
