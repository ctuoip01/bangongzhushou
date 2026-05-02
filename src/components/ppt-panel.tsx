'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Upload, FileText, Download, Presentation, Sparkles, Loader2, ChevronRight, CheckCircle2, Eye, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useStreamFetch } from '@/hooks/use-stream-fetch';
import type { Slide, SlideLayout, PptStyle, PptOutline } from '@/types';
import { cn } from '@/lib/utils';

interface PptPanelProps {
  moduleId: string;
}

const STYLE_OPTIONS: { value: PptStyle; label: string; desc: string; colors: string; icon: string }[] = [
  {
    value: 'academic', label: '学术专业', desc: '蓝白配色 · 简洁大方 · 适合研究报告/方案分析',
    colors: '#1e40af / #dbeafe / #f0f9ff',
    icon: '🎓',
  },
  {
    value: 'formal', label: '正式商务', desc: '深灰蓝色系 · 稳重专业 · 适合政府汇报/企业汇报',
    colors: '#334155 / #f1f5f9 / #ffffff',
    icon: '💼',
  },
  {
    value: 'creative', label: '创意活力', desc: '多彩渐变 · 活力现代 · 适合产品发布/团队展示',
    colors: '#7c3aed / #fae8ff / #fdf4ff',
    icon: '🎨',
  },
];

const LAYOUT_LABELS: Record<SlideLayout, string> = {
  title: '封面页',
  content: '内容页',
  'two-column': '双栏布局',
  chart: '图表页',
  closing: '结束页',
};

const LAYOUT_ICONS: Record<SlideLayout, string> = {
  title: '📑',
  content: '📄',
  'two-column': '📊',
  chart: '📈',
  closing: '✅',
};

export function PptPanel({ moduleId }: PptPanelProps) {
  const [content, setContent] = useState('');
  const [style, setStyle] = useState<PptStyle>('academic');
  const [pptTitle, setPptTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [outline, setOutline] = useState<PptOutline | null>(null);
  const [rawStream, setRawStream] = useState('');
  const [activeStep, setActiveStep] = useState<'input' | 'preview' | 'download'>('input');

  // 第一步：调用 LLM 生成大纲（使用统一 SSE 协议）
  const { execute: executeGenerate, isLoading: isGeneratingStream, abort: abortGenerate } = useStreamFetch({
    protocol: 'sse',
    onChunk: (text) => {
      setRawStream(prev => {
        const updated = prev + text;
        // 实时尝试解析 JSON 大纲
        try {
          const jsonStart = updated.indexOf('{');
          const jsonEnd = updated.lastIndexOf('}');
          if (jsonStart >= 0 && jsonEnd > jsonStart) {
            const candidate = updated.slice(jsonStart, jsonEnd + 1);
            const parsed = JSON.parse(candidate) as PptOutline;
            if (parsed.slides && Array.isArray(parsed.slides)) {
              setOutline(parsed);
            }
          }
        } catch { /* JSON 不完整 */ }
        return updated;
      });
    },
    onDone: () => {
      // 尝试最终解析
      const raw = rawStreamRef.current;
      if (!outline) {
        try {
          const jsonStart = raw.indexOf('{');
          const jsonEnd = raw.lastIndexOf('}');
          if (jsonStart >= 0 && jsonEnd > jsonStart) {
            setOutline(JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as PptOutline);
          }
        } catch { /* 解析失败 */ }
      }
      setGenerating(false);
    },
    onError: (err) => console.error('生成PPT大纲失败:', err),
  });

  // 保存 rawStream 引供 onChunk 使用
  const rawStreamRef = useRef('');

  // 第一步：调用 LLM 生成大纲
  const handleGenerate = useCallback(async () => {
    const trimmed = content.trim();
    if (!trimmed || generating) return;

    setGenerating(true);
    setActiveStep('preview');
    setOutline(null);
    setRawStream('');
    rawStreamRef.current = '';

    await executeGenerate('/api/ppt-helper', {
      content: trimmed,
      pptTitle: pptTitle.trim() || undefined,
      style,
    });
  }, [content, pptTitle, style, generating, executeGenerate]);

  // 第二步：调用渲染 API 生成 .pptx 文件
  const handleDownload = useCallback(async () => {
    if (!outline || building) return;

    setBuilding(true);
    setActiveStep('download');
    setBuildProgress(0);

    // 模拟进度更新
    const progressInterval = setInterval(() => {
      setBuildProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const response = await fetch('/api/ppt-helper/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outline, style }),
      });

      if (!response.ok) throw new Error('构建失败');

      clearInterval(progressInterval);
      setBuildProgress(100);

      // 触发下载
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${outline.title || '演示文稿'}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('构建PPTX失败:', err);
    } finally {
      setTimeout(() => {
        setBuilding(false);
        clearInterval(progressInterval);
        setBuildProgress(0);
      }, 1500);
    }
  }, [outline, style, building]);

  // 处理文件上传
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 读取文件内容
    const text = await file.text();
    setContent(text);
  }, []);

  const slideCount = outline?.slides?.length || 0;
  const currentStyle = STYLE_OPTIONS.find(s => s.value === style)!;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 p-4 lg:p-6">
      {/* 步骤指示器 */}
      <div className="flex items-center gap-2 shrink-0">
        {[
          { step: 'input' as const, label: '输入内容', num: 1 },
          { step: 'preview' as const, label: '预览大纲', num: 2 },
          { step: 'download' as const, label: '下载PPT', num: 3 },
        ].map(({ step, label, num }, i) => (
          <React.Fragment key={step}>
            <button
              onClick={() => {
                if (step === 'input' || (step === 'preview' && outline) || (step === 'download' && outline)) {
                  setActiveStep(step);
                }
              }}
              disabled={(step === 'preview' && !outline && activeStep !== 'preview') || (step === 'download' && !outline)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                activeStep === step
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : outline && ['preview', 'download'].includes(step)
                    ? "bg-secondary text-secondary-foreground cursor-pointer hover:bg-secondary/80"
                    : "text-muted-foreground cursor-default"
              )}
            >
              <span className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold",
                activeStep === step ? "bg-primary-foreground text-primary" :
                (step === 'download' && building) ? "bg-green-500 text-white" :
                outline && num <= (activeStep === 'download' ? 3 : activeStep === 'preview' ? 2 : 1)
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground"
              )}>
                {(step === 'download' && building) ? <CheckCircle2 className="h-3 w-3" /> : num}
              </span>
              {label}
            </button>
            {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
          </React.Fragment>
        ))}
      </div>

      {/* 步骤1：输入内容 */}
      {activeStep === 'input' && (
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* 左侧：输入区 */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-base">输入报告内容</CardTitle>
                <CardDescription className="text-xs">
                  粘贴报告文本或上传文档，AI将自动转换为结构化PPT大纲
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
                {/* 标题输入 */}
                <Input
                  value={pptTitle}
                  onChange={(e) => setPptTitle(e.target.value)}
                  placeholder="PPT标题（可选）"
                  className="h-9 text-sm"
                />

                {/* 内容输入 */}
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`请输入报告内容...\n\n例如：\n# 2024年人工智能行业发展报告\n\n## 一、行业概况\n全球AI市场规模持续增长...\n\n## 二、技术趋势\n大模型能力快速提升...`}
                  className="flex-1 resize-none text-sm font-mono leading-relaxed"
                />

                {/* 底部操作栏 */}
                <div className="flex items-center justify-between pt-2 shrink-0">
                  <label className="cursor-pointer">
                    <input type="file" accept=".txt,.md,.doc,.docx" className="hidden" onChange={handleFileUpload} />
                    <Button variant="outline" size="sm" type="button" className="gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      上传文档
                    </Button>
                  </label>
                  <Button onClick={handleGenerate} disabled={!content.trim() || generating} className="gap-1.5">
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    生成大纲
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：风格选择 */}
          <div className="w-[320px] shrink-0">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">选择风格</CardTitle>
                <CardDescription className="text-xs">不同风格会影响配色方案和版式布局</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStyle(opt.value)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border-2 transition-all",
                      style === opt.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-transparent bg-muted/50 hover:bg-muted hover:border-border"
                    )}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="text-lg">{opt.icon}</span>
                      <span className="font-medium text-sm">{opt.label}</span>
                      {style === opt.value && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">{opt.desc}</p>
                    {/* 配色预览条 */}
                    <div className="flex gap-1 mt-2 pl-8">
                      {opt.colors.split(' / ').map((c, i) => (
                        <div key={i} className="w-6 h-3 rounded-sm border border-black/10" style={{ backgroundColor: c.split('/')[0].trim() }} />
                      ))}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 步骤2：预览大纲 */}
      {activeStep === 'preview' && outline && (
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* 幻灯片缩略图列表 */}
          <ScrollArea className="flex-1 rounded-xl border bg-card">
            <div className="p-4">
              {/* 大纲头部信息 */}
              <div className="mb-4 pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-base">{outline.title || '未命名演示文稿'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {currentStyle.icon} {currentStyle.label}风格
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        共 {slideCount} 页幻灯片
                      </span>
                      <span className="text-xs text-muted-foreground">
                        主题：{outline.theme || '默认'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setActiveStep('input')} className="gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      修改内容
                    </Button>
                    <Button onClick={handleDownload} disabled={building} className="gap-1.5">
                      {building ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      生成并下载 PPTX
                    </Button>
                  </div>
                </div>
              </div>

              {/* 幻灯片网格 */}
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {outline.slides.map((slide, idx) => (
                  <Card key={idx} className="overflow-hidden group hover:shadow-md transition-shadow cursor-pointer">
                    {/* 缩略图模拟 */}
                    <div className={cn(
                      "relative h-28 p-3 flex flex-col justify-between",
                      slide.layout === 'title' && "bg-gradient-to-b from-slate-800 to-slate-900 text-white",
                      slide.layout === 'closing' && "bg-gradient-to-b from-blue-900 to-indigo-950 text-white",
                      slide.layout !== 'title' && slide.layout !== 'closing' && "bg-white"
                    )}>
                      {/* 页码角标 */}
                      <div className={cn(
                        "absolute top-2 right-2 text-[10px] font-mono opacity-50",
                        slide.layout === 'title' || slide.layout === 'closing' ? "text-white/50" : "text-gray-400"
                      )}>
                        #{slide.page}
                      </div>

                      {/* 布局标签 */}
                      <Badge variant="outline" className={cn(
                        "absolute top-2 left-2 text-[9px] px-1 py-0 h-4",
                        slide.layout === 'title' || slide.layout === 'closing'
                          ? "border-white/20 text-white/70 bg-white/5"
                          : "border-gray-200 text-gray-500 bg-gray-50"
                      )}>
                        {LAYOUT_ICONS[slide.layout]} {LAYOUT_LABELS[slide.layout]}
                      </Badge>

                      {/* 标题 */}
                      <h4 className={cn(
                        "text-xs font-semibold leading-tight mt-4 line-clamp-2",
                        slide.layout === 'title' || slide.layout === 'closing'
                          ? "text-white"
                          : "text-gray-800"
                      )}>
                        {slide.title}
                      </h4>

                      {/* 内容要点 */}
                      <ul className="mt-1.5 space-y-0.5">
                        {slide.content.slice(0, 3).map((point, pi) => (
                          <li key={pi} className={cn(
                            "text-[10px] leading-tight line-clamp-1",
                            slide.layout === 'title' || slide.layout === 'closing'
                              ? "text-white/70"
                              : "text-gray-500"
                          )}>
                            · {point}
                          </li>
                        ))}
                        {slide.content.length > 3 && (
                          <li className={cn(
                            "text-[10px]",
                            slide.layout === 'title' || slide.layout === 'closing'
                              ? "text-white/50"
                              : "text-gray-400"
                          )}>
                            +{slide.content.length - 3} 更多要点
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* 卡片底部 */}
                    <div className="p-2.5 border-t bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Page {slide.page}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {slide.content.length} 个要点
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>

          {/* 右侧：当前选中详情 */}
          <div className="w-[340px] shrink-0 flex flex-col gap-3">
            <Card className="flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Presentation className="h-4 w-4" />
                  大纲详情
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {outline.slides.map((slide, idx) => (
                      <div key={idx} className="space-y-1.5 pb-3 border-b last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                            {LAYOUT_ICONS[slide.layout]} {LAYOUT_LABELS[slide.layout]}
                          </Badge>
                          <span className="text-[10px] font-mono text-muted-foreground">#{slide.page}</span>
                        </div>
                        <h4 className="text-sm font-medium">{slide.title}</h4>
                        <ul className="space-y-0.5 pl-2">
                          {slide.content.map((point, pi) => (
                            <li key={pi} className="text-xs text-muted-foreground flex gap-1.5">
                              <span className="text-primary/50 mt-0.5">·</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                        {slide.notes && (
                          <p className="text-[10px] text-muted-foreground italic mt-1 pl-3 border-l-2 border-dashed border-muted">
                            备注：{slide.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 步骤2：正在生成（无outline时） */}
      {activeStep === 'preview' && generating && !outline && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <p className="font-medium">AI 正在设计 PPT 大纲</p>
              <p className="text-sm text-muted-foreground mt-1">基于您的报告内容，正在规划页面结构与核心要点...</p>
            </div>
            {rawStream && (
              <div className="text-left bg-muted/50 rounded-lg p-3 max-h-32 overflow-hidden">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all font-mono max-h-24 overflow-hidden">
                  {rawStream}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 步骤3：下载中 */}
      {activeStep === 'download' && building && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
              <FileDown className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <p className="font-medium">正在构建 PPTX 文件</p>
              <p className="text-sm text-muted-foreground mt-1">应用{currentStyle.label}风格，渲染{slideCount}页幻灯片...</p>
            </div>
            <div className="space-y-2 max-w-xs mx-auto">
              <Progress value={buildProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{Math.round(buildProgress)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* 步骤3：完成 */}
      {activeStep === 'download' && !building && buildProgress === 100 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-lg">PPTX 文件已生成</p>
              <p className="text-sm text-muted-foreground mt-1">
                &laquo;{outline?.title || '演示文稿'}&raquo; 已开始下载
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setActiveStep('preview')} className="gap-1.5">
                <Eye className="h-4 w-4" />
                返回预览
              </Button>
              <Button onClick={handleDownload} className="gap-1.5">
                <Download className="h-4 w-4" />
                重新下载
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
