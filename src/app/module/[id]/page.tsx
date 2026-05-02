'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Copy,
  Download,
  FileDown,
  History,
  MessageSquarePlus,
  RefreshCcw,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { SmartInput } from '@/components/smart-input';
import { ModuleGlyph } from '@/components/module-glyph';
import { DocumentCheckPanel } from '@/components/document-check-panel';
import { PolicySearchPanel } from '@/components/policy-search-panel';
import { PptPanel } from '@/components/ppt-panel';
import { ReportPanel } from '@/components/report-panel';
import { BUILT_IN_MODULES, type AIModule } from '@/config/modules';
import { getCustomModules } from '@/lib/module-manager';
import { getAISettings } from '@/lib/ai-settings';
import { cn, copyToClipboard, downloadTextFile } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface HistoryRecord {
  id: string;
  moduleId: string;
  moduleName: string;
  tone: ToneOption;
  input: string;
  output: string;
  createdAt: string;
}

type ToneOption = 'professional' | 'concise' | 'rigorous' | 'humorous';

const HISTORY_STORAGE_KEY = 'zhiyan-history';
const RECENT_STORAGE_KEY = 'recent-modules';
const MODULE_SETTINGS_KEY = 'zhiyan-module-settings';
const MAX_HISTORY_COUNT = 10;

const toneLabels: Record<ToneOption, string> = {
  professional: '专业',
  concise: '简洁',
  rigorous: '严谨',
  humorous: '幽默',
};

const tonePrompts: Record<ToneOption, string> = {
  professional: '请保持商务写作风格，表达礼貌、专业、可信。',
  concise: '请优先给出简洁、直达结论的表达，避免冗余铺陈。',
  rigorous: '请保持论证严谨，结构清晰，重点说明依据、风险和边界。',
  humorous: '请在不影响专业性的前提下加入轻微幽默感，让表达更轻松自然。',
};

const systemBasePrompt = '你是一个专业的办公助手，擅长商务写作，语气礼貌专业。';

/** 异步 Markdown 渲染组件 - 按需加载 marked 库 */
function MarkdownRenderer({ content }: { content: string }) {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    import('marked').then(({ marked }) => {
      if (cancelled) return;
      marked.setOptions({ breaks: true, gfm: true });
      setHtml(marked.parse(content) as string);
    });
    return () => { cancelled = true; };
  }, [content]);

  if (!html) return <div className="text-slate-400">加载中...</div>;
  return <div className="markdown-body text-sm leading-7" dangerouslySetInnerHTML={{ __html: html }} />;
}

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function buildSystemPrompt(moduleData: AIModule, tone: ToneOption) {
  return [systemBasePrompt, tonePrompts[tone], moduleData.systemPrompt].filter(Boolean).join('\n\n');
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function snippet(text: string, length = 70) {
  return text.replace(/\s+/g, ' ').trim().slice(0, length) || '空内容';
}

export default function ModulePage() {
  const params = useParams();
  const moduleId = params.id as string;

  const [moduleData, setModuleData] = useState<AIModule | null>(null);
  const [userInput, setUserInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<ToneOption>('professional');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [copied, setCopied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const lastAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'assistant'),
    [messages]
  );

  useEffect(() => {
    const allModules = [...BUILT_IN_MODULES, ...getCustomModules()];
    const found = allModules.find((item) => item.id === moduleId);

    if (!found) {
      setError('模块不存在');
      return;
    }

    setModuleData(found);

    const recentList = safeJsonParse<string[]>(localStorage.getItem(RECENT_STORAGE_KEY), []);
    const filtered = recentList.filter((id) => id !== moduleId);
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify([moduleId, ...filtered].slice(0, 10)));

    const historyList = safeJsonParse<HistoryRecord[]>(localStorage.getItem(HISTORY_STORAGE_KEY), []);
    setHistory(historyList.filter((item) => item.moduleId === moduleId));

    const settings = safeJsonParse<Record<string, { tone?: ToneOption }>>(
      localStorage.getItem(MODULE_SETTINGS_KEY),
      {}
    );
    if (settings[moduleId]?.tone) {
      setTone(settings[moduleId].tone!);
    }
  }, [moduleId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const settings = safeJsonParse<Record<string, { tone?: ToneOption }>>(
      localStorage.getItem(MODULE_SETTINGS_KEY),
      {}
    );

    settings[moduleId] = {
      ...settings[moduleId],
      tone,
    };

    localStorage.setItem(MODULE_SETTINGS_KEY, JSON.stringify(settings));
  }, [moduleId, tone]);

  const persistHistory = useCallback(
    (input: string, output: string) => {
      if (!moduleData || !output.trim()) return;

      const record: HistoryRecord = {
        id: `${moduleId}-${Date.now()}`,
        moduleId,
        moduleName: moduleData.name,
        tone,
        input,
        output,
        createdAt: new Date().toISOString(),
      };

      const allHistory = safeJsonParse<HistoryRecord[]>(localStorage.getItem(HISTORY_STORAGE_KEY), []);
      const nextHistory = [record, ...allHistory].slice(0, MAX_HISTORY_COUNT);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      setHistory(nextHistory.filter((item) => item.moduleId === moduleId));
    },
    [moduleData, moduleId, tone]
  );

  const submitToAI = useCallback(
    async (rawInput: string) => {
      if (!rawInput.trim() || !moduleData || isLoading) return;

      const aiSettings = getAISettings();
      if (!aiSettings.apiKey?.trim()) {
        setError('请先在首页配置 AI 连接（API Key / Base URL / Model）。');
        return;
      }

      const appendedInput = selectedFile ? `${rawInput}\n\n[上传文件: ${selectedFile.name}]` : rawInput;
      const userMessage = createMessage('user', rawInput);
      const assistantMessage = createMessage('assistant', '');

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setUserInput('');
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleId: moduleData.id,
            systemPrompt: buildSystemPrompt(moduleData, tone),
            userInput: appendedInput,
            endpoint: aiSettings.endpoint,
            apiKey: aiSettings.apiKey,
            model: aiSettings.model,
            providerName: aiSettings.providerName,
            requestOptions: {
              timeoutMs: 60000,
              stream: true,
            },
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error('请求失败，请稍后重试');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const event of events) {
            const line = event
              .split('\n')
              .find((entry) => entry.startsWith('data: '));

            if (!line) continue;

            const payload = JSON.parse(line.slice(6)) as {
              content?: string;
              error?: string;
              done?: boolean;
            };

            if (payload.error) {
              throw new Error(payload.error);
            }

            if (payload.content) {
              fullContent += payload.content;
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessage.id
                    ? { ...message, content: fullContent }
                    : message
                )
              );
            }
          }
        }

        persistHistory(rawInput, fullContent);
      } catch (err) {
        setMessages((prev) => prev.filter((message) => message.id !== assistantMessage.id));
        setError(err instanceof Error ? err.message : '处理失败');
      } finally {
        setIsLoading(false);
        setSelectedFile(null);
      }
    },
    [isLoading, moduleData, persistHistory, selectedFile, tone]
  );

  const handleSubmit = useCallback(async () => {
    await submitToAI(userInput);
  }, [submitToAI, userInput]);

  const handleContinueWriting = useCallback(async () => {
    if (!lastAssistantMessage?.content.trim()) return;
    await submitToAI(`请基于以下内容继续写作，并自然延续上下文：\n\n${lastAssistantMessage.content}`);
  }, [lastAssistantMessage, submitToAI]);

  const handleCopy = useCallback(async () => {
    if (!lastAssistantMessage?.content) return;
    const success = await copyToClipboard(lastAssistantMessage.content);
    if (success) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  }, [lastAssistantMessage]);

  const handleExportMarkdown = useCallback(() => {
    if (!lastAssistantMessage?.content || !moduleData) return;
    downloadTextFile(
      lastAssistantMessage.content,
      `${moduleData.id}-${Date.now()}.md`,
      'text/markdown;charset=utf-8'
    );
  }, [lastAssistantMessage, moduleData]);

  const handleExportWord = useCallback(async () => {
    if (!lastAssistantMessage?.content || !moduleData) return;
    const { marked } = await import('marked');
    marked.setOptions({ breaks: true, gfm: true });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${marked.parse(
      lastAssistantMessage.content
    )}</body></html>`;
    downloadTextFile(html, `${moduleData.id}-${Date.now()}.doc`, 'application/msword;charset=utf-8');
  }, [lastAssistantMessage, moduleData]);

  const handleExportPdf = useCallback(async () => {
    if (!lastAssistantMessage?.content || !moduleData) return;

    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      unit: 'pt',
      format: 'a4',
    });

    const lines = pdf.splitTextToSize(lastAssistantMessage.content, 520);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.text(lines, 40, 60, { baseline: 'top' });
    pdf.save(`${moduleData.id}-${Date.now()}.pdf`);
  }, [lastAssistantMessage, moduleData]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const hydrateFromHistory = useCallback((record: HistoryRecord) => {
    setMessages([
      {
        id: `${record.id}-user`,
        role: 'user',
        content: record.input,
        timestamp: record.createdAt,
      },
      {
        id: `${record.id}-assistant`,
        role: 'assistant',
        content: record.output,
        timestamp: record.createdAt,
      },
    ]);
    setTone(record.tone);
    setUserInput(record.input);
  }, []);

  if (error && !moduleData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-[32px] border border-white/70 bg-white/70 p-10 text-center shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl">
          <div className="mb-4 text-lg font-semibold">模块不存在</div>
          <p className="mb-6 text-sm text-slate-500">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-full border border-white/70 bg-white/70 px-5 py-3 text-sm text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          正在加载模块...
        </div>
      </div>
    );
  }

  // 文档校验模块使用专用面板（结构化 DOCX 引擎，非 AI 聊天）
  if (moduleId === 'document-check') {
    return <DocumentCheckPanel moduleId={moduleId} />;
  }

  // 政策搜索模块使用专用面板（真实联网搜索 + 结果列表 + AI 聚合）
  if (moduleId === 'policy-search') {
    return <PolicySearchPanel moduleId={moduleId} />;
  }

  // PPT助手模块使用专用面板（大纲生成 + 预览 + .pptx 文件下载）
  if (moduleId === 'ppt-helper') {
    return <PptPanel moduleId={moduleId} />;
  }

  // 报告生成模块使用专用面板（模板系统 + 分章AI生成 + .docx导出）
  if (moduleId === 'report-generate') {
    return <ReportPanel moduleId={moduleId} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-[32px] border border-white/70 bg-white/62 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                  <ModuleGlyph module={moduleData} className="h-6 w-6 text-slate-700" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">{moduleData.name}</h1>
                  <p className="text-sm text-slate-500">{moduleData.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    语气切换
                  </label>
                  <select
                    value={tone}
                    onChange={(event) => setTone(event.target.value as ToneOption)}
                    className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none ring-0 transition focus:border-slate-400"
                  >
                    {Object.entries(toneLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    系统提示词
                  </div>
                  <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-600">
                    {buildSystemPrompt(moduleData, tone)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/70 bg-white/62 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <History className="h-4 w-4" />
                最近 10 次历史
              </div>
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                    还没有历史记录。
                  </div>
                ) : (
                  history.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => hydrateFromHistory(record)}
                      className="w-full rounded-2xl border border-slate-200 bg-white/80 p-4 text-left transition hover:border-slate-300 hover:bg-white"
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-slate-500">{toneLabels[record.tone]}</span>
                        <span className="text-xs text-slate-400">{formatTime(record.createdAt)}</span>
                      </div>
                      <p className="mb-2 text-sm font-medium text-slate-800">{snippet(record.input, 42)}</p>
                      <p className="text-xs leading-5 text-slate-500">{snippet(record.output, 78)}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-h-[calc(100vh-2rem)] flex-1 flex-col overflow-hidden rounded-[36px] border border-white/70 bg-white/60 shadow-[0_28px_90px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
          <header className="border-b border-white/70 px-5 py-4 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/80 text-slate-600 transition hover:text-slate-950"
                  title="返回首页"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 lg:hidden">
                  <ModuleGlyph module={moduleData} className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900">{moduleData.name}</h2>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                      Streaming
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{moduleData.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={!lastAssistantMessage?.content}
                  className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? '已复制' : '复制'}
                </button>
                <button
                  onClick={handleContinueWriting}
                  disabled={!lastAssistantMessage?.content || isLoading}
                  className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  续写
                </button>
                <button
                  onClick={handleExportWord}
                  disabled={!lastAssistantMessage?.content}
                  className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />
                  Word
                </button>
                <button
                  onClick={handleExportPdf}
                  disabled={!lastAssistantMessage?.content}
                  className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </button>
                <button
                  onClick={handleExportMarkdown}
                  disabled={!lastAssistantMessage?.content}
                  className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />
                  Markdown
                </button>
                <button
                  onClick={clearChat}
                  disabled={messages.length === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50/90 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  清空
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-6 md:px-6">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-2xl text-center">
                  <div className="mx-auto mb-5 inline-flex rounded-[28px] border border-white/80 bg-white/75 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                    <ModuleGlyph module={moduleData} className="h-8 w-8 text-slate-800" />
                  </div>
                  <h3 className="mb-3 text-2xl font-semibold tracking-tight text-slate-900">{moduleData.name}</h3>
                  <p className="mx-auto mb-5 max-w-xl text-sm leading-7 text-slate-500">{moduleData.description}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {moduleData.inputTypes.map((type) => (
                      <span
                        key={type}
                        className="rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600"
                      >
                        {type === 'text' && '文本输入'}
                        {type === 'url' && 'URL 抓取'}
                        {type === 'document' && '文档上传'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-5">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn('flex gap-4', message.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[88%] rounded-[28px] px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]',
                        message.role === 'user'
                          ? 'bg-slate-900 text-white'
                          : 'border border-white/80 bg-white/85 text-slate-800 backdrop-blur-xl'
                      )}
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium opacity-70">
                        {message.role === 'user' ? '你' : 'AI 办公助手'}
                        <span>{formatTime(message.timestamp)}</span>
                      </div>

                      {message.role === 'assistant' ? (
                        <MarkdownRenderer
                          content={message.content || (isLoading ? '正在生成中...' : '')}
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-7">{message.content}</pre>
                      )}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/85 px-4 py-3 text-sm text-slate-500 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                      AI 正在流式生成...
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-white/70 px-5 py-5 md:px-6">
            <div className="mx-auto max-w-4xl space-y-4">
              <div className="rounded-[30px] border border-white/80 bg-white/70 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <SmartInput
                  value={userInput}
                  onChange={setUserInput}
                  onFileSelect={setSelectedFile}
                  placeholder={moduleData.placeholder || '输入内容、粘贴链接，或上传文档后开始处理...'}
                  disabled={isLoading}
                  inputTypes={moduleData.inputTypes}
                  minHeight="140px"
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Sparkles className="h-4 w-4" />
                  当前语气：{toneLabels[tone]}，结果会自动保存到本地历史记录。
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!userInput.trim() || isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isLoading ? '处理中...' : '开始生成'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
