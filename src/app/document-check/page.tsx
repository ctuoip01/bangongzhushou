'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileCheck, AlertTriangle, CheckCircle, Sparkles, RefreshCw, Clipboard, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CharCount } from '@/components/char-count';
import { useToast } from '@/components/toast';
import { ListSkeleton } from '@/components/skeleton';
import { DocumentCheckResult, CheckMode } from '@/types';
import { getCategoryIcon } from '@/lib/utils';

export default function DocumentCheckPage() {
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<CheckMode>('both');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<DocumentCheckResult | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const { showToast } = useToast();

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (content.trim() && !isChecking) {
          handleCheck();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, isChecking]);

  // 粘贴功能
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setContent(text);
      showToast('已粘贴剪贴板内容', 'success');
    } catch {
      showToast('无法访问剪贴板，请手动粘贴', 'error');
    }
  }, [showToast]);

  const handleCheck = async () => {
    if (!content.trim()) {
      showToast('请输入需要检查的文档内容', 'error');
      return;
    }

    setIsChecking(true);
    setIsStreaming(true);
    setResult(null);
    setStreamingContent('');

    try {
      const response = await fetch('/api/document-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mode }),
      });

      if (!response.ok) {
        throw new Error('检查失败');
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

      // 解析JSON响应
      const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          setResult({ ...parsed, rawResponse: fullContent });
          showToast(parsed.status === 'pass' ? '文档校验通过！' : `发现 ${parsed.totalIssues} 处问题`, 'success');
        } catch {
          setResult({
            status: 'fail',
            totalIssues: 0,
            mode: 'unknown',
            issues: [],
            summary: '响应格式异常',
            rawResponse: fullContent,
          });
        }
      } else {
        setResult({
          status: 'fail',
          totalIssues: 0,
          mode: 'unknown',
          issues: [],
          summary: '无法解析响应结果',
          rawResponse: fullContent,
        });
      }
    } catch (error) {
      console.error('Check error:', error);
      showToast('文档校验服务暂时不可用，请稍后重试', 'error');
    } finally {
      setIsChecking(false);
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    setContent('');
    setResult(null);
    setStreamingContent('');
    showToast('已重置', 'info');
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  输入文档内容
                </CardTitle>
                <CardDescription>粘贴或输入需要校验的文档内容</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 模式选择 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">校验模式</Label>
                  <RadioGroup
                    value={mode}
                    onValueChange={(v) => setMode(v as CheckMode)}
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

                {/* 文本输入 */}
                <div className="relative">
                  <Textarea
                    placeholder="请粘贴需要校验的文档内容..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[350px] font-mono text-sm resize-none"
                    disabled={isChecking}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <CharCount current={content.length} />
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3">
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
                    onClick={handlePaste}
                    disabled={isChecking}
                    title="粘贴剪贴板内容"
                  >
                    <Clipboard className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={isChecking}
                  >
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

            {/* 检查维度说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-muted-foreground">检查维度</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { icon: '📋', name: '标题格式' },
                    { icon: '📝', name: '发文字号' },
                    { icon: '🏢', name: '主送机关' },
                    { icon: '📄', name: '正文结构' },
                    { icon: '📎', name: '附件格式' },
                    { icon: '✍️', name: '落款格式' },
                    { icon: '🔤', name: '字体字号' },
                    { icon: '⚡', name: '标点符号' },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：结果区域 */}
          <div className="space-y-6">
            {/* 流式输出区域 */}
            {(isStreaming || streamingContent) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {isStreaming ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                        AI 校验中...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        校验结果
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[200px] rounded-lg bg-muted/50 p-4 font-mono text-sm whitespace-pre-wrap max-h-[400px] overflow-auto">
                    {streamingContent || '等待输入...' }
                    {isStreaming && <span className="animate-pulse">▋</span>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 加载骨架屏 */}
            {isChecking && !streamingContent && <ListSkeleton count={3} />}

            {/* 结构化结果 */}
            {result && !isStreaming && (
              <div className="space-y-4">
                {/* 状态概览 */}
                <Card className={
                  result.status === 'pass' 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                    : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                }>
                  <CardContent className="pt-6">
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
                          {result.status === 'pass' ? '校验通过' : '需修改'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          发现 <span className="font-semibold text-foreground">{result.totalIssues}</span> 处问题
                          · 模式：{result.mode}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 问题详情 */}
                {result.issues && result.issues.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>🔍 问题详情</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {result.issues.map((issue) => (
                        <div key={issue.id} className="rounded-lg border bg-background p-4">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{getCategoryIcon(issue.category)}</span>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                  {issue.category}
                                </span>
                              </div>
                              <div className="space-y-1 text-sm">
                                <div>
                                  <span className="font-medium text-muted-foreground">📍 位置：</span>
                                  <span>{issue.location}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-muted-foreground">❌ 问题：</span>
                                  <span className="text-red-600 dark:text-red-400">{issue.problem}</span>
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
                    </CardContent>
                  </Card>
                )}

                {/* 总结 */}
                {result.summary && (
                  <Card>
                    <CardHeader>
                      <CardTitle>💡 总结</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {result.summary}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* 空状态 */}
            {!result && !isStreaming && !isChecking && (
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
