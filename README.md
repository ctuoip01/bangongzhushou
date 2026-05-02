# 智研助手 - 咨询报告一站式创作平台

> 面向咨询公司的 AI 效率工具平台，提供文档校验、内容生成、政策搜索、PPT助手四大核心功能，以及可扩展的 AI 模块对话系统。

## 功能特性

### 核心功能模块

| 模块 | 功能 | 说明 |
|------|------|------|
| 📝 **文档格式校验** | 公文 + 商务文档校验 | 符合 GB/T 9704-2012 国家标准，支持标题格式、发文字号、正文层级等多维度检查 |
| ✍️ **报告内容生成** | 智能扩写报告章节 | 支持综合性咨询、政策研究、市场分析、投资尽调等多种报告类型 |
| 🔍 **政策搜索聚合** | 实时检索政策文件 | 多时间范围筛选，AI 智能摘要聚合 + 权威来源标注 |
| 📊 **PPT助手** | 报告转 PPT 大纲 | 支持学术专业、正式商务、创意活力多种风格 |

### AI 模块系统

| 能力 | 说明 |
|------|------|
| 💬 **多轮对话** | 基于 `/module/[id]` 路由的完整 Chat 交互体验 |
| ⚡ **内置模块** | 预置多个开箱即用的专业咨询模块 |
| 🔧 **自定义模块** | 支持用户创建和编辑专属 AI 工作流 |
| 📎 **智能输入** | 支持文件上传、富文本粘贴等增强输入能力 |
| 📄 **导出能力** | 支持文本下载与 PDF 导出 |

## 技术栈

| 分类 | 技术 |
|------|------|
| **框架** | Next.js 16 (App Router) |
| **核心** | React 19 + TypeScript 5 |
| **UI 组件** | shadcn/ui (Radix UI) + Tailwind CSS 4 |
| **AI 能力** | coze-coding-dev-sdk (LLM + Web Search) |
| **数据库** | Supabase (PostgreSQL) + Drizzle ORM |
| **文件导出** | jsPDF |

## 快速开始

### 环境要求

- Node.js >= 18.x
- pnpm >= 9.x（项目强制使用 pnpm）

### 安装依赖

```bash
pnpm install
```

### 开发环境

```bash
# 启动开发服务器（默认端口 5000）
pnpm dev

# 访问 http://localhost:5000
```

> **注意**：若使用腾讯云 Cloud Studio 等远程开发环境，已配置 `allowedDevOrigins` 支持跨域访问。

### 生产构建

```bash
# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

### 代码质量检查

```bash
# TypeScript 类型检查
pnpm ts-check

# ESLint 代码检查
pnpm lint
```

## 项目结构

```
├── src/
│   ├── app/
│   │   ├── page.tsx                 # 首页（模块入口）
│   │   ├── layout.tsx               # 根布局
│   │   ├── globals.css              # 全局样式
│   │   ├── module/[id]/            # 💬 AI 模块对话页面
│   │   ├── document-check/          # 📝 文档格式校验
│   │   ├── report-generate/         # ✍️ 报告内容生成
│   │   ├── policy-search/           # 🔍 政策搜索聚合
│   │   ├── ppt-helper/             # 📊 PPT助手
│   │   └── api/                    # API 路由（后端）
│   │       ├── ai/                 # AI 对话接口
│   │       ├── document-check/     # 文档校验接口
│   │       ├── report-generate/    # 报告生成接口
│   │       ├── policy-search/      # 政策搜索接口
│   │       └── ppt-helper/         # PPT助手接口
│   ├── components/
│   │   ├── ui/                     # shadcn/ui 组件库（50+ 组件）
│   │   ├── module-card.tsx        # 模块卡片组件
│   │   ├── module-editor.tsx      # 自定义模块编辑器
│   │   ├── smart-input.tsx        # 智能输入框（支持文件上传）
│   │   ├── module-glyph.tsx       # 模块图标组件
│   │   ├── char-count.tsx         # 字数统计组件
│   │   ├── skeleton.tsx           # 加载骨架屏
│   │   └── toast.tsx              # Toast 提示组件
│   ├── config/
│   │   └── modules.ts             # 内置模块定义与配置
│   ├── lib/
│   │   ├── utils.ts               # 通用工具函数
│   │   ├── ai-settings.ts         # AI 设置管理
│   │   ├── module-manager.ts      # 自定义模块 CRUD
│   │   ├── document-hub.ts        # 文档中心逻辑
│   │   └── input-handler.ts       # 输入处理（解析/文件）
│   └── types/                      # 类型定义
├── scripts/
│   ├── dev.sh                     # 开发启动脚本
│   ├── build.sh                   # 构建脚本
│   ├── start.sh                   # 生产启动脚本
│   └── prepare.sh                 # 预处理脚本
├── public/                        # 静态资源
├── .coze                         # Coze CLI 配置
└── package.json
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DEPLOY_RUN_PORT` | 服务端口 | `5000` |
| `COZE_PROJECT_DOMAIN_DEFAULT` | 访问域名 | - |

## 使用说明

### 文档格式校验 (`/document-check`)

1. 选择校验模式（党政公文 / 商务文档 / 两者）
2. 粘贴或输入文档内容
3. 点击「开始校验」，查看结构化问题报告
4. **检查维度**：标题格式、发文字号、主送机关、正文层级、附件格式、落款对齐、字体字号

### 报告内容生成 (`/report-generate`)

1. 选择报告类型（综合咨询 / 政策研究 / 市场分析 / 投资尽调）
2. 输入报告标题（可选）+ 编写大纲
3. 点击「开始生成」，支持流式输出
4. 复制或导出生成内容

### 政策搜索聚合 (`/policy-search`)

1. 输入搜索关键词
2. 选择类型（政策文件 / 行业动态）和时间范围（1月/3月/6月/1年）
3. 点击「搜索」，查看 AI 摘要或原始结果

### PPT 助手 (`/ppt-helper`)

1. 选择演示风格（学术专业 / 正式商务 / 创意活力）
2. 输入报告内容
3. 点击「生成PPT大纲」
4. 预览 Markdown 大纲或结构化幻灯片列表

### AI 模块对话 (`/module/[id]`)

1. 从首页选择内置或自定义模块进入对话
2. 使用智能输入框（支持文件上传、富文本粘贴）
3. 进行多轮对话，实时流式响应
4. 支持复制、重新生成、下载、导出 PDF 等操作

## 部署指南

### PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start pnpm --name "zhiyan-assistant" -- start

# 设置开机自启
pm2 save && pm2 startup
```

### Docker 部署

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

### Nginx 反向代理

```nginx
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

## 注意事项

- 所有 API 端点仅限后端调用，切勿在客户端直接调用 AI SDK
- 文档校验遵循 GB/T 9704-2012 国家标准
- 支持党政公文和商务文档双模式校验
- 政策搜索支持实时 Web 检索和 AI 摘要聚合
- 开发环境使用沙箱内置 AI，生产环境可通过环境变量接入自托管服务

## License

MIT
