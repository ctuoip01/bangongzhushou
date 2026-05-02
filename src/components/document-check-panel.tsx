'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  RefreshCcw,
  UploadCloud,
  Wrench,
  X,
  AlertTriangle,
  Info,
  CircleX,
  Shield,
  Loader2,
} from 'lucide-react';
import { cn, copyToClipboard } from '@/lib/utils';
import { ModuleGlyph } from '@/components/module-glyph';
import type {
  ValidationReport,
  ValidationIssue,
  IssueSeverity,
  PageSettings,
} from '@/lib/docx-engine/types';
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  ptToChineseSizeName,
  twipToMM,
  halfPtToPt,
} from '@/lib/docx-engine/standards';

// ==================== 类型 ====================

type CheckMode = 'official' | 'business';

interface DocumentCheckPanelProps {
  moduleId: string;
}

// ==================== 常量 ====================

const MODE_OPTIONS = [
  { value: 'official' as const, label: '党政公文', desc: 'GB/T 9704-2012 标准' },
  { value: 'business' as const, label: '商务文档', desc: '通用商务规范' },
];

const SEVERITY_ICONS: Record<IssueSeverity, typeof AlertTriangle> = {
  error: CircleX,
  warning: AlertTriangle,
  info: Info,
};

// ==================== 子组件 ====================

/** 文件上传区域 */
function FileUploadArea({
  onFileSelect,
  isLoading,
}: {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.docx')) return;
      if (file.size > 10 * 1024 * 1024) return;
      onFileSelect(file);
    },
    [onFileSelect],
  );

  return (
    <div
      onClick={() => !isLoading && fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        'group cursor-pointer rounded-[28px] border-2 border-dashed p-12 text-center transition-all',
        isDragging
          ? 'border-slate-700 bg-slate-50'
          : 'border-slate-300 bg-white/60 hover:border-slate-500 hover:bg-white/80',
        isLoading && 'pointer-events-none opacity-50',
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        className="hidden"
      />
      <div className="mx-auto mb-4 inline-flex rounded-full bg-slate-100 p-5 transition group-hover:bg-slate-200">
        <UploadCloud className="h-8 w-8 text-slate-600" />
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-slate-800">
        上传 Word 文档
      </h3>
      <p className="text-sm text-slate-500">
        点击或拖拽 .docx 文件到此处
      </p>
      <p className="mt-2 text-xs text-slate-400">
        支持 .docx 格式，最大 10MB · 引擎将提取字体、字号、行距、缩进等格式属性进行校验
      </p>
    </div>
  );
}

/** 分数圆环 */
function ScoreRing({ score }: { score: number }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? '#16a34a' : score >= 60 ? '#ca8a04' : '#dc2626';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold" style={{ color }}>{score}</div>
        <div className="text-[10px] text-slate-400">合规分</div>
      </div>
    </div>
  );
}

/** 单条问题卡片 */
function IssueCard({
  issue,
  isSelected,
  onSelect,
}: {
  issue: ValidationIssue;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = SEVERITY_ICONS[issue.severity];
  const color = SEVERITY_COLORS[issue.severity];

  return (
    <div
      className={cn(
        'rounded-2xl border transition',
        isSelected ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200 bg-white/80 hover:border-slate-300',
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        {/* 复选框 */}
        {issue.autoFixable && (
          <label
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition"
            style={{ borderColor: isSelected ? color : undefined, backgroundColor: isSelected ? color : undefined }}
            onClick={(e) => e.stopPropagation()}
          >
            {isSelected && (
              <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            )}
          </label>
        )}

        {/* 图标 + 内容 */}
        <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color }}>{SEVERITY_LABELS[issue.severity]}</span>
            <span className="truncate text-sm font-medium text-slate-800">{issue.problem}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{issue.location}</p>
        </div>

        {expanded && issue.autoFixable && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={cn(
              'shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition',
              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {isSelected ? '已选修复' : '加入修复'}
          </button>
        )}

        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-slate-100 px-4 pb-3 pt-2">
          <IssueDetailRow label="应有" value={issue.expected} />
          <IssueDetailRow label="实际" value={issue.actual} />
          <IssueDetailRow label="建议" value={issue.suggestion} />
        </div>
      )}
    </div>
  );
}

/** 详情行 */
function IssueDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="shrink-0 font-medium text-slate-500">{label}：</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}

/** 按分类分组的问题列表 */
function IssuesByCategory({
  issues,
  selectedIds,
  onToggle,
}: {
  issues: ValidationIssue[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  // 按 category 分组
  const groups = new Map<string, ValidationIssue[]>();
  for (const issue of issues) {
    const cat = CATEGORY_LABELS[issue.category] || issue.category;
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(issue);
  }

  // 按严重度排序：error > warning > info
  const severityOrder: Record<IssueSeverity, number> = { error: 0, warning: 1, info: 2 };

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([catLabel, catIssues]) => {
        const isOpenDefault = catIssues.some((i) => i.severity === 'error');
        const [isOpen, setIsOpen] = useState(isOpenDefault);

        return (
          <details key={catLabel} open={isOpen} className="rounded-2xl border border-slate-200 bg-white/60">
            <summary
              className="flex cursor-pointer items-center gap-3 px-4 py-3"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              )}
              <span className="font-medium text-slate-800">{catLabel}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {catIssues.length}项
              </span>
              {/* 统计各级别数量 */}
              <div className="ml-auto flex gap-1.5">
                {(['error', 'warning'] as const).map((sev) => {
                  const count = catIssues.filter((i) => i.severity === sev).length;
                  if (!count) return null;
                  return (
                    <span key={sev} className="text-xs" style={{ color: SEVERITY_COLORS[sev] }}>
                      {SEVERITY_LABELS[sev]} {count}
                    </span>
                  );
                })}
              </div>
            </summary>

            <div className="divide-y divide-slate-100 px-2 pb-2">
              {catIssues
                .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
                .map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    isSelected={selectedIds.has(issue.id)}
                    onSelect={() => onToggle(issue.id)}
                  />
                ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

/** 页面设置信息展示 */
function PageInfo({ settings }: { settings: PageSettings }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {[
        { label: '上边距', val: `${settings.top}mm` },
        { label: '下边距', val: `${settings.bottom}mm` },
        { label: '左边距', val: `${settings.left}mm` },
        { label: '右边距', val: `${settings.right}mm` },
        { label: '页眉', val: `${settings.header}mm` },
        { label: '页脚', val: `${settings.footer}mm` },
      ].map((item) => (
        <div key={item.label} className="rounded-xl border border-slate-200 bg-white/70 p-2.5 text-center">
          <div className="text-[10px] text-slate-400">{item.label}</div>
          <div className="text-sm font-semibold text-slate-700">{item.val}</div>
        </div>
      ))}
    </div>
  );
}

// ==================== 主组件 ====================

export function DocumentCheckPanel({ moduleId }: DocumentCheckPanelProps) {
  const [mode, setMode] = useState<CheckMode>('official');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [pageSettings, setPageSettings] = useState<PageSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [isFixing, setIsFixing] = useState(false);
  const originalFileRef = useRef<ArrayBuffer | null>(null);

  // 执行校验
  const runCheck = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);
      setReport(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('mode', mode);

        // 缓存原始文件用于后续修复
        const buf = await file.arrayBuffer();
        originalFileRef.current = buf;

        const res = await fetch('/api/document-check', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || '校验请求失败');
        }

        setReport(data.report);
        setPageSettings(data.meta?.pageSettings ?? null);

        // 默认选中所有可自动修复的项
        const fixableIds = new Set<string>(
          data.report.issues.filter((i: ValidationIssue) => i.autoFixable).map((i: ValidationIssue) => i.id),
        );
        setSelectedIssueIds(fixableIds);
      } catch (err) {
        setError(err instanceof Error ? err.message : '校验失败');
      } finally {
        setIsLoading(false);
      }
    },
    [mode],
  );

  // 文件选择后立即校验
  const handleFileSelect = useCallback(
    (file: File) => {
      setSelectedFile(file);
      runCheck(file);
    },
    [runCheck],
  );

  // 切换问题选中状态
  const toggleIssue = useCallback((id: string) => {
    setSelectedIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // 全选/取消全选
  const toggleAllFixable = useCallback(() => {
    if (!report) return;
    const allFixable = report.issues.filter((i) => i.autoFixable).map((i) => i.id);
    const allSelected = allFixable.every((id) => selectedIssueIds.has(id));
    setSelectedIssueIds(allSelected ? new Set() : new Set(allFixable));
  }, [report, selectedIssueIds]);

  // 执行自动修复并下载
  const handleAutoFix = useCallback(async () => {
    if (!report || !originalFileRef.current) return;

    setIsFixing(true);
    try {
      const formData = new FormData();
      formData.append('file', new Blob([originalFileRef.current]));
      formData.append('report', JSON.stringify(report));
      if (selectedIssueIds.size < report.issues.filter((i) => i.autoFixable).length) {
        formData.append('issueIds', JSON.stringify([...selectedIssueIds]));
      }

      const res = await fetch('/api/document-check', { method: 'PATCH', body: formData });

      if (!res.ok) throw new Error('修复失败');

      // 触发下载
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fixed-${report.documentName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '修复失败');
    } finally {
      setIsFixing(false);
    }
  }, [report, selectedIssueIds]);

  // 重新校验
  const handleRecheck = useCallback(() => {
    if (selectedFile) runCheck(selectedFile);
  }, [selectedFile, runCheck]);

  // 重置
  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setReport(null);
    setPageSettings(null);
    setError(null);
    setSelectedIssueIds(new Set());
    originalFileRef.current = null;
  }, []);

  // ==================== 渲染 ====================

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        {/* 左侧面板 */}
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-4 space-y-4">
            {/* 模块信息 */}
            <div className="rounded-[32px] border border-white/70 bg-white/62 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                  <Shield className="h-6 w-6 text-slate-700" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">文档格式校验</h1>
                  <p className="text-sm text-slate-500">DOCX 格式属性结构化分析</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* 模式选择 */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    校验标准
                  </label>
                  <div className="flex rounded-2xl border border-slate-200 bg-white/80 overflow-hidden">
                    {MODE_OPTIONS.map((opt, idx) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMode(opt.value)}
                        disabled={isLoading}
                        className={cn(
                          'flex-1 px-3 py-2.5 text-xs font-medium transition',
                          mode === opt.value
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900',
                          idx !== 0 && 'border-l border-slate-200',
                        )}
                      >
                        <div>{opt.label}</div>
                        <div className={cn(
                          'opacity-60',
                          mode === opt.value ? 'opacity-70' : '',
                        )}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 技术说明 */}
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    技术原理
                  </div>
                  <ul className="space-y-1.5 text-xs leading-5 text-slate-600">
                    <li>· 解压 DOCX（ZIP 格式）</li>
                    <li>· 解析 word/document.xml</li>
                    <li>· 提取字体/字号/行距/缩进等 OOXML 属性</li>
                    <li>· 与 GB/T 9704-2012 标准逐项对比</li>
                    <li>· 支持一键自动修正并下载新文档</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 页面设置（校验完成后显示） */}
            {pageSettings && (
              <div className="rounded-[32px] border border-white/70 bg-white/62 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  页面参数
                </div>
                <PageInfo settings={pageSettings} />
              </div>
            )}
          </div>
        </aside>

        {/* 主区域 */}
        <main className="flex min-h-[calc(100vh-2rem)] flex-1 flex-col overflow-hidden rounded-[36px] border border-white/70 bg-white/60 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
          {/* Header */}
          <header className="border-b border-white/70 px-5 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/80 text-slate-600 transition hover:text-slate-950"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">文档格式校验</h2>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                    DOCX Engine
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  上传 Word 文档 → 结构化解析 → 标准比对 → 一键修复
                </p>
              </div>
            </div>
          </header>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto px-5 py-6 md:px-6">
            {isLoading && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-4">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-slate-400" />
                  <div className="text-sm font-medium text-slate-600">正在解析文档格式...</div>
                  <div className="text-xs text-slate-400">提取字体 / 字号 / 行距 / 页边距等属性中</div>
                </div>
              </div>
            )}

            {!isLoading && !report && !error && (
              <FileUploadArea onFileSelect={handleFileSelect} isLoading={isLoading} />
            )}

            {error && !report && (
              <div className="mx-auto max-w-lg space-y-4">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
                  <CircleX className="mx-auto mb-3 h-10 w-10 text-rose-500" />
                  <div className="font-medium text-rose-800">{error}</div>
                  <p className="mt-1 text-sm text-rose-600">请确认是有效的 .docx 格式文档</p>
                  <button
                    onClick={() => setError(null)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-200"
                  >
                    重新上传
                  </button>
                </div>
              </div>
            )}

            {/* 校验结果 */}
            {report && !isLoading && (
              <div className="space-y-6">
                {/* 结果头部 */}
                <div className="flex flex-col items-center gap-4 rounded-[28px] border border-white/80 bg-white/75 p-8 shadow-[0_12px_36px_rgba(15,23,42,0.04)]">
                  <ScoreRing score={report.score} />

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-3">
                      {report.score >= 80 ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <span className="font-semibold text-emerald-700">
                            {report.totalIssues === 0 ? '完全符合规范' : '整体良好'}
                          </span>
                        </>
                      ) : report.score >= 60 ? (
                        <>
                          <AlertTriangle className="h-5 w-5 text-amber-600" />
                          <span className="font-semibold text-amber-700">基本合规，有多处需调整</span>
                        </>
                      ) : (
                        <>
                          <CircleX className="h-5 w-5 text-red-600" />
                          <span className="font-semibold text-red-700">格式问题较多，建议全面修订</span>
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{report.summary}</p>
                  </div>

                  {/* 统计概览 */}
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    {[
                      { label: '错误', count: report.errorCount, cls: 'bg-red-50 text-red-700 border-red-200' },
                      { label: '警告', count: report.warningCount, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
                      { label: '提示', count: report.infoCount, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                    ]
                      .filter((s) => s.count > 0)
                      .map((s) => (
                        <span key={s.label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${s.cls}`}>
                          <span>{s.count}</span> 个{s.label}
                        </span>
                      ))
                    }
                    <span className="text-xs text-slate-400">
                      文件名：{report.documentName} · 共检测 {report.issues.length} 个段落
                    </span>
                  </div>
                </div>

                {/* 操作按钮栏 */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRecheck}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" /> 重新校验
                    </button>
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-100"
                    >
                      <X className="h-3.5 w-3.5" /> 换一个文件
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {report.issues.some((i) => i.autoFixable) && (
                      <button
                        onClick={toggleAllFixable}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        {selectedIssueIds.size === report.issues.filter((i) => i.autoFixable).length
                          ? '取消全选' : '全选可修复项'}
                      </button>
                    )}
                    <button
                      onClick={handleAutoFix}
                      disabled={isFixing || selectedIssueIds.size === 0}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isFixing ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> 修复中...</>
                      ) : (
                        <><Wrench className="h-3.5 w-3.5" /> 修复并下载 ({selectedIssueIds.size}项)</>
                      )}
                    </button>
                  </div>
                </div>

                {/* 问题列表 */}
                <IssuesByCategory
                  issues={report.issues}
                  selectedIds={selectedIssueIds}
                  onToggle={toggleIssue}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
