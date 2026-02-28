# Dockerfile
# 前端：Vite + React + TS
# 目标：多阶段构建 -> 最终用 Nginx 托管 dist，并支持 /api 反向代理（见 deploy/nginx.conf）

# =========================
# 1) Build stage
# =========================
FROM node:18-alpine AS builder

WORKDIR /app

# 先拷贝依赖清单，利用 Docker layer cache
COPY package.json package-lock.json* ./

# 安装依赖（推荐用 npm ci 保证可复现）
RUN npm ci

# 拷贝源码
COPY . .

# 生产构建
RUN npm run build


# =========================
# 2) Runtime stage (Nginx)
# =========================
FROM nginx:1.25-alpine

# 替换默认站点配置（你需要新建 deploy/nginx.conf）
COPY ./deploy/nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝构建产物到 Nginx 静态目录
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]