import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/toast';

export const metadata: Metadata = {
  title: {
    default: '办公助手 | 咨询报告一站式创作平台',
    template: '%s | 办公助手',
  },
  description: '面向咨询与商务写作场景的 AI 工作台，支持流式输出、报告生成、文档分析、政策研究与 PPT 辅助。',
  keywords: ['办公助手', 'AI 写作', '报告生成', '文档分析', '政策研究', 'PPT 助手'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
