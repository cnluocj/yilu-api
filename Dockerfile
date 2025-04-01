FROM node:18-alpine AS base

# 安装依赖阶段
FROM base AS deps
WORKDIR /app

# 复制package.json文件
COPY package.json package-lock.json* ./
RUN npm ci

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 安装依赖 wget 用于健康检查
RUN apk add --no-cache wget

# 构建应用 - 使用专门的Docker构建命令
RUN npm run build:docker

# 生产阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 9090

# 安装 wget 用于健康检查
RUN apk add --no-cache wget

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 设置用户权限
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 9090

# 启动命令
CMD ["node", "server.js"] 