'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, PenTool, RefreshCw, Copy, Check, Sparkles, FileText, Clipboard, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CharCount } from '@/components/char-count';
import { useToast } from '@/components/toast';
import { copyToClipboard } from '@/lib/utils';
import { ReportType } from '@/types';

export default function ReportGeneratePage() {
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState<ReportType>('comprehensive');
  const [outline, setOutline] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (outline.trim() && !isGenerating) {
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [outline, isGenerating]);

  const handleGenerate = async () => {
    if (!outline.trim()) {
      showToast('请输入报告大纲', 'error');
      return;
    }

    setIsGenerating(true);
    setStreamingContent('');
    setCopied(false);

    try {
      const response = await fetch('/api/report-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outline, reportType, title }),
      });

      if (!response.ok) throw new Error('生成失败');

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
      showToast('报告生成完成', 'success');
    } catch (error) {
      console.error('Generate error:', error);
      showToast('报告生成服务暂时不可用，请稍后重试', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(streamingContent);
    if (success) {
      setCopied(true);
      showToast('已复制到剪贴板', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('复制失败，请手动选择复制', 'error');
    }
  }, [streamingContent, showToast]);

  const handleReset = () => {
    setTitle('');
    setOutline('');
    setStreamingContent('');
    showToast('已重置', 'info');
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
    showToast('已加载示例大纲', 'success');
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  输入报告信息
                </CardTitle>
                <CardDescription>填写报告基本信息，AI 将为您扩写完整内容</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 报告标题 */}
                <div>
                  <Label htmlFor="title" className="text-sm font-medium mb-2 block">报告标题（可选）</Label>
                  <Input
                    id="title"
                    placeholder="例如：2026年中国新能源汽车行业发展研究报告"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                {/* 报告类型 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">报告类型</Label>
                  <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
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
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="outline" className="text-sm font-medium">报告大纲</Label>
                    <Button variant="ghost" size="sm" onClick={handleSampleOutline} className="text-xs h-7" disabled={isGenerating}>
                      📋 使用示例大纲
                    </Button>
                  </div>
                  <div className="relative">
                    <Textarea
                      id="outline"
                      placeholder={`请输入报告大纲，格式示例：
一、执行摘要
二、行业概述
  （一）行业定义与分类
  （二）行业发展历程
三、市场现状分析
...`}
                      value={outline}
                      onChange={(e) => setOutline(e.target.value)}
                      className="min-h-[300px] font-mono text-sm resize-none"
                      disabled={isGenerating}
                    />
                    <div className="absolute bottom-3 right-3">
                      <CharCount current={outline.length} />
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3">
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
                  <Button variant="outline" onClick={handleReset} disabled={isGenerating}>
                    重置
                  </Button>
                </div>

                {/* 快捷键提示 */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Keyboard className="h-3 w-3" />
                  <span>按 <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> 快速提交</span>
                </div>
              </CardContent>
            </Card>

            {/* 报告类型说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">报告类型说明</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: '📄', name: '综合性咨询报告', desc: '适用于综合性研究项目', color: 'text-gray-600' },
                  { icon: '📋', name: '政策研究报告', desc: '注重政策梳理与影响分析', color: 'text-blue-600' },
                  { icon: '📊', name: '市场分析报告', desc: '聚焦市场与竞争格局分析', color: 'text-purple-600' },
                  { icon: '🔍', name: '投资尽调报告', desc: '侧重企业评估与风险分析', color: 'text-amber-600' },
                ].map((item) => (
                  <div key={item.name} className="flex items-start gap-2">
                    <span className={item.color}>{item.icon}</span>
                    <div>
                      <span className="font-medium text-sm">{item.name}</span>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：输出区域 */}
          <div className="space-y-6">
            {/* 输出区域 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-green-600" />
                        生成中...
                      </>
                    ) : streamingContent ? (
                      <>
                        <FileText className="h-4 w-4 text-green-600" />
                        生成结果
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        生成结果
                      </>
                    )}
                  </CardTitle>
                  {streamingContent && !isGenerating && (
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          复制全文
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="min-h-[500px] rounded-lg bg-muted/50 p-4 text-sm whitespace-pre-wrap leading-relaxed overflow-auto max-h-[600px]">
                  {streamingContent || (
                    <span className="text-muted-foreground/70">
                      在左侧输入大纲后，点击「开始生成」
                      <br />
                      AI 将为您扩写完整的报告内容...
                    </span>
                  )}
                  {isGenerating && <span className="animate-pulse">▋</span>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
