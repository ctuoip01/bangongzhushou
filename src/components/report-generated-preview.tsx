'use client';

import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  FileText, Download, Loader2, RefreshCw, Copy, CheckCircle2,
  ChevronRight, Sparkles, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GeneratedChapter {
  id: string;
  title: string;
  level: number;
  content: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  charCount: number;
}

interface ReportGeneratedPreviewProps {
  chapters: GeneratedChapter[];
  activeChapters: Array<{ id: string; title: string; level: number; suggestedWords?: number }>;
  currentIdx: number;
  phase: string;
  isGenerating: boolean;
  isBuilding: boolean;
  buildProgress: number;
  onRegenChapter: (idx: number) => void;
  onExportDocx: () => void;
  onCopyAll: () => void;
}

/**
 * 报告生成预览面板 — Step 3/4 内容区域
 *
 * 从 report-panel.tsx 中抽取，负责展示生成中的章节卡片、
 * 进度条、以及导出操作。
 */
export function ReportGeneratedPreview({
  chapters,
  activeChapters,
  currentIdx,
  phase,
  isGenerating,
  isBuilding,
  buildProgress,
  onRegenChapter,
  onExportDocx,
  onCopyAll,
}: ReportGeneratedPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  const doneCount = chapters.filter(c => c.status === 'done').length;
  const totalCount = activeChapters.length;
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  return (
    <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
      {/* 左侧：章节列表 */}
      <Card className="w-[340px] shrink-0 flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> 章节内容
              <Badge variant="secondary" className="text-xs">
                {doneCount}/{totalCount}
              </Badge>
            </CardTitle>
            {!isGenerating && doneCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onCopyAll}>
                <Copy className="h-3 w-3" /> 复制全文
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {/* 进度条 */}
          {(isGenerating || doneCount === totalCount) && (
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{phase}</span>
                <span>{Math.round(progressPct)}%</span>
              </div>
              <Progress value={progressPct} className="h-1.5" />
            </div>
          )}

          {chapters.map((ch, idx) => (
            <Card key={ch.id} className={cn(
              "transition-all cursor-pointer",
              ch.status === 'generating' ? 'ring-1 ring-primary/30 bg-primary/[0.02]' :
              ch.status === 'done' ? '' : 'opacity-50',
            )}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {ch.status === 'generating' && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                      {ch.status === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                      {ch.status === 'error' && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                      <span className={cn(
                        "text-sm font-medium truncate",
                        currentIdx === idx && ch.status === 'generating' && "text-primary",
                      )}>
                        第{idx + 1}章 · {ch.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{ch.content?.slice(0, 80) || '等待生成...'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ch.charCount > 0 && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">{ch.charCount}字</span>
                    )}
                    {ch.status !== 'generating' && !isGenerating && (
                      <button onClick={() => onRegenChapter(idx)} title="重新生成此章">
                        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 导出按钮 */}
          {doneCount > 0 && !isGenerating && (
            <>
              <Separator className="my-3" />
              <Button onClick={onExportDocx} disabled={isBuilding} className="w-full gap-2">
                {isBuilding ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> 构建中 {buildProgress}%</>
                ) : (
                  <><Download className="h-4 w-4" /> 导出 Word 文档 (.docx)</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* 右侧：当前章节预览 */}
      <Card className="flex-1 flex flex-col min-w-0">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="text-base">实时预览</CardTitle>
        </CardHeader>
        <CardContent ref={previewRef} className="flex-1 overflow-y-auto">
          {chapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">点击&quot;开始生成&quot;，AI 将逐章撰写报告内容</p>
              <p className="text-xs mt-1 opacity-60">支持中途编辑大纲、调整章节顺序、重新生成单章</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {chapters.map(ch =>
                ch.content ? (
                  <section key={ch.id} id={`chapter-${ch.id}`} className="mb-6 last:mb-0">
                    <h2 className="text-lg font-bold mb-2 scroll-mt-20">
                      {'一三四五六七八九十'.includes(String(ch.level)) ?
                        `${['', '一', '二', '三', '四', '五', '六', '七', '八'][ch.level] || ''}、${ch.title}` :
                        ch.title}
                    </h2>
                    <div className="whitespace-pre-wrap leading-relaxed text-sm">
                      {ch.content}
                      {ch.status === 'generating' && <span className="inline-block w-2 h-4 bg-primary/50 ml-1 animate-pulse rounded" />}
                    </div>
                  </section>
                ) : null,
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
