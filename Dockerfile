FROM emqx:5.0.20

USER root

RUN if command -v apt-get >/dev/null 2>&1; then \
      mkdir -p /var/lib/apt/lists/partial \
      && apt-get update \
      && apt-get install -y --no-install-recommends python3 python3-venv \
      && rm -rf /var/lib/apt/lists/*; \
    elif command -v apk >/dev/null 2>&1; then \
      apk add --no-cache python3; \
    else \
      echo "Unsupported base image: missing apt-get/apk" >&2; \
      exit 1; \
    fi

WORKDIR /app

RUN mkdir -p /app/static

COPY web/static/ /app/static/
COPY web/entrypoint.py /app/web_entrypoint.py
COPY web/config_defaults.json /app/web/config_defaults.json
COPY web/get_local_ip.py /app/get_local_ip.py
COPY web/diagnose.py /app/diagnose.py
COPY scripts/start.sh /app/start.sh

RUN chmod +x /app/start.sh

RUN chown -R emqx:emqx /app

EXPOSE 1883 8083 8084 8883 18083 3100

USER emqx

ENTRYPOINT ["/app/start.sh"]
