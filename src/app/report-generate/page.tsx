'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PenTool, RefreshCw, Copy, Check, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ReportGeneratePage() {
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('comprehensive');
  const [outline, setOutline] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!outline.trim()) {
      alert('请输入报告大纲');
      return;
    }

    setIsGenerating(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/report-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outline, reportType, title }),
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setStreamingContent(fullContent);
        }
      }
    } catch (error) {
      console.error('Generate error:', error);
      alert('报告生成服务暂时不可用，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(streamingContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleReset = () => {
    setTitle('');
    setOutline('');
    setStreamingContent('');
  };

  const handleSampleOutline = () => {
    setTitle('中国新能源汽车行业发展研究报告');
    setReportType('market');
    setOutline(`一、执行摘要
二、行业概述
  （一）行业定义与分类
  （二）行业发展历程
三、市场现状分析
  （一）市场规模与增长趋势
  （二）竞争格局分析
  （三）产业链结构
四、政策环境分析
  （一）国家层面政策
  （二）地方配套政策
  （三）政策影响评估
五、发展趋势与展望
六、主要结论与建议`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* 导航栏 */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                返回首页
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-green-700 text-white shadow-lg shadow-green-500/20">
                <PenTool className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold">报告内容生成</h1>
                <p className="text-xs text-muted-foreground">智能扩写咨询报告章节</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* 左侧：输入区域 */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                输入报告信息
              </h2>

              {/* 报告标题 */}
              <div className="mb-4">
                <Label htmlFor="title" className="text-sm font-medium mb-2 block">报告标题（可选）</Label>
                <Input
                  id="title"
                  placeholder="例如：2026年中国新能源汽车行业发展研究报告"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* 报告类型 */}
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">报告类型</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择报告类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprehensive">综合性咨询报告</SelectItem>
                    <SelectItem value="policy">政策研究报告</SelectItem>
                    <SelectItem value="market">市场分析报告</SelectItem>
                    <SelectItem value="due-diligence">投资尽调报告</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 报告大纲 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="outline" className="text-sm font-medium">报告大纲</Label>
                  <Button variant="ghost" size="sm" onClick={handleSampleOutline} className="text-xs h-7">
                    📋 使用示例大纲
                  </Button>
                </div>
                <Textarea
                  id="outline"
                  placeholder={`请输入报告大纲，格式示例：
一、执行摘要
二、行业概述
  （一）行业定义与分类
  （二）行业发展历程
三、市场现状分析
  （一）市场规模
  （二）竞争格局
...`}
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                  className="min-h-[350px] font-mono text-sm"
                />
              </div>

              <div className="mt-4 flex gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !outline.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <PenTool className="mr-2 h-4 w-4" />
                      开始生成
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isGenerating}
                >
                  重置
                </Button>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">💡 使用提示</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• 输入越详细的大纲，生成的内容越精准</li>
                <li>• 支持多级标题结构（一、/（一）/ 1.）</li>
                <li>• 可指定具体章节的写作要求</li>
                <li>• 生成内容可直接复制到Word文档</li>
              </ul>
            </div>
          </div>

          {/* 右侧：输出区域 */}
          <div className="space-y-6">
            {/* 输出区域 */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin text-green-600" />
                      生成中...
                    </>
                  ) : streamingContent ? (
                    <>
                      <FileText className="h-5 w-5 text-green-600" />
                      生成结果
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      生成结果
                    </>
                  )}
                </h2>
                {streamingContent && !isGenerating && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        复制全文
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="min-h-[500px] rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap leading-relaxed overflow-auto max-h-[600px]">
                {streamingContent || (
                  <span className="text-muted-foreground/70">
                    在左侧输入大纲后，点击「开始生成」<br/>
                    AI 将为您扩写完整的报告内容...
                  </span>
                )}
                {isGenerating && <span className="animate-pulse">▋</span>}
              </div>
            </div>

            {/* 报告类型说明 */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-muted-foreground">报告类型说明</h3>
              <div className="grid gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-medium">📄</span>
                  <div>
                    <span className="font-medium">综合性咨询报告</span>
                    <p className="text-muted-foreground">适用于综合性研究项目</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-medium">📋</span>
                  <div>
                    <span className="font-medium">政策研究报告</span>
                    <p className="text-muted-foreground">注重政策梳理与影响分析</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-600 font-medium">📊</span>
                  <div>
                    <span className="font-medium">市场分析报告</span>
                    <p className="text-muted-foreground">聚焦市场与竞争格局分析</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-600 font-medium">🔍</span>
                  <div>
                    <span className="font-medium">投资尽调报告</span>
                    <p className="text-muted-foreground">侧重企业评估与风险分析</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
