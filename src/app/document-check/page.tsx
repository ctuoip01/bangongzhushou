'use client';

import { useCallback, useRef, useState } from 'react';
import {
  FileCheck2,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  XCircle,
  Building2,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ValidationReport,
  ValidationIssue,
  IssueCategory,
  IssueSeverity,
} from '@/lib/docx-engine';
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  ptToChineseSizeName,
} from '@/lib/docx-engine';

// ==================== 类型定义 ====================

interface CheckResult {
  report: ValidationReport;
  fixedFileBase64?: string;
  fixedFileName?: string;
  statistics: {
    totalParagraphs: number;
    fixableCount: number;
    processingTimeMs: number;
    originalFileSize: number;
  };
}

// ==================== 常量 ====================

const ACCEPTED_FORMAT = '.docx';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const modeOptions = [
  {
    value: 'official' as const,
    label: '党政公文',
    desc: 'GB/T 9704-2012 国家标准',
    icon: Building2,
  },
  {
    value: 'business' as const,
    label: '商务文档',
    desc: '通用商务文档格式规范',
    icon: FileText,
  },
] as const;

// ==================== 主组件 ====================

export default function DocumentCheckPage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'official' | 'business'>('official');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 文件选择处理
  const handleFileSelect = useCallback((selectedFile: File) => {
    setError(null);
    setResult(null);

    if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
      setError('请上传 .docx 格式的 Word 文档');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('文件大小不能超过 10MB');
      return;
    }

    setFile(selectedFile);
  }, []);

  // 执行校验
  const runCheck = useCallback(async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);

      const response = await fetch('/api/document-check', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `请求失败 (${response.status})`);
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '校验过程中发生错误');
    } finally {
      setIsProcessing(false);
    }
  }, [file, mode]);

  // 下载修正后的文档
  const downloadFixedDoc = useCallback(() => {
    if (!result?.fixedFileBase64 || !result.fixedFileName) return;

    const byteCharacters = atob(result.fixedFileBase64);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.fixedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [result]);

  // 重置
  const reset = useCallback(() => {
    setFile(null);
    setResult(null);
    setError(null);
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* 头部 */}
      <header className="border-b border-white/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200">
              <FileCheck2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">文档格式校验</h1>
              <p className="text-sm text-slate-500">基于 GB/T 9704-2012 国家标准的公文格式深度检查</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-16 pt-8">
        {!result ? (
          /* ========== 上传与配置区域 ========== */
          <section className="space-y-6">
            {/* 模式选择 */}
            <div className="rounded-3xl border border-white/80 bg-white/75 p-6 shadow-sm backdrop-blur-sm">
              <label className="mb-3 block text-sm font-semibold text-slate-700">选择校验标准</label>
              <div className="grid grid-cols-2 gap-3">
                {modeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = mode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMode(opt.value)}
                      disabled={isProcessing}
                      className={cn(
                        'relative flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition-all duration-200',
                        isActive
                          ? 'border-blue-500 bg-blue-50/80 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                        isProcessing && 'pointer-events-none opacity-60',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-5 w-5', isActive ? 'text-blue-600' : 'text-slate-400')} />
                        <span className={cn('font-semibold', isActive ? 'text-blue-900' : 'text-slate-700')}>
                          {opt.label}
                        </span>
                      </div>
                      <span className="text-xs leading-relaxed text-slate-500">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 文件上传区域 */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFileSelect(f);
              }}
              onClick={() => !file && fileInputRef.current?.click()}
              className={cn(
                'group relative cursor-pointer overflow-hidden rounded-[28px] border-2 border-dashed p-12 text-center transition-all duration-300',
                dragOver
                  ? 'border-blue-400 bg-blue-50/60 scale-[1.01]'
                  : 'border-slate-300 bg-white/70 hover:border-blue-300 hover:bg-white',
                file && 'cursor-default',
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FORMAT}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                disabled={isProcessing}
                className="hidden"
              />

              {file ? (
                /* 已选文件 */
                <div className="space-y-3">
                  <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                    <FileText className="h-7 w-7 text-emerald-600" />
                  </div>
                  <p className="font-semibold text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); reset(); }}
                    className="mt-2 inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    重新选择
                  </button>
                </div>
              ) : (
                /* 上传提示 */
                <div className="space-y-4">
                  <div className={cn(
                    'mx-auto inline-flex h-16 w-16 items-center justify-center rounded-3xl transition-colors',
                    dragOver ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-blue-50',
                  )}>
                    <Upload className={cn('h-8 w-8', dragOver ? 'text-blue-500' : 'text-slate-400 group-hover:text-blue-400')} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      点击或拖拽上传 Word 文档
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      仅支持 .docx 格式，最大 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                <div className="text-sm text-rose-700">{error}</div>
              </div>
            )}

            {/* 开始按钮 */}
            <button
              type="button"
              onClick={() => void runCheck()}
              disabled={!file || isProcessing}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold text-white shadow-lg transition-all duration-200',
                (!file || isProcessing)
                  ? 'cursor-not-allowed bg-slate-300 shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 active:scale-[0.98]',
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  正在解析文档格式...
                </>
              ) : (
                <>
                  开始校验
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>

            {/* 功能说明卡片 */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { title: '格式解析', desc: '提取字体、字号、行距、页边距等全部排版属性' },
                { title: '智能校验', desc: '逐项对比国家标准，定位每个不符合规范的段落' },
                { title: '一键修正', desc: '自动修复所有格式问题，直接下载修正版文档' },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200/80 bg-white/60 p-4 backdrop-blur-sm">
                  <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        ) : (
          /* ========== 校验结果区域 ========== */
          <ResultView result={result} onDownloadFixed={downloadFixedDoc} onReset={reset} />
        )}
      </main>
    </div>
  );
}

// ==================== 结果展示组件 ====================

function ResultView({
  result,
  onDownloadFixed,
  onReset,
}: {
  result: NonNullable<CheckResult>;
  onDownloadFixed: () => void;
  onReset: () => void;
}) {
  const { report, statistics } = result;

  // 按类别分组问题
  const issuesByCategory = new Map<IssueCategory, ValidationIssue[]>();
  report.issues.forEach((issue) => {
    const list = issuesByCategory.get(issue.category) || [];
    list.push(issue);
    issuesByCategory.set(issue.category, list);
  });

  // 分数颜色
  const scoreColor =
    report.score >= 90 ? 'text-emerald-600' :
    report.score >= 70 ? 'text-amber-600' :
    'text-red-600';

  const scoreBgColor =
    report.score >= 90 ? 'from-emerald-50 to-emerald-100/50' :
    report.score >= 70 ? 'from-amber-50 to-amber-100/50' :
    'from-red-50 to-red-100/50';

  return (
    <section className="space-y-6">
      {/* 总览卡片 */}
      <div className={cn('overflow-hidden rounded-3xl bg-gradient-to-br p-8 shadow-sm', scoreBgColor)}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">合规评分</p>
            <p className={cn('mt-1 text-5xl font-black tracking-tight', scoreColor)}>
              {report.score}<span className="ml-1 text-2xl font-semibold text-slate-400">/100</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-center">
            <StatBadge label="错误" count={report.errorCount} color="red" />
            <StatBadge label="警告" count={report.warningCount} color="amber" />
            <StatBadge label="提示" count={report.infoCount} color="blue" />
            <StatBadge label="总问题" count={report.totalIssues} color="slate" />
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-600">{report.summary}</p>
        <p className="mt-1 text-xs text-slate-400">
          共解析 {statistics.totalParagraphs} 个段落，耗时 {(statistics.processingTimeMs / 1000).toFixed(1)} 秒
        </p>
      </div>

      {/* 操作按钮区 */}
      <div className="flex flex-wrap gap-3">
        {result.fixedFileBase64 && result.fixedFileName && (
          <button
            type="button"
            onClick={onDownloadFixed}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.97]"
          >
            <Download className="h-4 w-4" />
            下载修正版文档 ({result.statistics.fixableCount} 项已修复)
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-[0.97]"
        >
          校验其他文档
        </button>
      </div>

      {/* 问题详情列表 */}
      {issuesByCategory.size > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">校验详情</h2>
          {Array.from(issuesByCategory.entries()).map(([category, issues]) => (
            <CategorySection key={category} category={category} issues={issues} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <p className="mt-3 font-semibold text-emerald-800">文档完全符合规范</p>
          <p className="mt-1 text-sm text-emerald-600">未发现任何格式问题</p>
        </div>
      )}
    </section>
  );
}

/** 统计徽章 */
function StatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    red: 'bg-red-50 text-red-700 ring-red-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  };
  return (
    <div className={cn('min-w-[72px] rounded-xl ring-1 px-4 py-2', colors[color])}>
      <p className="text-lg font-bold leading-none">{count}</p>
      <p className="mt-1 text-[11px] font-medium opacity-70">{label}</p>
    </div>
  );
}

/** 分类问题组 */
function CategorySection({
  category,
  issues,
}: {
  category: IssueCategory;
  issues: ValidationIssue[];
}) {
  const [expanded, setExpanded] = useState(true);
  
  const severityCounts = {
    error: issues.filter(i => i.severity === 'error').length,
    warning: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      {/* 标题栏 - 可折叠 */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-slate-800">
            {CATEGORY_LABELS[category]}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {issues.length} 项
          </span>
          {severityCounts.error > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
              {severityCounts.error} 错误
            </span>
          )}
        </div>
        <svg
          className={cn('h-5 w-5 text-slate-400 transition-transform', expanded && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 问题列表 */}
      {expanded && (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 单个问题卡片 */
function IssueCard({ issue }: { issue: ValidationIssue }) {
  const icons = {
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };
  const Icon = icons[issue.severity];
  const color = SEVERITY_COLORS[issue.severity];

  return (
    <div className="flex gap-4 px-5 py-4 transition hover:bg-slate-50/50">
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0')} style={{ color }} />

      <div className="min-w-0 flex-1 space-y-1">
        {/* 位置 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400">{issue.location}</span>
          {issue.autoFixable && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
              可自动修复
            </span>
          )}
        </div>

        {/* 问题描述 */}
        <p className="text-sm font-medium text-slate-800">{issue.problem}</p>

        {/* 对比信息 */}
        <div className="grid gap-1 text-xs sm:grid-cols-2">
          <div className="rounded-lg bg-amber-50 px-3 py-2">
            <span className="font-medium text-amber-800">应：</span>
            <span className="text-amber-700">{issue.expected}</span>
          </div>
          <div className="rounded-lg bg-slate-100 px-3 py-2">
            <span className="font-medium text-slate-600">实：</span>
            <span className="text-slate-500">{issue.actual}</span>
          </div>
        </div>

        {/* 建议 */}
        <p className="text-xs leading-relaxed text-slate-500">{issue.suggestion}</p>
      </div>
    </div>
  );
}
