# 智研助手 - 咨询报告一站式创作平台

## 项目概述

智研助手是一个面向咨询公司的 AI 效率工具平台，提供文档格式校验、内容生成、政策搜索、PPT助手四大核心功能。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **核心**: React 19
- **语言**: TypeScript 5
- **UI组件**: shadcn/ui (基于 Radix UI)
- **样式**: Tailwind CSS 4
- **AI能力**: coze-coding-dev-sdk (LLM + Web Search)

## 目录结构

```
├── src/
│   ├── app/
│   │   ├── page.tsx                 # 首页
│   │   ├── layout.tsx               # 根布局
│   │   ├── globals.css              # 全局样式
│   │   ├── document-check/          # 文档格式校验
│   │   ├── report-generate/         # 报告内容生成
│   │   ├── policy-search/           # 政策搜索聚合
│   │   ├── ppt-helper/             # PPT助手
│   │   └── api/                    # API路由
│   │       ├── document-check/     # 文档校验API
│   │       ├── report-generate/    # 报告生成API
│   │       ├── policy-search/      # 政策搜索API
│   │       └── ppt-helper/         # PPT助手API
│   └── components/ui/              # shadcn/ui组件库
├── .coze                          # 项目配置
├── package.json
└── tsconfig.json
```

## 功能模块

### 1. 文档格式校验 (`/document-check`)

**功能**: 自动检查党政公文与商务文档格式合规性

**检查维度**:
- 标题格式（发文机关+关于+事项+文种）
- 发文字号格式（×〔2026〕×号）
- 主送机关顶格规范
- 正文层级结构（一、/（一）/ 1.）
- 附件格式标注
- 落款右对齐规范
- 字体字号标准

**API**: `POST /api/document-check`

### 2. 报告内容生成 (`/report-generate`)

**功能**: 根据大纲智能扩写咨询报告章节

**支持类型**:
- 综合性咨询报告
- 政策研究报告
- 市场分析报告
- 投资尽调报告

**API**: `POST /api/report-generate`

### 3. 政策搜索聚合 (`/policy-search`)

**功能**: 实时检索行业动态与政策文件

**特性**:
- 支持政策文件/行业动态筛选
- 多时间范围筛选（1月/3月/6月/1年）
- AI智能摘要聚合
- 权威来源标注

**API**: `POST /api/policy-search`

### 4. PPT助手 (`/ppt-helper`)

**功能**: 将报告内容转换为PPT大纲

**支持风格**:
- 学术专业风格
- 正式商务风格
- 创意活力风格

**输出**:
- Markdown大纲
- 结构化幻灯片列表
- 预览功能

**API**: `POST /api/ppt-helper`

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发环境
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm ts-check

# 代码检查
pnpm lint
```

## 环境变量

| 变量名 | 说明 |
|--------|------|
| `DEPLOY_RUN_PORT` | 服务端口（默认5000） |
| `COZE_PROJECT_DOMAIN_DEFAULT` | 访问域名 |

## AI集成

本项目使用 `coze-coding-dev-sdk` 集成 AI 能力：

- **LLM**: 用于文档校验、内容生成、PPT大纲设计
- **Web Search**: 用于政策搜索与信息检索

所有AI调用均在后端API路由中执行，支持流式输出。

## 注意事项

1. 所有API端点仅限后端使用，切勿在客户端直接调用SDK
2. 文档校验遵循 GB/T 9704-2012 国家标准
3. 支持党政公文和商务文档双模式校验
4. 政策搜索支持实时Web检索和AI摘要聚合
