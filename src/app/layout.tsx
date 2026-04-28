import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/toast';

export const metadata: Metadata = {
  title: {
    default: '智研助手 | 咨询报告一站式创作平台',
    template: '%s | 智研助手',
  },
  description: '咨询报告一站式创作平台 - 文档校验、内容生成、政策搜索、PPT助手',
  keywords: ['咨询', '报告', '公文', 'AI助手', '文档校验'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
