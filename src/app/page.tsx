'use client';

import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Copy,
  FileClock,
  FilePlus2,
  FileText,
  FolderTree,
  Globe,
  KeyRound,
  Library,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import { cn, copyToClipboard, downloadTextFile, formatTimestamp } from '@/lib/utils';
import {
  aiProviderTemplates,
  defaultAISettings,
  getAISettings,
  maskApiKey,
  saveAISettings,
  type AIConnectionSettings,
} from '@/lib/ai-settings';
import {
  createEmptyKnowledgeDocument,
  deleteKnowledgeDocument,
  getKnowledgeDocumentTree,
  getKnowledgeDocuments,
  saveKnowledgeDocument,
  type DocumentTreeNode,
  type KnowledgeDocument,
  type KnowledgeDocumentType,
} from '@/lib/document-hub';

type WorkspaceTab = 'workspace' | 'knowledge' | 'settings';
type WorkflowType = 'report' | 'meeting' | 'research' | 'polish';
type ToneOption = 'professional' | 'concise' | 'rigorous';

interface WorkflowPreset {
  id: WorkflowType;
  name: string;
  description: string;
  placeholder: string;
  prompt: string;
}

interface WorkspaceHistoryRecord {
  id: string;
  workflow: WorkflowType;
  tone: ToneOption;
  input: string;
  result: string;
  selectedDocIds: string[];
  createdAt: string;
}

const HISTORY_STORAGE_KEY = 'zhiyan-workspace-history';
const MAX_HISTORY_COUNT = 12;

const presets: WorkflowPreset[] = [
  {
    id: 'report',
    name: '报告写作',
    description: '适合行业研究、方案撰写、咨询交付、周报扩写。',
    placeholder: '输入报告主题、项目背景、已有提纲、客户诉求或你希望输出的结构...',
    prompt:
      '你是一名科技咨询团队的资深顾问。请基于输入产出结构化、可交付的报告草稿，包含结论摘要、核心分析、风险提示与建议动作。',
  },
  {
    id: 'meeting',
    name: '会议纪要',
    description: '把会议记录、录音转写稿或行动项草稿整理成正式纪要。',
    placeholder: '粘贴会议记录、访谈笔记、录音转写文本或待办事项...',
    prompt:
      '你是一名专业项目秘书。请输出正式会议纪要，包含会议主题、关键结论、待办事项、责任人与时间节点。',
  },
  {
    id: 'research',
    name: '研究分析',
    description: '适合竞品分析、政策解读、市场判断、机会识别。',
    placeholder: '输入研究主题、观察记录、竞品信息、政策文本或客户问题...',
    prompt:
      '你是一名科技咨询行业分析师。请完成背景、核心发现、影响判断、机会、风险与建议的结构化分析。',
  },
  {
    id: 'polish',
    name: '润色校对',
    description: '把已有文稿改成更专业、更准确、更适合商务环境的表达。',
    placeholder: '粘贴需要润色、压缩、提炼、校对或重写的原文...',
    prompt:
      '你是一名商务写作编辑。请在保留原意的前提下优化表达，并说明关键修改点与推荐版本。',
  },
];

const tonePrompts: Record<ToneOption, string> = {
  professional: '请保持专业、稳健、商务化表达。',
  concise: '请优先输出简洁、直接、便于复用的版本。',
  rigorous: '请保持论证严谨，明确依据、边界与风险。',
};

const toneLabels: Record<ToneOption, string> = {
  professional: '专业',
  concise: '简洁',
  rigorous: '严谨',
};

const docTypeLabels: Record<KnowledgeDocumentType, string> = {
  manual: '手册',
  policy: '政策',
  template: '模板',
  research: '研究',
};

marked.setOptions({ gfm: true, breaks: true });

function getHistoryRecords(): WorkspaceHistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WorkspaceHistoryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistoryRecord(record: WorkspaceHistoryRecord) {
  const current = getHistoryRecords().filter((item) => item.id !== record.id);
  const next = [record, ...current].slice(0, MAX_HISTORY_COUNT);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
  return next;
}

function buildTreeSearch(nodes: DocumentTreeNode[], keyword: string) {
  if (!keyword.trim()) return nodes;
  const query = keyword.trim().toLowerCase();

  const walk = (node: DocumentTreeNode): DocumentTreeNode | null => {
    const children = node.children
      .map((child) => walk(child))
      .filter((child): child is DocumentTreeNode => Boolean(child));

    const matches =
      node.title.toLowerCase().includes(query) ||
      node.content.toLowerCase().includes(query) ||
      node.tags.join(' ').toLowerCase().includes(query);

    if (matches || children.length > 0) {
      return { ...node, children };
    }
    return null;
  };

  return nodes.map((node) => walk(node)).filter((node): node is DocumentTreeNode => Boolean(node));
}

function TreeNodeItem({
  node,
  level,
  selectedId,
  onSelect,
}: {
  node: DocumentTreeNode;
  level: number;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        className={cn(
          'flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm transition',
          selectedId === node.id ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        {node.children.length > 0 ? <FolderTree className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
        <span className="min-w-0 flex-1 truncate">{node.title}</span>
        <span className={cn('text-[11px]', selectedId === node.id ? 'text-white/70' : 'text-slate-400')}>
          {docTypeLabels[node.type]}
        </span>
      </button>
      {node.children.length > 0 && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('workspace');
  const [workflow, setWorkflow] = useState<WorkflowType>('report');
  const [tone, setTone] = useState<ToneOption>('professional');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('等待生成');
  const [settings, setSettings] = useState<AIConnectionSettings>(defaultAISettings);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState('');
  const [docSearch, setDocSearch] = useState('');
  const [history, setHistory] = useState<WorkspaceHistoryRecord[]>([]);
  const [knowledgeMode, setKnowledgeMode] = useState<'preview' | 'edit'>('preview');
  const [docDraft, setDocDraft] = useState<KnowledgeDocument | null>(null);

  useEffect(() => {
    const savedSettings = getAISettings();
    const docs = getKnowledgeDocuments();
    const historyRecords = getHistoryRecords();
    setSettings(savedSettings);
    setDocuments(docs);
    setHistory(historyRecords);
    setSelectedKnowledgeId(docs[0]?.id ?? '');
  }, []);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const timer = window.setTimeout(() => setSaveState('idle'), 2200);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  const currentPreset = useMemo(
    () => presets.find((preset) => preset.id === workflow) || presets[0],
    [workflow]
  );

  const treeData = useMemo(() => getKnowledgeDocumentTree(), [documents]);
  const filteredTree = useMemo(() => buildTreeSearch(treeData, docSearch), [treeData, docSearch]);

  const selectedDocs = useMemo(
    () => documents.filter((doc) => selectedDocIds.includes(doc.id)),
    [documents, selectedDocIds]
  );

  const currentDocument = useMemo(
    () => documents.find((doc) => doc.id === selectedKnowledgeId) ?? null,
    [documents, selectedKnowledgeId]
  );

  useEffect(() => {
    setDocDraft(currentDocument ? { ...currentDocument } : null);
  }, [currentDocument]);

  const refreshDocuments = () => {
    const docs = getKnowledgeDocuments();
    setDocuments(docs);
    if (!selectedKnowledgeId && docs[0]) {
      setSelectedKnowledgeId(docs[0].id);
    }
  };

  const buildPrompt = () => {
    const mountedDocs = selectedDocs.length
      ? `以下为可参考知识库内容：\n${selectedDocs
          .map((doc) => `# ${doc.title}\n来源：${doc.source || '未注明'}\n${doc.content}`)
          .join('\n\n')}`
      : '';

    return [tonePrompts[tone], currentPreset.prompt, mountedDocs].filter(Boolean).join('\n\n');
  };

  const persistHistory = (finalResult: string) => {
    const nextHistory = saveHistoryRecord({
      id: `${Date.now()}`,
      workflow,
      tone,
      input,
      result: finalResult,
      selectedDocIds,
      createdAt: new Date().toISOString(),
    });
    setHistory(nextHistory);
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    if (!settings.apiKey.trim()) {
      setActiveTab('settings');
      setError('请先配置并保存可用的 API 连接。');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult('');
    setLoadingPhase('正在建立网关连接');

    const phases = [
      '正在建立网关连接',
      '正在整理工作台上下文',
      '正在挂载知识库文档',
      '正在生成咨询结果',
      '正在润色最终输出',
    ];
    let phaseIndex = 0;
    const phaseTimer = window.setInterval(() => {
      phaseIndex = (phaseIndex + 1) % phases.length;
      setLoadingPhase(phases[phaseIndex]);
    }, 1400);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: buildPrompt(),
          userInput: input,
          endpoint: settings.endpoint,
          apiKey: settings.apiKey,
          model: settings.model,
          providerName: settings.providerName,
          requestOptions: {
            timeoutMs: 45000,
            stream: true,
          },
        }),
      });

      const payloadType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const data = payloadType.includes('application/json') ? await response.json() : await response.text();
        throw new Error(typeof data === 'string' ? data : data.error || '请求失败');
      }

      if (!response.body) {
        const data = await response.json();
        const text = data.content || '';
        setResult(text);
        persistHistory(text);
        return;
      }

      let fullText = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          const line = event
            .split('\n')
            .map((item) => item.trim())
            .find((item) => item.startsWith('data:'));

          if (!line) continue;
          const payload = JSON.parse(line.slice(5).trim()) as {
            content?: string;
            error?: string;
            done?: boolean;
          };

          if (payload.error) throw new Error(payload.error);
          if (payload.content) {
            fullText += payload.content;
            setResult(fullText);
          }
        }
      }

      if (fullText.trim()) {
        persistHistory(fullText);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      window.clearInterval(phaseTimer);
      setIsLoading(false);
      setLoadingPhase('等待生成');
    }
  };

  const handleSaveSettings = () => {
    const next = saveAISettings(settings);
    setSettings(next);
    setSaveState('saved');
  };

  const handleProviderTemplate = (templateId: string) => {
    const template = aiProviderTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setSettings((prev) => ({
      ...prev,
      endpoint: template.endpoint,
      model: template.model,
      providerName: template.providerName,
    }));
  };

  const handleConnectivityTest = async () => {
    setTestStatus('testing');
    setTestMessage('正在测试网关连接...');

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: '你是一个连接测试助手。',
          userInput: '请仅回复：连接成功',
          endpoint: settings.endpoint,
          apiKey: settings.apiKey,
          model: settings.model,
          providerName: settings.providerName,
          requestOptions: {
            timeoutMs: 15000,
            stream: false,
            testMode: true,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '连接失败');
      }

      setTestStatus('success');
      setTestMessage(data.content || '连接测试成功');
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err instanceof Error ? err.message : '连接测试失败');
    }
  };

  const handleSaveDocument = () => {
    if (!docDraft || !docDraft.title.trim()) return;

    saveKnowledgeDocument({
      id: docDraft.id,
      title: docDraft.title,
      type: docDraft.type,
      source: docDraft.source,
      parentId: docDraft.parentId,
      tags: docDraft.tags,
      content: docDraft.content,
    });
    refreshDocuments();
    setKnowledgeMode('preview');
  };

  const handleCreateDocument = () => {
    const doc = createEmptyKnowledgeDocument(currentDocument?.id ?? null);
    refreshDocuments();
    setSelectedKnowledgeId(doc.id);
    setKnowledgeMode('edit');
  };

  const handleDeleteDocument = () => {
    if (!currentDocument) return;
    deleteKnowledgeDocument(currentDocument.id);
    const nextDocs = getKnowledgeDocuments();
    setDocuments(nextDocs);
    setSelectedKnowledgeId(nextDocs[0]?.id ?? '');
  };

  const hydrateFromHistory = (record: WorkspaceHistoryRecord) => {
    setWorkflow(record.workflow);
    setTone(record.tone);
    setInput(record.input);
    setResult(record.result);
    setSelectedDocIds(record.selectedDocIds);
    setActiveTab('workspace');
  };

  const exportPdf = () => {
    if (!result.trim()) return;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const lines = pdf.splitTextToSize(result, 520);
    pdf.text(lines, 40, 60, { baseline: 'top' });
    pdf.save(`workspace-${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1680px] px-4 py-5 lg:px-6">
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-[34px] border border-white/70 bg-white/75 p-4 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
            <div className="rounded-[28px] border border-white/80 bg-[linear-gradient(145deg,rgba(9,31,58,0.96),rgba(20,71,133,0.9))] p-5 text-white">
              <div className="mb-3 inline-flex rounded-3xl border border-white/15 bg-white/10 p-3">
                <Brain className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">科技咨询 AI 办公助手</h1>
              <p className="mt-2 text-sm leading-6 text-sky-50/80">
                围绕真实咨询工作流重构，聚焦工作台、知识库与 AI 连接三条主链路。
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {[
                { id: 'workspace' as WorkspaceTab, label: '工作台', icon: Sparkles },
                { id: 'knowledge' as WorkspaceTab, label: '文档归集', icon: Library },
                { id: 'settings' as WorkspaceTab, label: 'AI 连接', icon: Settings2 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-[24px] px-4 py-3 text-left text-sm font-medium transition',
                      activeTab === item.id
                        ? 'bg-slate-900 text-white shadow-[0_12px_32px_rgba(15,23,42,0.18)]'
                        : 'bg-white/75 text-slate-700 hover:bg-white'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-[28px] border border-white/80 bg-white/80 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">本次重构</div>
              <ul className="space-y-2 text-sm leading-6 text-slate-600">
                <li>工作台补齐历史记录、复用回填、真实 loading 反馈。</li>
                <li>知识库升级为文档树 + Markdown 编辑/预览双态。</li>
                <li>AI 连接支持快捷模板、测试连通性、保存状态提示。</li>
                <li>后端兼容非标准 OpenAI 网关并提供更精确报错。</li>
              </ul>
            </div>
          </aside>

          <main className="rounded-[34px] border border-white/70 bg-white/68 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
            {activeTab === 'workspace' && (
              <div className="grid gap-0 xl:grid-cols-[minmax(0,1.1fr)_360px_380px]">
                <section className="border-b border-white/70 p-5 xl:border-b-0 xl:border-r md:p-8">
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/80 px-3 py-1.5 text-xs font-medium text-sky-700">
                        <WandSparkles className="h-3.5 w-3.5" />
                        工作流工作台
                      </div>
                      <h2 className="text-3xl font-semibold tracking-tight text-slate-900">统一工作流，而不是堆模块</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        选择咨询场景，挂载知识库文档，生成结果后可沉淀进历史记录，并一键复用回工作台。
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3 text-right">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">当前连接</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{settings.providerName || '未命名连接'}</div>
                      <div className="text-xs text-slate-500">{settings.model || '未设置模型'}</div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setWorkflow(preset.id)}
                        className={cn(
                          'rounded-[26px] border px-4 py-4 text-left transition',
                          workflow === preset.id
                            ? 'border-slate-900 bg-slate-900 text-white shadow-[0_14px_36px_rgba(15,23,42,0.18)]'
                            : 'border-white/80 bg-white/80 hover:bg-white'
                        )}
                      >
                        <div className="mb-1 text-sm font-semibold">{preset.name}</div>
                        <div className={cn('text-xs leading-5', workflow === preset.id ? 'text-white/72' : 'text-slate-500')}>
                          {preset.description}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                    <div className="rounded-[26px] border border-white/80 bg-white/80 p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">语气</div>
                      <select
                        value={tone}
                        onChange={(event) => setTone(event.target.value as ToneOption)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
                      >
                        <option value="professional">专业</option>
                        <option value="concise">简洁</option>
                        <option value="rigorous">严谨</option>
                      </select>
                    </div>

                    <div className="rounded-[26px] border border-white/80 bg-white/80 p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">已挂载知识库</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedDocs.length > 0 ? (
                          selectedDocs.map((doc) => (
                            <span
                              key={doc.id}
                              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                            >
                              {doc.title}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">未选择知识库文档</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[30px] border border-white/80 bg-white/80 p-4">
                    <textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder={currentPreset.placeholder}
                      className="min-h-[250px] w-full resize-y rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-800 outline-none placeholder:text-slate-400"
                    />
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        当前语气：{toneLabels[tone]}。调用会由服务端代理发起，避免浏览器直接请求第三方模型网关。
                      </div>
                      <button
                        onClick={handleGenerate}
                        disabled={isLoading || !input.trim()}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        {isLoading ? '生成中...' : '开始生成'}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="border-b border-white/70 p-5 xl:border-b-0 xl:border-r md:p-8">
                  <div className="rounded-[30px] border border-white/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">输出结果</h3>
                        <p className="mt-1 text-sm text-slate-500">支持 Markdown 预览、复制与导出。</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(result)}
                          disabled={!result.trim()}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          复制
                        </button>
                        <button
                          onClick={() => downloadTextFile(result, `workspace-${Date.now()}.md`, 'text/markdown;charset=utf-8')}
                          disabled={!result.trim()}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          MD
                        </button>
                        <button
                          onClick={exportPdf}
                          disabled={!result.trim()}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          PDF
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {error}
                      </div>
                    )}

                    {isLoading && (
                      <div className="mb-4 rounded-[24px] border border-sky-100 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(8,47,73,0.02))] p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                            <span className="absolute inset-0 animate-ping rounded-full border border-sky-300/70" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{loadingPhase}</div>
                            <div className="mt-1 h-2 w-48 overflow-hidden rounded-full bg-sky-100">
                              <div className="loading-bar h-full rounded-full bg-[linear-gradient(90deg,#0284c7,#38bdf8,#7dd3fc)]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="markdown-body min-h-[480px] rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-800">
                      {result ? (
                        <div dangerouslySetInnerHTML={{ __html: marked.parse(result) as string }} />
                      ) : (
                        <div className="text-slate-400">结果会显示在这里。</div>
                      )}
                    </div>
                  </div>
                </section>

                <aside className="p-5 md:p-8">
                  <div className="rounded-[30px] border border-white/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">历史记录</h3>
                        <p className="mt-1 text-sm text-slate-500">最近 {MAX_HISTORY_COUNT} 次工作台产出。</p>
                      </div>
                      <FileClock className="h-5 w-5 text-slate-400" />
                    </div>

                    <div className="mb-5 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">知识库快捷挂载</div>
                      <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                        {documents.length === 0 ? (
                          <div className="text-sm text-slate-500">暂无文档</div>
                        ) : (
                          documents.map((doc) => (
                            <label key={doc.id} className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white px-3 py-2.5">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={selectedDocIds.includes(doc.id)}
                                onChange={(event) =>
                                  setSelectedDocIds((prev) =>
                                    event.target.checked ? [...prev, doc.id] : prev.filter((item) => item !== doc.id)
                                  )
                                }
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-slate-900">{doc.title}</div>
                                <div className="text-xs text-slate-500">
                                  {docTypeLabels[doc.type]} · {doc.source || '未注明来源'}
                                </div>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {history.length === 0 ? (
                        <div className="rounded-[24px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                          还没有历史记录。生成一次内容后会自动沉淀到这里。
                        </div>
                      ) : (
                        history.map((record) => (
                          <div
                            key={record.id}
                            className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-900">
                                  {presets.find((item) => item.id === record.workflow)?.name}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {toneLabels[record.tone]} · {formatTimestamp(new Date(record.createdAt).getTime())}
                                </div>
                              </div>
                              <button
                                onClick={() => hydrateFromHistory(record)}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                              >
                                复用到工作台
                              </button>
                            </div>
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{record.input}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {activeTab === 'knowledge' && (
              <div className="grid gap-0 xl:grid-cols-[340px_minmax(0,1fr)]">
                <section className="border-b border-white/70 p-5 xl:border-b-0 xl:border-r md:p-8">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">文档归集</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        像飞书云文档一样，用文档树组织手册、模板、政策摘要与研究笔记。
                      </p>
                    </div>
                    <button
                      onClick={handleCreateDocument}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
                    >
                      <FilePlus2 className="h-4 w-4" />
                      新建文档
                    </button>
                  </div>

                  <div className="relative mb-4">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={docSearch}
                      onChange={(event) => setDocSearch(event.target.value)}
                      placeholder="搜索文档标题、标签、正文"
                      className="w-full rounded-full border border-white/80 bg-white/90 py-3 pl-9 pr-4 text-sm outline-none"
                    />
                  </div>

                  <div className="rounded-[28px] border border-white/80 bg-white/85 p-3">
                    {filteredTree.length === 0 ? (
                      <div className="rounded-[22px] border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                        没有匹配到文档。你可以新建一份手册或模板作为团队知识沉淀。
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredTree.map((node) => (
                          <TreeNodeItem
                            key={node.id}
                            node={node}
                            level={0}
                            selectedId={selectedKnowledgeId}
                            onSelect={setSelectedKnowledgeId}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <aside className="p-5 md:p-8">
                  {!currentDocument || !docDraft ? (
                    <div className="flex min-h-[640px] items-center justify-center rounded-[30px] border border-dashed border-slate-200 bg-white/70 p-8 text-center">
                      <div>
                        <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                        <h3 className="mt-4 text-xl font-semibold text-slate-900">从一份知识文档开始</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          建议先维护上手手册、政策摘要模板或交付规范。文档可以被工作台直接挂载作为上下文。
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[30px] border border-white/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            <ChevronRight className="h-3.5 w-3.5" />
                            文档详情
                          </div>
                          <h3 className="mt-2 text-2xl font-semibold text-slate-900">{currentDocument.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {docTypeLabels[currentDocument.type]} · {currentDocument.source || '未注明来源'} · 更新于{' '}
                            {new Date(currentDocument.updatedAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setKnowledgeMode('preview')}
                            className={cn(
                              'rounded-full px-4 py-2 text-sm',
                              knowledgeMode === 'preview' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            浏览态
                          </button>
                          <button
                            onClick={() => setKnowledgeMode('edit')}
                            className={cn(
                              'rounded-full px-4 py-2 text-sm',
                              knowledgeMode === 'edit' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            编辑态
                          </button>
                          <button
                            onClick={handleDeleteDocument}
                            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700"
                          >
                            删除
                          </button>
                        </div>
                      </div>

                      {knowledgeMode === 'edit' ? (
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <input
                              value={docDraft.title}
                              onChange={(event) => setDocDraft((prev) => (prev ? { ...prev, title: event.target.value } : prev))}
                              placeholder="文档标题"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                            />
                            <input
                              value={docDraft.source || ''}
                              onChange={(event) => setDocDraft((prev) => (prev ? { ...prev, source: event.target.value } : prev))}
                              placeholder="来源，如飞书云文档/内部手册"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                            />
                          </div>
                          <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                            <select
                              value={docDraft.type}
                              onChange={(event) =>
                                setDocDraft((prev) => (prev ? { ...prev, type: event.target.value as KnowledgeDocumentType } : prev))
                              }
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                            >
                              <option value="manual">手册</option>
                              <option value="policy">政策</option>
                              <option value="template">模板</option>
                              <option value="research">研究</option>
                            </select>
                            <input
                              value={docDraft.tags.join(', ')}
                              onChange={(event) =>
                                setDocDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        tags: event.target.value
                                          .split(',')
                                          .map((tag) => tag.trim())
                                          .filter(Boolean),
                                      }
                                    : prev
                                )
                              }
                              placeholder="标签，多个请用逗号分隔"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                            />
                          </div>
                          <textarea
                            value={docDraft.content}
                            onChange={(event) => setDocDraft((prev) => (prev ? { ...prev, content: event.target.value } : prev))}
                            placeholder="支持在线 Markdown 编辑"
                            className="min-h-[420px] w-full rounded-[24px] border border-slate-200 bg-white px-4 py-4 font-mono text-sm leading-7 outline-none"
                          />
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-slate-500">支持编辑已有文档，保存后可立即在工作台挂载使用。</div>
                            <button
                              onClick={handleSaveDocument}
                              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white"
                            >
                              <Save className="h-4 w-4" />
                              保存文档
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="mb-4 flex flex-wrap gap-2">
                            {currentDocument.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div
                            className="markdown-body min-h-[520px] rounded-[24px] border border-slate-200 bg-white px-5 py-5 text-sm leading-7 text-slate-800"
                            dangerouslySetInnerHTML={{ __html: marked.parse(currentDocument.content) as string }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </aside>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="p-5 md:p-8">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">AI 连接配置</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                      采用 Base URL + API Key + Model 的 OpenAI 兼容设计，同时兼容官方服务、代理网关和私有中转。
                    </p>
                  </div>
                  <div
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm',
                      saveState === 'saved' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {saveState === 'saved' ? <CheckCircle2 className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
                    {saveState === 'saved' ? '配置已保存' : '尚未保存本次修改'}
                  </div>
                </div>

                <div className="mb-5 rounded-[28px] border border-white/80 bg-white/82 p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900">快捷模板</div>
                  <div className="flex flex-wrap gap-2">
                    {aiProviderTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleProviderTemplate(template.id)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <section className="space-y-4 rounded-[32px] border border-white/80 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Globe className="h-4 w-4" />
                          Base URL
                        </label>
                        <input
                          value={settings.endpoint}
                          onChange={(event) => setSettings((prev) => ({ ...prev, endpoint: event.target.value }))}
                          placeholder="https://api.deepseek.com/v1"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <Brain className="h-4 w-4" />
                          Model
                        </label>
                        <input
                          value={settings.model}
                          onChange={(event) => setSettings((prev) => ({ ...prev, model: event.target.value }))}
                          placeholder="deepseek-chat"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <KeyRound className="h-4 w-4" />
                        API Key
                      </label>
                      <input
                        type="password"
                        value={settings.apiKey}
                        onChange={(event) => setSettings((prev) => ({ ...prev, apiKey: event.target.value }))}
                        placeholder="sk-..."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                      <div className="mt-2 text-xs text-slate-500">
                        已遮掩显示：{settings.apiKey ? maskApiKey(settings.apiKey) : '未填写'}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <PencilLine className="h-4 w-4" />
                        连接说明
                      </label>
                      <input
                        value={settings.providerName}
                        onChange={(event) => setSettings((prev) => ({ ...prev, providerName: event.target.value }))}
                        placeholder="例如：DeepSeek 生产环境"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleSaveSettings}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white"
                      >
                        <Save className="h-4 w-4" />
                        保存连接配置
                      </button>
                      <button
                        onClick={handleConnectivityTest}
                        disabled={testStatus === 'testing'}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 disabled:opacity-50"
                      >
                        {testStatus === 'testing' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
                        连通性测试
                      </button>
                    </div>

                    {testMessage && (
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-3 text-sm',
                          testStatus === 'success'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : testStatus === 'error'
                              ? 'border border-rose-200 bg-rose-50 text-rose-700'
                              : 'border border-slate-200 bg-slate-50 text-slate-600'
                        )}
                      >
                        {testMessage}
                      </div>
                    )}
                  </section>

                  <aside className="space-y-4 rounded-[32px] border border-white/80 bg-white/82 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <ShieldCheck className="h-4 w-4" />
                      兼容能力
                    </div>
                    <ul className="space-y-3 text-sm leading-6 text-slate-600">
                      <li>自动防止 Base URL 与 `/chat/completions` 重复拼接。</li>
                      <li>上游不支持流式时自动降级为非 stream 调用。</li>
                      <li>兼容 `choices.message.content`、`output_text`、数组片段等非标准字段。</li>
                      <li>错误会尽量带上 HTTP 状态、上游消息和网关名称，便于排查。</li>
                    </ul>

                    <div className="rounded-[26px] border border-slate-200 bg-slate-50/90 p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <RefreshCw className="h-4 w-4" />
                        已保存配置
                      </div>
                      <div className="space-y-2 text-sm text-slate-600">
                        <div>{settings.providerName || '未命名连接'}</div>
                        <div className="truncate">{settings.endpoint || '未配置 Base URL'}</div>
                        <div>{settings.model || '未配置模型'}</div>
                        <div>{settings.lastSavedAt ? `保存时间：${new Date(settings.lastSavedAt).toLocaleString('zh-CN')}` : '尚未保存'}</div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
