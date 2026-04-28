'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileCheck, AlertTriangle, CheckCircle, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Issue = {
  id: number;
  category: string;
  location: string;
  problem: string;
  suggestion: string;
};

type CheckResult = {
  status: 'pass' | 'fail';
  totalIssues: number;
  mode: string;
  issues: Issue[];
  summary: string;
  rawResponse?: string;
};

export default function DocumentCheckPage() {
  const [content, setContent] = useState('');
  const [mode, setMode] = useState('both');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const handleCheck = async () => {
    if (!content.trim()) {
      alert('请输入需要检查的文档内容');
      return;
    }

    setIsChecking(true);
    setIsStreaming(true);
    setResult(null);
    setStreamingContent('');

    try {
      const response = await fetch('/api/document-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, mode }),
      });

      if (!response.ok) {
        throw new Error('检查失败');
      }

      // 流式读取响应
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

      // 尝试解析JSON响应
      try {
        // 提取JSON（可能在流式内容中）
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setResult({
            ...parsed,
            rawResponse: fullContent,
          });
        } else {
          // 如果无法解析，返回原始内容
          setResult({
            status: 'fail',
            totalIssues: 0,
            mode: 'unknown',
            issues: [],
            summary: '无法解析响应结果，请查看原始输出',
            rawResponse: fullContent,
          });
        }
      } catch (parseError) {
        // JSON解析失败，显示原始内容
        setResult({
          status: 'fail',
          totalIssues: 0,
          mode: 'unknown',
          issues: [],
          summary: '响应格式异常，以下是原始输出：',
          rawResponse: fullContent,
        });
      }
    } catch (error) {
      console.error('Check error:', error);
      alert('文档校验服务暂时不可用，请稍后重试');
    } finally {
      setIsChecking(false);
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    setContent('');
    setResult(null);
    setStreamingContent('');
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      '标题': '📋',
      '发文字号': '📝',
      '主送机关': '🏢',
      '正文结构': '📄',
      '附件格式': '📎',
      '落款格式': '✍️',
      '字体字号': '🔤',
      '标点符号': '⚡',
      '段落格式': '📏',
      '表格规范': '📊',
      '列表格式': '📑',
      '其他': '💡',
    };
    return icons[category] || '💡';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold">文档格式校验</h1>
                <p className="text-xs text-muted-foreground">符合 GB/T 9704-2012 国家标准</p>
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
                输入文档内容
              </h2>

              {/* 模式选择 */}
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">校验模式</Label>
                <RadioGroup
                  value={mode}
                  onValueChange={setMode}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both" className="text-sm cursor-pointer">党政公文 + 商务文档</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="official" id="official" />
                    <Label htmlFor="official" className="text-sm cursor-pointer">仅党政公文</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="business" id="business" />
                    <Label htmlFor="business" className="text-sm cursor-pointer">仅商务文档</Label>
                  </div>
                </RadioGroup>
              </div>

              <Textarea
                placeholder="请粘贴需要校验的文档内容..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
              />

              <div className="mt-4 flex gap-3">
                <Button
                  onClick={handleCheck}
                  disabled={isChecking || !content.trim()}
                  className="flex-1"
                >
                  {isChecking ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      校验中...
                    </>
                  ) : (
                    <>
                      <FileCheck className="mr-2 h-4 w-4" />
                      开始校验
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isChecking}
                >
                  重置
                </Button>
              </div>
            </div>

            {/* 检查维度说明 */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-muted-foreground">检查维度</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-primary">📋</span> 标题格式
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">📝</span> 发文字号
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">🏢</span> 主送机关
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">📄</span> 正文结构
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">📎</span> 附件格式
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">✍️</span> 落款格式
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">🔤</span> 字体字号
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary">⚡</span> 标点符号
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：结果区域 */}
          <div className="space-y-6">
            {/* 流式输出区域 */}
            {(isStreaming || streamingContent) && (
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                  {isStreaming ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                      AI 校验中...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-primary" />
                      校验结果
                    </>
                  )}
                </h2>
                <div className="min-h-[200px] rounded-lg bg-muted/50 p-4 font-mono text-sm whitespace-pre-wrap">
                  {streamingContent || '等待输入...' }
                  {isStreaming && <span className="animate-pulse">▋</span>}
                </div>
              </div>
            )}

            {/* 解析后的结构化结果 */}
            {result && (
              <div className="space-y-4">
                {/* 状态概览 */}
                <div className={`rounded-2xl border p-6 shadow-sm ${
                  result.status === 'pass' 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                    : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                }`}>
                  <div className="flex items-center gap-4">
                    {result.status === 'pass' ? (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                        <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-2xl font-bold">
                        {result.status === 'pass' ? '✅ 校验通过' : '⚠️ 需修改'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        发现 <span className="font-semibold text-foreground">{result.totalIssues}</span> 处问题
                        · 模式：{result.mode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 问题详情 */}
                {result.issues && result.issues.length > 0 && (
                  <div className="rounded-2xl border bg-card p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-semibold">🔍 问题详情</h3>
                    <div className="space-y-4">
                      {result.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className="rounded-lg border bg-background p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{getCategoryIcon(issue.category)}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                  {issue.category}
                                </span>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="font-medium text-muted-foreground">📍 位置：</span>
                                  <span>{issue.location}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground">❌ 问题：</span>
                                  <span className="text-destructive">{issue.problem}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground">✅ 建议：</span>
                                  <span className="text-green-600 dark:text-green-400">{issue.suggestion}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 总结 */}
                {result.summary && (
                  <div className="rounded-2xl border bg-card p-6 shadow-sm">
                    <h3 className="mb-3 text-lg font-semibold">💡 总结</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {result.summary}
                    </p>
                  </div>
                )}

                {/* 原始响应（如果有） */}
                {result.rawResponse && result.issues.length === 0 && (
                  <div className="rounded-2xl border bg-card p-6 shadow-sm">
                    <h3 className="mb-3 text-lg font-semibold">📄 原始响应</h3>
                    <pre className="max-h-[400px] overflow-auto rounded-lg bg-muted p-4 text-xs whitespace-pre-wrap">
                      {result.rawResponse}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* 空状态 */}
            {!result && !isStreaming && (
              <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/50">
                <FileCheck className="mb-4 h-16 w-16 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">等待文档输入</p>
                <p className="mt-1 text-sm text-muted-foreground/70">
                  在左侧输入文档内容，点击「开始校验」
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
