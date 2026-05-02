'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, CircleDashed, Globe, KeyRound, Brain, LoaderCircle,
  Save, TestTube2, Sparkles, Zap, Search, Info, ChevronDown,
} from 'lucide-react';
import { ModuleGlyph } from '@/components/module-glyph';
import { BUILT_IN_MODULES, type AIModule } from '@/config/modules';
import {
  aiProviderTemplates,
  searchProviderTemplates,
  defaultAISettings,
  getAISettings,
  maskApiKey,
  saveAISettings,
  type AIConnectionSettings,
} from '@/lib/ai-settings';

/** 模块分类标签 */
const categoryLabels: Record<string, string> = {
  builtIn: '内置模块',
  custom: '自定义',
  plugin: '插件',
};

function groupByCategory(modules: AIModule[]) {
  const groups = new Map<string, AIModule[]>();
  for (const mod of modules) {
    const list = groups.get(mod.category) ?? [];
    list.push(mod);
    groups.set(mod.category, list);
  }
  return groups;
}

export default function HomePage() {
  const [settings, setSettings] = useState<AIConnectionSettings>(defaultAISettings);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'llm' | 'search'>('llm');

  // 初始化
  if (typeof window !== 'undefined' && settings === defaultAISettings) {
    const saved = getAISettings();
    if (saved !== defaultAISettings) {
      setSettings(saved);
    }
  }

  const handleSave = () => {
    const next = saveAISettings(settings);
    setSettings(next);
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2200);
  };

  /** 选择 LLM 模板 */
  const handleLLMTemplate = (templateId: string) => {
    const t = aiProviderTemplates.find((item) => item.id === templateId);
    if (!t) return;
    setSettings((prev) => ({
      ...prev,
      endpoint: t.endpoint,
      model: t.model,
      providerName: t.providerName,
      // Puter 不需要 key，清空
      apiKey: !t.requiresKey ? '' : prev.apiKey,
    }));
  };

  /** 选择搜索模板 */
  const handleSearchTemplate = (templateId: string) => {
    const t = searchProviderTemplates.find((item) => item.id === templateId);
    if (!t) return;
    setSettings((prev) => ({
      ...prev,
      searchProvider: t.id,
      searchApiKey: !t.requiresKey ? '' : prev.searchApiKey,
    }));
  };

  /** 测试连通性 */
  const handleTest = async () => {
    setTestStatus('testing');
    setTestMessage('正在测试连接...');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: '你是一个连接测试助手。',
          userInput: '请仅回复：连接成功',
          endpoint: settings.endpoint,
          apiKey: settings.apiKey,
          model: settings.model,
          providerName: settings.providerName,
          requestOptions: { timeoutMs: 15000, stream: false, testMode: true },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '连接失败');
      setTestStatus('success');
      setTestMessage(data.content || '连接成功');
    } catch (err) {
      setTestStatus('error');
      setTestMessage(err instanceof Error ? err.message : '连接测试失败');
    }
  };

  const allModules = BUILT_IN_MODULES;
  const groups = groupByCategory(allModules);

  const isConfigured = !!settings.apiKey?.trim() || settings.endpoint === 'puter';
  const isPuterMode = settings.endpoint === 'puter';

  // 按 category 分组 Provider 模板
  const freeProviders = aiProviderTemplates.filter((p) => p.category === 'free');
  const freemiumProviders = aiProviderTemplates.filter((p) => p.category === 'freemium');
  const paidProviders = aiProviderTemplates.filter((p) => p.category === 'paid');
  const customProviders = aiProviderTemplates.filter((p) => p.category === 'custom');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="border-b border-white/60 bg-white/50 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-800 to-slate-900 p-2.5 shadow-lg">
              <ModuleGlyph module={allModules[0]} className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">智研助手</h1>
              <p className="text-xs text-slate-500">咨询报告一站式创作平台</p>
            </div>
          </div>

          <nav className="flex items-center gap-5">
            {/* AI 配置按钮 */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isConfigured
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border border-blue-200 bg-blue-50 text-blue-700'
              }`}
            >
              {saveState === 'saved' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Brain className="h-3.5 w-3.5" />
              )}
              AI 大模型配置
            </button>
            <Link href="/module/document-check" className="text-sm text-slate-600 transition hover:text-slate-900">
              文档校验
            </Link>
            <Link href="/module/report-generate" className="text-sm text-slate-600 transition hover:text-slate-900">
              报告生成
            </Link>
            <Link href="/module/policy-search" className="text-sm text-slate-600 transition hover:text-slate-900">
              政策搜索
            </Link>
            <Link href="/module/ppt-helper" className="text-sm text-slate-600 transition hover:text-slate-900">
              PPT助手
            </Link>
          </nav>
        </div>
      </header>

      {/* AI 设置面板（可折叠） */}
      {showSettings && (
        <div className="border-b border-white/60 bg-white/40 backdrop-blur-xl">
          <div className="mx-auto max-w-[1400px] px-6 py-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              {/* 左侧：配置区 */}
              <div className="space-y-4 rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm">
                {/* 标题栏 */}
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">AI 服务配置</span>
                  {saveState === 'saved' && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">已保存</span>
                  )}
                </div>

                {/* Tab 切换 */}
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    onClick={() => setActiveTab('llm')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                      activeTab === 'llm'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    LLM 大模型
                  </button>
                  <button
                    onClick={() => setActiveTab('search')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                      activeTab === 'search'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Search className="h-3.5 w-3.5" />
                    联网搜索
                  </button>
                </div>

                {activeTab === 'llm' ? (
                  /* ===== LLM 配置面板 ===== */
                  <>
                    {/* 免费推荐置顶 */}
                    {freeProviders.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                          <Zap className="h-3 w-3" /> 推荐 · 完全免费
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {freeProviders.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => handleLLMTemplate(t.id)}
                              className={`group relative rounded-xl border px-3.5 py-2.5 text-left transition ${
                                settings.providerName === t.providerName
                                  ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`text-xs font-semibold ${settings.providerName === t.providerName ? 'text-emerald-700' : 'text-slate-800'}`}>
                                {t.label}
                              </div>
                              <div className="mt-0.5 text-[11px] text-emerald-600">{t.feeDesc}</div>
                              {!t.requiresKey && (
                                <span className="mt-1 inline-block rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">无需 API Key</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 国内免费平台 */}
                    {freemiumProviders.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                          <Globe className="h-3 w-3" /> 国内平台 · 注册送额度
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {freemiumProviders.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => handleLLMTemplate(t.id)}
                              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                                settings.providerName === t.providerName
                                  ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <div className={`text-xs font-semibold ${settings.providerName === t.providerName ? 'text-blue-700' : 'text-slate-800'}`}>
                                {t.label}
                              </div>
                              <div className="mt-0.5 text-[10px] text-slate-500">{t.feeDesc}</div>
                            </button>
                          ))}
                        </div>
                        <a
                          href="https://cloud.siliconflow.cn"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700"
                        >
                          <Info className="h-3 w-3" /> SiliconFlow 注册地址 →
                        </a>
                      </div>
                    )}

                    {/* 付费官方 */}
                    {paidProviders.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          官方 API · 付费
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {paidProviders.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => handleLLMTemplate(t.id)}
                              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                                settings.providerName === t.providerName
                                  ? 'border-slate-400 bg-slate-100 ring-1 ring-slate-300'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <div className={`text-xs font-semibold ${settings.providerName === t.providerName ? 'text-slate-800' : 'text-slate-700'}`}>{t.label}</div>
                              <div className="mt-0.5 text-[10px] text-slate-400">{t.feeDesc}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 自定义网关 */}
                    {customProviders.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          自定义网关
                        </div>
                        {customProviders.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleLLMTemplate(t.id)}
                            className={`block w-full rounded-xl border px-3.5 py-2.5 text-left transition ${
                              settings.providerName === t.providerName
                                ? 'border-slate-400 bg-slate-100 ring-1 ring-slate-300'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="text-xs font-semibold text-slate-700">{t.label}</div>
                            <div className="mt-0.5 text-[10px] text-slate-400">{t.feeDesc}</div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 手动输入（非 Puter 模式时显示） */}
                    {!isPuterMode && (
                      <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4">
                        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">手动配置</div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                              <Globe className="h-3.5 w-3.5" /> Base URL
                            </label>
                            <input
                              value={settings.endpoint}
                              onChange={(e) => setSettings((s) => ({ ...s, endpoint: e.target.value }))}
                              placeholder="https://api.openai.com/v1"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                          </div>
                          <div>
                            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                              <Brain className="h-3.5 w-3.5" /> Model
                            </label>
                            <input
                              value={settings.model}
                              onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
                              placeholder="gpt-4o-mini"
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <KeyRound className="h-3.5 w-3.5" /> API Key
                          </label>
                          <input
                            type="password"
                            value={settings.apiKey}
                            onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                            placeholder="sk-..."
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                          />
                          <p className="mt-1 text-[11px] text-slate-400">
                            已遮掩：{settings.apiKey ? maskApiKey(settings.apiKey) : '未填写'}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* ===== 搜索配置面板 ===== */
                  <div className="space-y-3">
                    <p className="text-xs leading-relaxed text-slate-500">
                      联网搜索用于政策搜索等功能。选择一个搜索引擎即可，不配置时默认使用 DuckDuckGo 免费搜索。
                    </p>

                    <div className="space-y-2">
                      {searchProviderTemplates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleSearchTemplate(t.id)}
                          className={`flex w-full items-start justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${
                            settings.searchProvider === t.id
                              ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${settings.searchProvider === t.id ? 'text-blue-700' : 'text-slate-800'}`}>
                              {t.label}
                              {!t.requiresKey && (
                                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">免费无需 Key</span>
                              )}
                              {t.id === 'coze' && (
                                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">仅沙箱</span>
                              )}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">{t.feeDesc}</div>
                          </div>
                          {settings.searchProvider === t.id && (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Tavily Key 输入 */}
                    {settings.searchProvider === 'tavily' && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4">
                        <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                          <KeyRound className="h-3.5 w-3.5" /> Tavily API Key
                        </label>
                        <input
                          type="password"
                          value={settings.searchApiKey}
                          onChange={(e) => setSettings((s) => ({ ...s, searchApiKey: e.target.value }))}
                          placeholder="tvly-..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
                        />
                        <p className="mt-1.5 text-[11px] text-slate-400">
                          在{' '}
                          <a href="https://app.tavily.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                            app.tavily.com
                          </a>{' '}
                          免费注册获取 API Key（每月 1000 次免费）
                        </p>
                      </div>
                    )}

                    <div className="flex items-start gap-2 rounded-lg bg-amber-50/60 p-3">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <p className="text-[11px] leading-relaxed text-amber-700">
                        提示：DuckDuckGo 无需任何配置即可使用。Tavily 更稳定但需要注册。
                        如在 Coze 平台沙箱中运行，可自动使用 Coze 内置搜索能力。
                      </p>
                    </div>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    <Save className="h-3.5 w-3.5" />
                    保存配置
                  </button>
                  {!isPuterMode && (
                    <button
                      onClick={handleTest}
                      disabled={testStatus === 'testing'}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
                    >
                      {testStatus === 'testing' ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <TestTube2 className="h-3.5 w-3.5" />
                      )}
                      测试连通性
                    </button>
                  )}
                </div>

                {testMessage && (
                  <div
                    className={`rounded-xl px-3 py-2.5 text-sm ${
                      testStatus === 'success'
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : testStatus === 'error'
                          ? 'border border-rose-200 bg-rose-50 text-rose-700'
                          : 'border border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {testMessage}
                  </div>
                )}
              </div>

              {/* 右侧：当前状态卡片 */}
              <aside className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">当前已保存</div>

                <div className="space-y-3">
                  {/* LLM 状态 */}
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">LLM 大模型</div>
                    <div className="space-y-1.5 text-sm text-slate-600">
                      <div><span className="text-slate-400">名称：</span>{settings.providerName || '-'}</div>
                      {isPuterMode ? (
                        <div><span className="text-slate-400">模式：</span><span className="font-medium text-emerald-600">Puter.js 免费</span></div>
                      ) : (
                        <>
                          <div className="truncate"><span className="text-slate-400">Endpoint：</span>{settings.endpoint || '-'}</div>
                          <div><span className="text-slate-400">Model：</span>{settings.model || '-'}</div>
                          <div><span className="text-slate-400">API Key：</span>{settings.apiKey ? maskApiKey(settings.apiKey) : '未填写'}</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 搜索状态 */}
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">联网搜索</div>
                    <div className="space-y-1.5 text-sm text-slate-600">
                      <div><span className="text-slate-400">引擎：</span>
                          {searchProviderTemplates.find(s => s.id === settings.searchProvider)?.label || settings.searchProvider}
                        </div>
                      </div>
                  </div>

                  {/* 保存时间 */}
                  <div className="pt-1 text-xs text-slate-400">
                    状态：{settings.lastSavedAt ? `已于 ${new Date(settings.lastSavedAt).toLocaleString('zh-CN')} 保存` : '尚未保存'}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-[1400px] px-6 py-10">
        {/* Hero */}
        <section className="mb-12 text-center">
          <h2 className="mb-3 text-4xl font-bold tracking-tight text-slate-900">
            AI 驱动的咨询工作台
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-500">
            选择下方模块开始使用，支持文档格式校验、报告生成、政策搜索、PPT 大纲设计等核心咨询场景。
          </p>
        </section>

        {/* 模块卡片 */}
        <section className="mb-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...allModules].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)).map((mod) => (
              <Link
                key={mod.id}
                href={`/module/${mod.id}`}
                className="group rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)]"
              >
                <div className="mb-4 inline-flex rounded-2xl border border-slate-100 bg-slate-50 p-3 transition group-hover:bg-white group-hover:shadow-md">
                  <ModuleGlyph module={mod} className="h-6 w-6 text-slate-700" />
                </div>
                <h3 className="mb-1.5 text-base font-semibold text-slate-900">{mod.name}</h3>
                <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500">{mod.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {mod.inputTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-full border border-slate-100 bg-slate-50/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-500"
                    >
                      {type === 'text' && '文本'}
                      {type === 'url' && '链接'}
                      {type === 'document' && '文档'}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/60 bg-white/30 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-6 py-6 text-center text-xs text-slate-400">
          智研助手 &middot; 基于 Next.js 构建 &middot; 数据存储于浏览器本地
        </div>
      </footer>
    </div>
  );
}
