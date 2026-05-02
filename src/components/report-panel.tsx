'use client';

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  FileText, Download, Sparkles, Loader2, ChevronRight, CheckCircle2,
  Eye, Plus, Trash2, GripVertical, ArrowLeft, BookOpen,
  RefreshCcw, FileDown, Copy, Edit3, Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type {
  ReportTemplate, ChapterTemplate, CoverField,
  ReportChapter, ReportBuildInput,
} from '@/lib/report-engine';
import {
  REPORT_TEMPLATES, getTemplate, buildReportDocx,
} from '@/lib/report-engine';
import { cn } from '@/lib/utils';
import { readSseEvents } from '@/lib/sse-parser';
import { ReportTemplateSelector } from './report-template-selector';
import { ReportCoverEditor } from './report-cover-editor';
import { ReportGeneratedPreview, type GeneratedChapter } from './report-generated-preview';

interface ReportPanelProps {
  moduleId: string;
}

type ActiveStep = 'template' | 'outline' | 'generate' | 'preview' | 'download';

export function ReportPanel({ moduleId }: ReportPanelProps) {
  // 步骤状态
  const [step, setStep] = useState<ActiveStep>('template');

  // 模板与封面
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('comprehensive');
  const [coverData, setCoverData] = useState<Record<string, string>>({});
  const [customChapters, setCustomChapters] = useState<ChapterTemplate[]>([]);

  // 生成状态
  const [generatedChapters, setGeneratedChapters] = useState<GeneratedChapter[]>([]);
  const [currentGeneratingIdx, setCurrentGeneratingIdx] = useState(-1);
  const [currentPhase, setCurrentPhase] = useState('准备中...');
  const [generating, setGenerating] = useState(false);
  const [buildingDocx, setBuildingDocx] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const selectedTemplate = useMemo(() =>
    getTemplate(selectedTemplateId), [selectedTemplateId]);

  const activeChapters = customChapters.length > 0
    ? customChapters
    : selectedTemplate?.chapters || [];

  // 初始化封面默认值
  React.useEffect(() => {
    if (selectedTemplate && Object.keys(coverData).length === 0) {
      const defaults: Record<string, string> = {};
      for (const field of selectedTemplate.coverFields) {
        const dv = field.defaultValue;
        defaults[field.key] = typeof dv === 'function' ? dv() : (dv || '');
      }
      setCoverData(defaults);
    }
  }, [selectedTemplate]);

  // ---- Step 1: 选择模板 ----
  const handleSelectTemplate = useCallback((id: string) => {
    setSelectedTemplateId(id);
    setCustomChapters([]);
  }, []);

  const handleConfirmTemplate = useCallback(() => {
    setStep('outline');
  }, []);

  // ---- Step 2: 编辑大纲/封面 ----
  const handleCoverChange = useCallback((key: string, value: string) => {
    setCoverData(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleAddChapter = useCallback(() => {
    const newCh: ChapterTemplate = {
      id: `custom-${Date.now()}`,
      title: '新章节',
      level: 1,
      required: true,
      suggestedWords: 1000,
      placeholder: '章节内容...',
      writingGuide: '撰写此章节的专业内容。',
    };
    setCustomChapters(prev => [...prev, newCh]);
  }, []);

  const handleRemoveChapter = useCallback((id: string) => {
    setCustomChapters(prev => prev.filter(c => c.id !== id));
  }, []);

  const handleChapterUpdate = useCallback((id: string, field: keyof ChapterTemplate, value: unknown) => {
    setCustomChapters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }, []);

  const handleReorderChapter = useCallback((idx: number, dir: 'up' | 'down') => {
    setCustomChapters(prev => {
      const arr = [...prev];
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= arr.length) return prev;
      [arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]];
      return arr;
    });
  }, []);

  // ---- Step 3: 分章生成 ----
  const handleStartGenerate = useCallback(async () => {
    if (generating) return;

    setGenerating(true);
    setStep('generate');

    // 初始化所有章节为 pending
    const initial: GeneratedChapter[] = activeChapters.map(ch => ({
      id: ch.id, title: ch.title, level: ch.level,
      content: '', status: 'pending' as const, charCount: 0,
    }));
    setGeneratedChapters(initial);
    setCurrentGeneratingIdx(0);

    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/report-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'full',
          templateId: selectedTemplateId,
          chapters: activeChapters.map(ch => ({
            id: ch.id, title: ch.title, level: ch.level,
            writingGuide: ch.writingGuide, suggestedWords: ch.suggestedWords,
          })),
          title: coverData['title'] || '未命名报告',
          coverData,
          globalContext: `报告类型：${selectedTemplate?.name}；主题：${coverData['title'] || '未命名'}；编制单位：${coverData['organization'] || ''}`,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error('请求失败');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      let currentChIdx = 0;
      let chapterContentMap: Record<string, string> = {};

      for await (const { event, data } of readSseEvents(reader, abortRef.current.signal)) {
        if (event === 'chapter') {
          // 章节开始事件
          const meta = data as { num?: number; total?: number; id?: string; title?: string };
          if (meta.num != null) currentChIdx = meta.num - 1;
          setCurrentGeneratingIdx(currentChIdx);

          // 标记上一章完成
          setGeneratedChapters(prev => prev.map((ch, i) =>
            i < currentChIdx ? { ...ch, status: 'done' as const } : ch
          ));

          chapterContentMap[meta.id || String(currentChIdx)] = '';
        } else if (event === 'progress') {
          // 进度更新（可用于显示当前章节信息）
          const progress = data as { phase?: string };
          if (progress.phase) {
            setCurrentPhase(progress.phase);
          }
        } else if (event === 'content' || event === 'raw') {
          // 正文内容片段 — 追加到当前章节
          const text = typeof data === 'string' ? data : '';
          const currentChId = activeChapters[currentChIdx]?.id || String(currentChIdx);
          chapterContentMap[currentChId] = (chapterContentMap[currentChId] || '') + text;

          setGeneratedChapters(prev => {
            const updated = [...prev];
            if (updated[currentChIdx]) {
              updated[currentChIdx] = {
                ...updated[currentChIdx],
                content: chapterContentMap[currentChId],
                status: 'generating' as const,
                charCount: chapterContentMap[currentChId].length,
              };
            }
            return updated;
          });
        } else if (event === 'error') {
          // 单章错误（可恢复）
          console.warn('章节生成警告:', data);
        } else if (event === 'done') {
          break;
        }
      }

      // 标记全部完成
      setGeneratedChapters(prev => prev.map(ch =>
        ch.status === 'pending' ? { ...ch, status: 'done' as const } :
        ch.status === 'generating' ? { ...ch, status: 'done' as const } : ch
      ));
      setCurrentGeneratingIdx(-1);
      setCurrentPhase('全部章节生成完成');

    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('报告生成失败:', err);
      }
    } finally {
      setGenerating(false);
    }
  }, [generating, activeChapters, selectedTemplateId, selectedTemplate, coverData, generatedChapters.length]);

  // 单章重新生成
  const handleRegenChapter = useCallback(async (idx: number) => {
    const ch = activeChapters[idx];
    if (!ch || generating) return;

    setGeneratedChapters(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], status: 'generating', content: '' };
      return updated;
    });
    setCurrentGeneratingIdx(idx);

    try {
      // 收集前文作为上下文
      let context = '';
      for (let i = 0; i < idx; i++) {
        if (generatedChapters[i]?.content) {
          context += `\n${generatedChapters[i].title}:\n${generatedChapters[i].content.slice(-500)}\n`;
        }
      }

      const response = await fetch('/api/report-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'chapter',
          chapterId: ch.id,
          chapterTitle: ch.title,
          chapterLevel: ch.level,
          writingGuide: ch.writingGuide,
          suggestedWords: ch.suggestedWords,
          globalContext: context,
        }),
      });

      if (!response.ok) throw new Error('单章生成失败');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });

        setGeneratedChapters(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            updated[idx] = { ...updated[idx], content, status: 'generating', charCount: content.length };
          }
          return updated;
        });
      }

      setGeneratedChapters(prev => {
        const updated = [...prev];
        if (updated[idx]) {
          updated[idx] = { ...updated[idx], status: 'done' as const, charCount: content.length };
        }
        return updated;
      });

    } catch (err) {
      console.error(`章节 "${ch.title}" 重生成失败:`, err);
      setGeneratedChapters(prev => {
        const updated = [...prev];
        if (updated[idx]) updated[idx] = { ...updated[idx], status: 'error' as const };
        return updated;
      });
    } finally {
      setCurrentGeneratingIdx(-1);
    }
  }, [activeChapters, generating, generatedChapters]);

  // ---- 导出 DOCX ----
  const handleExportDocx = useCallback(async () => {
    if (buildingDocx) return;
    setBuildingDocx(true);
    setBuildProgress(0);

    const progressInterval = setInterval(() => {
      setBuildProgress(p => Math.min(p + 8 + Math.random() * 12, 90));
    }, 300);

    try {
      const reportChapters: ReportChapter[] = generatedChapters
        .filter(ch => ch.status === 'done' && ch.content)
        .map(ch => ({ id: ch.id, title: ch.title, level: ch.level, content: ch.content }));

      const buildInput: ReportBuildInput = {
        title: coverData['title'] || '未命名报告',
        subtitle: coverData['subtitle'],
        organization: coverData['organization'] || '',
        author: coverData['author'],
        date: coverData['date'] || new Date().toLocaleDateString('zh-CN'),
        chapters: reportChapters,
      };

      const buffer = await buildReportDocx(buildInput);

      clearInterval(progressInterval);
      setBuildProgress(100);

      const blob = new Blob([new Uint8Array(buffer)], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${buildInput.title}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('DOCX 导出失败:', err);
    } finally {
      setTimeout(() => {
        setBuildingDocx(false);
        clearInterval(progressInterval);
      }, 2000);
    }
  }, [buildingDocx, generatedChapters, coverData]);

  // 复制全文到剪贴板
  const handleCopyAll = useCallback(() => {
    const fullText = generatedChapters
      .filter(ch => ch.status === 'done')
      .map(ch => `# ${ch.title}\n\n${ch.content}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(fullText);
  }, [generatedChapters]);

  // 计算进度
  const doneCount = generatedChapters.filter(c => c.status === 'done').length;
  const totalCount = activeChapters.length;
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  // ===== 渲染 =====

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 p-4 lg:p-6">
      {/* 步骤条 */}
      <div className="flex items-center gap-2 shrink-0">
        {([
          { s: 'template' as const, l: '选择模板', n: 1 },
          { s: 'outline' as const, l: '编辑大纲', n: 2 },
          { s: 'generate' as const, l: '生成报告', n: 3 },
          { s: 'preview' as const, l: '预览导出', n: 4 },
        ]).map(({ s, l, n }, i) => (
          <React.Fragment key={s}>
            <button onClick={() => {
              if (s === 'template' || (s === 'outline' && step !== 'template') ||
                  (s === 'generate' && ['outline', 'generate', 'preview'].includes(step)) ||
                  (s === 'preview' && step === 'preview')) setStep(s);
            }} disabled={
              (s === 'outline' && step === 'template') ||
              (s === 'generate' && step === 'template') ||
              (s === 'preview' && !generatedChapters.some(c => c.status === 'done'))
            } className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              step === s ? "bg-primary text-primary-foreground shadow-sm" :
              ['outline', 'generate', 'preview'].includes(s) &&
              ['outline', 'generate', 'preview'].includes(step) &&
              (s === 'preview' ? generatedChapters.some(c => c.status === 'done') : true)
                ? "bg-secondary text-secondary-foreground cursor-pointer hover:bg-secondary/80"
                : "text-muted-foreground cursor-default"
            )}>
              <span className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold",
                step === s ? "bg-primary-foreground text-primary" :
                buildingDocx && s === 'preview' ? "bg-green-500 text-white" :
                ['outline', 'generate', 'preview'].includes(step) && n <=
                  (step === 'preview' ? 4 : step === 'generate' ? 3 : step === 'outline' ? 2 : 1)
                  ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
              )}>
                {buildingDocx && s === 'preview' ? <CheckCircle2 className="h-3 w-3" /> : n}
              </span>
              {l}
            </button>
            {i < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
          </React.Fragment>
        ))}
      </div>

      {/* ===== Step 1: 选择模板 ===== */}
      {step === 'template' && (
        <ReportTemplateSelector
          templates={REPORT_TEMPLATES}
          selectedId={selectedTemplateId}
          onSelect={handleSelectTemplate}
          onConfirm={handleConfirmTemplate}
        />
      )}

      {/* ===== Step 2: 编辑大纲 & 封面 ===== */}
      {step === 'outline' && selectedTemplate && (
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* 左侧：封面信息 */}
          <ReportCoverEditor
            fields={selectedTemplate.coverFields}
            data={coverData}
            onChange={handleCoverChange}
          />

          {/* 操作按钮 */}
          <div className="w-[320px] shrink-0 flex items-center justify-between gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setStep('template')} className="gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> 返回选模板
            </Button>
            <Button onClick={() => setStep('generate')} disabled={!coverData['title']} size="sm" className="gap-1">
              开始生成 <Sparkles className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* 右侧：章节大纲 */}
          <ScrollArea className="flex-1 rounded-xl border bg-card">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4" /> 章节大纲
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleAddChapter} className="gap-1 h-7 text-xs">
                    <Plus className="h-3 w-3" /> 添加章节
                  </Button>
                  {customChapters.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setCustomChapters([])} className="h-7 text-xs">
                      还原默认
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {(customChapters.length > 0 ? customChapters : selectedTemplate.chapters).map((ch, idx) => (
                  <Card key={ch.id} className={cn(
                    "transition-all", ch.required && "border-l-2 border-l-green-400"
                  )}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0 cursor-grab" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Input value={ch.title} onChange={(e) =>
                            customChapters.length > 0 ? handleChapterUpdate(ch.id, 'title', e.target.value) : undefined
                          } readOnly={customChapters.length === 0}
                            className={cn("h-7 text-sm font-medium border-none bg-transparent p-0 focus-visible:ring-0 shadow-none",
                              customChapters.length === 0 && "cursor-default")} />
                          {!ch.required && customChapters.length > 0 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                              onClick={() => handleRemoveChapter(ch.id)}>
                              <Trash2 className="h-3 w-3 text-red-400" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant={ch.required ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                            {ch.required ? '必选' : '可选'}
                          </Badge>
                          <span>~{ch.suggestedWords}字</span>
                          {ch.writingGuide && <span className="truncate max-w-[250px]" title={ch.writingGuide}>{ch.writingGuide.slice(0, 40)}...</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-5 w-5"
                          onClick={() => handleReorderChapter(idx, 'up')} disabled={idx === 0}>
                          <ChevronRight className="h-3 w-3 rotate-[-90deg]" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5"
                          onClick={() => handleReorderChapter(idx, 'down')} disabled={idx === (customChapters.length > 0 ? customChapters.length : selectedTemplate.chapters.length) - 1}>
                          <ChevronRight className="h-3 w-3 rotate-90" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ===== Step 3: 生成中 ===== */}
      {step === 'generate' && (
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* 左侧：生成进度 */}
          <Card className="w-[360px] shrink-0 flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Sparkles className="h-4 w-4" />}
                生成进度
              </CardTitle>
              <CardDescription className="text-xs">
                {generating ? `正在生成第 ${currentGeneratingIdx + 1}/${totalCount} 章...` : `共 ${totalCount} 个章节`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 overflow-y-auto">
              <Progress value={progressPct} className="mb-3" />

              {generatedChapters.map((ch, idx) => (
                <div key={ch.id} className={cn(
                  "flex items-center gap-2.5 p-2 rounded-lg border text-sm transition-colors",
                  idx === currentGeneratingIdx && "border-primary bg-primary/5",
                  ch.status === 'done' && "border-green-200 bg-green-50/30",
                  ch.status === 'error' && "border-red-200 bg-red-50/30",
                )}>
                  {ch.status === 'pending' && <div className="h-2 w-2 rounded-full bg-muted" />}
                  {ch.status === 'generating' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                  {ch.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                  {ch.status === 'error' && <div className="h-2 w-2 rounded-full bg-red-500" />}
                  <span className={cn(
                    "flex-1 truncate",
                    ch.status === 'done' ? "text-foreground" : "text-muted-foreground"
                  )}>{ch.title}</span>
                  {ch.status === 'done' && (
                    <span className="text-[10px] text-muted-foreground">{(ch.charCount / 1000).toFixed(1)}k字</span>
                  )}
                  {ch.status === 'done' && !generating && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                      onClick={() => handleRegenChapter(idx)}>
                      <RefreshCcw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}

              <div className="pt-3 space-y-2">
                {!generating && doneCount > 0 && (
                  <>
                    <Button onClick={() => setStep('preview')} className="w-full gap-1.5">
                      <Eye className="h-4 w-4" /> 预览完整报告
                    </Button>
                    <Button onClick={handleExportDocx} variant="outline" className="w-full gap-1.5">
                      <FileDown className="h-4 w-4" /> 直接导出 Word
                    </Button>
                  </>
                )}
                {!generating && doneCount === 0 && (
                  <Button onClick={handleStartGenerate} className="w-full gap-1.5">
                    <Sparkles className="h-4 w-4" /> 开始分章生成
                  </Button>
                )}
                {generating && (
                  <Button variant="destructive" size="sm" onClick={() => {
                    abortRef.current?.abort();
                    setGenerating(false);
                    setCurrentGeneratingIdx(-1);
                  }} className="w-full gap-1.5">
                    停止生成
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 右侧：实时预览当前生成内容 */}
          <ScrollArea className="flex-1 rounded-xl border bg-white">
            <div className="p-6 max-w-3xl mx-auto prose prose-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <h1 className="text-2xl font-bold">{coverData['title'] || '未命名报告'}</h1>
                {coverData['subtitle'] && <p className="text-muted-foreground">{coverData['subtitle']}</p>}
              </div>

              {generatedChapters.length === 0 && (
                <div className="py-20 text-center text-muted-foreground">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>点击"开始分章生成"按钮启动 AI 报告撰写</p>
                </div>
              )}

              {generatedChapters.map((ch, idx) => (
                <div key={ch.id} className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className={cn(
                      "text-lg font-bold",
                      ch.status === 'generating' && "animate-pulse text-primary",
                      ch.status === 'pending' && "text-muted-foreground/40",
                    )}>{ch.title}</h2>
                    {ch.status === 'generating' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {ch.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  </div>
                  {ch.content ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                      {ch.content}
                    </div>
                  ) : ch.status === 'pending' ? (
                    <div className="text-sm text-muted-foreground/50 italic py-4">等待生成...</div>
                  ) : ch.status === 'error' ? (
                    <div className="text-sm text-red-400 italic py-4">生成失败，可点击重试</div>
                  ) : null}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ===== Step 4: 预览 & 导出 ===== */}
      {step === 'preview' && (
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* 工具栏 */}
          <ScrollArea className="flex-1 rounded-xl border bg-white">
            <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{coverData['title'] || '未命名报告'}</h2>
                <Badge variant="secondary" className="text-xs">
                  {doneCount} 章 · {generatedChapters.reduce((sum, ch) => sum + ch.charCount, 0).toLocaleString()} 字
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> 复制全文
                </Button>
                <Button onClick={handleExportDocx} disabled={buildingDocx} size="sm" className="gap-1.5">
                  {buildingDocx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  导出 Word (.docx)
                </Button>
                <Button variant="outline" size="sm" onClick={() => setStep('generate')} className="gap-1.5">
                  <Edit3 className="h-3.5 w-3.5" /> 返回编辑
                </Button>
              </div>
            </div>

            <div className="p-6 max-w-3xl mx-auto prose prose-sm prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3">
              {/* 封面模拟 */}
              <div className="text-center py-12 mb-10 border-b">
                <h1 className="text-3xl font-bold mb-3">{coverData['title'] || '未命名报告'}</h1>
                {coverData['subtitle'] && <p className="text-lg text-muted-foreground">{coverData['subtitle']}</p>}
                <div className="mt-8 space-y-1 text-sm text-muted-foreground">
                  <p>编制单位：{coverData['organization'] || '-'}</p>
                  {coverData['author'] && <p>报告作者：{coverData['author']}</p>}
                  <p>报告日期：{coverData['date'] || '-'}</p>
                </div>
              </div>

              {/* 目录 */}
              <div className="mb-10 pb-6 border-b">
                <h2 className="text-xl font-bold text-center mb-4">目 录</h2>
                <ol className="space-y-1 ml-8 list-decimal text-sm">
                  {generatedChapters.filter(c => c.status === 'done').map(ch => (
                    <li key={ch.id}>{ch.title}</li>
                  ))}
                </ol>
              </div>

              {/* 正文各章 */}
              {generatedChapters.filter(c => c.status === 'done').map((ch) => (
                <section key={ch.id} className="mb-10">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">{ch.title}</h2>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {ch.content}
                  </div>
                </section>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* 构建中覆盖层 */}
      {buildingDocx && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex items-center justify-center">
          <Card className="w-80">
            <CardContent className="p-6 text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-green-500" />
              <div>
                <p className="font-medium">正在生成 Word 文档</p>
                <p className="text-xs text-muted-foreground mt-1">应用正式排版格式...</p>
              </div>
              <Progress value={buildProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{Math.round(buildProgress)}%</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
