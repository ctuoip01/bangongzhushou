# 智研助手 - 咨询报告一站式创作平台

> 面向咨询公司的 AI 效率工具，提供文档校验、内容生成、政策搜索、PPT助手四大核心功能。

## 功能特性

| 模块 | 功能 | 说明 |
|-----|------|-----|
| 📝 **文档格式校验** | 公文 + 商务文档校验 | 符合 GB/T 9704-2012 国家标准 |
| ✍️ **报告内容生成** | 智能扩写报告章节 | 支持政策研究、市场分析、投资尽调等 |
| 🔍 **政策搜索聚合** | 实时检索政策文件 | AI 摘要 + 权威来源标注 |
| 📊 **PPT助手** | 报告转 PPT 大纲 | 支持多种风格模板 |

## 技术栈

- **框架**: Next.js 16 (App Router)
- **核心**: React 19 + TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **AI**: coze-coding-dev-sdk (LLM + Web Search)

## 快速开始

### 环境要求

- Node.js >= 18.x
- pnpm >= 9.x

### 安装依赖

```bash
# 使用 pnpm 安装依赖
pnpm install
```

### 开发环境

```bash
# 启动开发服务器（端口 5000）
pnpm dev

# 访问 http://localhost:5000
```

### 生产构建

```bash
# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

### 代码检查

```bash
# TypeScript 类型检查
pnpm ts-check

# ESLint 检查
pnpm lint

# 全部检查
pnpm build
```

## 环境变量配置

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑配置
vim .env.local
```

| 变量 | 说明 | 默认值 |
|-----|------|-------|
| `COZE_PROJECT_DOMAIN_DEFAULT` | 访问域名 | `http://localhost:5000` |
| `DEPLOY_RUN_PORT` | 服务端口 | `5000` |

## 目录结构

```
├── src/
│   ├── app/
│   │   ├── page.tsx                 # 首页
│   │   ├── layout.tsx               # 根布局
│   │   ├── globals.css              # 全局样式
│   │   ├── document-check/          # 📝 文档格式校验
│   │   │   └── page.tsx
│   │   ├── report-generate/         # ✍️ 报告内容生成
│   │   │   └── page.tsx
│   │   ├── policy-search/           # 🔍 政策搜索聚合
│   │   │   └── page.tsx
│   │   ├── ppt-helper/              # 📊 PPT助手
│   │   │   └── page.tsx
│   │   └── api/                     # API 路由
│   │       ├── document-check/
│   │       ├── report-generate/
│   │       ├── policy-search/
│   │       └── ppt-helper/
│   ├── components/                   # 共享组件
│   │   ├── ui/                      # shadcn/ui 组件库
│   │   ├── toast.tsx               # Toast 提示组件
│   │   ├── skeleton.tsx            # 加载骨架屏
│   │   └── char-count.tsx          # 字数统计组件
│   ├── types/                       # 类型定义
│   │   └── index.ts
│   └── lib/                         # 工具函数
│       └── utils.ts
├── public/                          # 静态资源
├── .env.example                     # 环境变量模板
├── .env.local                      # 本地开发配置
├── .env.production                 # 生产环境配置
├── .coze                          # Coze CLI 配置
└── package.json
```

## 部署指南

### 方式一：使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start pnpm --name "zhiyan-assistant" -- start

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
```

### 方式二：Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

EXPOSE 5000
CMD ["pnpm", "start"]
```

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 使用说明

### 文档格式校验

1. 选择校验模式（党政公文 / 商务文档 / 两者）
2. 粘贴或输入文档内容
3. 点击「开始校验」
4. 查看结构化的问题报告

### 报告内容生成

1. 选择报告类型
2. 输入报告标题（可选）
3. 编写报告大纲
4. 点击「开始生成」
5. 复制生成的内容

### 政策搜索聚合

1. 输入搜索关键词
2. 选择搜索类型和时间范围
3. 点击「搜索」
4. 查看 AI 摘要或原始结果

### PPT助手

1. 选择演示风格
2. 输入报告内容
3. 点击「生成PPT大纲」
4. 预览或下载大纲

## 常见问题

### Q: AI 能力需要付费吗？

A: 开发环境使用沙箱内置 AI，无需额外付费。生产环境部署后可通过环境变量接入免费 AI 服务（如 DeepSeek、Kimi 等）。

### Q: 支持私有化部署吗？

A: 支持。可以部署到任意 Node.js 环境中，支持 Docker、Kubernetes 等容器化部署。

### Q: 如何接入自己的 AI 服务？

A: 在 `.env.local` 中配置对应的 API Key，具体请参考 `.env.example`。

## License

MIT
