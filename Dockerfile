# syntax=docker/dockerfile:1
# 多阶段：构建静态站 → nginx 托管 build/

FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
LABEL org.opencontainers.image.title="cloudcreate-ai" \
      org.opencontainers.image.description="A human-AI creative toolkit: image, PDF, table, CSS, archive, and workflow tools that run mainly in the browser, with a focus on local processing and a reusable workspace shell." \
      org.opencontainers.image.url="https://cloudcreate.ai" \
      org.opencontainers.image.documentation="https://cloudcreate.ai" \
      org.opencontainers.image.source="https://github.com/cloudcreate-ai/cloudcreate.ai" \
      org.opencontainers.image.vendor="CloudCreate.ai" \
      org.opencontainers.image.licenses="SEE LICENSE IN REPOSITORY"
COPY --from=builder /app/build /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# 默认 CMD 继承 nginx 镜像
