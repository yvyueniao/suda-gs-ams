# =========================
# 1) Build stage
# =========================
FROM node:18-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# =========================
# 2) Runtime stage (Nginx)
# =========================
FROM nginx:1.25-alpine

# envsubst 来自 gettext
RUN apk add --no-cache gettext

# 放模板（注意：这是 template，不是 conf）
COPY ./deploy/nginx.conf.template /etc/nginx/templates/default.conf.template

# 静态资源
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# 启动时渲染模板 -> 正式配置
CMD ["/bin/sh", "-c", "envsubst '$$API_UPSTREAM' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]