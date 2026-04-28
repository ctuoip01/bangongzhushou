'use client';

import Link from 'next/link';
import { FileCheck, PenTool, Search, Presentation, Sparkles, Shield, Zap, BookOpen } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

function FeatureCard({ title, description, icon, href, color }: FeatureCardProps) {
  return (
    <Link href={href} className="group">
      <div className={`relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${color}`}>
        {/* 背景装饰 */}
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* 图标 */}
        <div className="mb-6 inline-flex rounded-xl bg-primary/10 p-4 text-primary">
          {icon}
        </div>
        
        {/* 内容 */}
        <h3 className="mb-3 text-xl font-semibold">{title}</h3>
        <p className="mb-4 text-muted-foreground leading-relaxed">{description}</p>
        
        {/* 按钮 */}
        <div className="inline-flex items-center text-sm font-medium text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          开始使用
          <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const features = [
    {
      title: '文档格式校验',
      description: '自动检查党政公文与商务文档格式合规性，涵盖标题、发文字号、正文结构、落款等全维度检测',
      icon: <FileCheck className="h-8 w-8" />,
      href: '/document-check',
      color: 'hover:border-blue-200',
    },
    {
      title: '报告内容生成',
      description: '输入大纲即可智能扩写咨询报告章节，支持政策研究、市场分析、投资尽调等专业文档',
      icon: <PenTool className="h-8 w-8" />,
      href: '/report-generate',
      color: 'hover:border-green-200',
    },
    {
      title: '政策搜索聚合',
      description: '实时检索行业动态与政策文件，智能聚合相关信息，快速获取决策参考素材',
      icon: <Search className="h-8 w-8" />,
      href: '/policy-search',
      color: 'hover:border-purple-200',
    },
    {
      title: 'PPT助手',
      description: '一键将报告内容转换为PPT大纲，支持多种模板风格，助力高效汇报呈现',
      icon: <Presentation className="h-8 w-8" />,
      href: '/ppt-helper',
      color: 'hover:border-orange-200',
    },
  ];

  const highlights = [
    { icon: <Shield className="h-5 w-5" />, text: '符合 GB/T 9704-2012 国家标准' },
    { icon: <Sparkles className="h-5 w-5" />, text: 'AI 智能分析与生成' },
    { icon: <Zap className="h-5 w-5" />, text: '流式输出即时反馈' },
    { icon: <BookOpen className="h-5 w-5" />, text: '专业咨询行业定制' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* 导航栏 */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold">智研助手</h1>
              <p className="text-xs text-muted-foreground">咨询报告一站式创作平台</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero 区域 */}
      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-blue-50 px-4 py-1.5 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300 mb-8">
          <Sparkles className="h-4 w-4" />
          专为咨询公司打造的专业工具
        </div>
        <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            智研助手
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
          文档校验 · 内容生成 · 政策搜索 · PPT呈现
          <br />
          一站式提升咨询报告撰写效率
        </p>
        
        {/* 亮点 */}
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          {highlights.map((item, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm shadow-sm"
            >
              {item.icon}
              {item.text}
            </div>
          ))}
        </div>
      </section>

      {/* 功能卡片 */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      {/* 底部 */}
      <footer className="border-t bg-background/50">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-muted-foreground">
          <p>智研助手 - 咨询报告一站式创作平台</p>
          <p className="mt-1">支持党政公文格式校验（GB/T 9704-2012）及商务文档优化</p>
        </div>
      </footer>
    </div>
  );
}
