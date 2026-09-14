# OpenG2P in Action — static dashboard served by nginx
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="OpenG2P in Action Dashboard" \
      org.opencontainers.image.description="Single-page dashboard rendering live OpenG2P country data" \
      org.opencontainers.image.source="https://github.com/eyuaelb/openg2p-dashboard"

COPY nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

COPY index.html style.css script.js ./
COPY assets/ ./assets/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
