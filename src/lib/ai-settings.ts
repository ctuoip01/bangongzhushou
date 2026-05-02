'use client';

export interface AIConnectionSettings {
  endpoint: string;
  apiKey: string;
  model: string;
  providerName: string;
  // 搜索配置
  searchProvider: string;
  searchApiKey: string;
  lastSavedAt?: string;
}

export interface AIProviderTemplate {
  id: string;
  label: string;
  providerName: string;
  endpoint: string;
  model: string;
  /** 是否需要 API Key */
  requiresKey: boolean;
  /** 费用描述 */
  feeDesc: string;
  /** 分类 */
  category?: 'free' | 'freemium' | 'paid' | 'custom';
}

export interface SearchProviderTemplate {
  id: string;
  label: string;
  requiresKey: boolean;
  feeDesc: string;
}

const STORAGE_KEY = 'zhiyan-ai-connection';

// ─── LLM Provider 模板 ──────────────────────

export const aiProviderTemplates: AIProviderTemplate[] = [
  // ===== 免费无需 Key =====
  {
    id: 'puter',
    label: 'Puter.js',
    providerName: 'Puter（免费）',
    endpoint: 'puter',
    model: 'gemini-2.5-flash',
    requiresKey: false,
    feeDesc: '免费无限制，Google Gemini 等多模型可用',
    category: 'free',
  },
  // ===== 国内免费平台 =====
  {
    id: 'siliconflow-deepseek',
    label: 'SiliconFlow',
    providerName: 'SiliconFlow · DeepSeek-V3',
    endpoint: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
    requiresKey: true,
    feeDesc: '注册送额度，DeepSeek-V3 完全免费',
    category: 'freemium',
  },
  {
    id: 'siliconflow-r1',
    label: 'SF·R1 推理',
    providerName: 'SiliconFlow · DeepSeek-R1',
    endpoint: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-R1',
    requiresKey: true,
    feeDesc: '注册送额度，深度推理链模型',
    category: 'freemium',
  },
  {
    id: 'siliconflow-qwen',
    label: 'SF·通义千问',
    providerName: 'SiliconFlow · Qwen3-8B',
    endpoint: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen3-8B',
    requiresKey: true,
    feeDesc: '注册送额度，通义千问轻量版',
    category: 'freemium',
  },
  {
    id: 'siliconflow-glm',
    label: 'SF·智谱GLM',
    providerName: 'SiliconFlow · GLM-4.7',
    endpoint: 'https://api.siliconflow.cn/v1',
    model: 'Pro/zai-org/GLM-4.7',
    requiresKey: true,
    feeDesc: '注册送额度，智谱最新模型',
    category: 'freemium',
  },
  // ===== 国外官方 API =====
  {
    id: 'deepseek',
    label: 'DeepSeek',
    providerName: 'DeepSeek 官方',
    endpoint: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    requiresKey: true,
    feeDesc: '低价付费，超值推理能力',
    category: 'paid',
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    providerName: '智谱 GLM',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    requiresKey: true,
    feeDesc: '国内领先，部分模型免费',
    category: 'paid',
  },
  {
    id: 'kimi',
    label: 'Kimi',
    providerName: 'Moonshot Kimi',
    endpoint: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    requiresKey: true,
    feeDesc: '长文本能力强',
    category: 'paid',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    providerName: 'OpenAI GPT',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    requiresKey: true,
    feeDesc: '业界标杆',
    category: 'paid',
  },
  // ===== 自定义网关 =====
  {
    id: 'custom',
    label: '自定义网关',
    providerName: '自定义兼容网关',
    endpoint: 'https://your-gateway.example.com/v1',
    model: 'your-model',
    requiresKey: true,
    feeDesc: '支持任何 OpenAI 兼容 API',
    category: 'custom',
  },
];

// ─── Search Provider 模板 ───────────────────

export const searchProviderTemplates: SearchProviderTemplate[] = [
  {
    id: 'duckduckgo',
    label: 'DuckDuckGo',
    requiresKey: false,
    feeDesc: '完全免费，已内置 DukGo 国内镜像加速',
  },
  {
    id: 'tavily',
    label: 'Tavily',
    requiresKey: true,
    feeDesc: '每月 1000 次免费，更稳定',
  },
  {
    id: 'coze',
    label: 'Coze SDK',
    requiresKey: false,
    feeDesc: '仅 Coze 沙箱环境可用',
  },
];

export const defaultAISettings: AIConnectionSettings = {
  endpoint: 'puter',          // 默认使用 Puter 免费
  apiKey: '',
  model: 'gemini-2.5-flash',
  providerName: 'Puter（免费）',
  searchProvider: 'duckduckgo',
  searchApiKey: '',
};

export function getAISettings(): AIConnectionSettings {
  if (typeof window === 'undefined') return defaultAISettings;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAISettings;

    const parsed = JSON.parse(raw) as Partial<AIConnectionSettings>;
    return {
      endpoint: parsed.endpoint || defaultAISettings.endpoint,
      apiKey: parsed.apiKey || '',
      model: parsed.model || defaultAISettings.model,
      providerName: parsed.providerName || defaultAISettings.providerName,
      searchProvider: parsed.searchProvider || defaultAISettings.searchProvider,
      searchApiKey: parsed.searchApiKey || '',
      lastSavedAt: parsed.lastSavedAt,
    };
  } catch {
    return defaultAISettings;
  }
}

export function saveAISettings(settings: AIConnectionSettings): AIConnectionSettings {
  if (typeof window === 'undefined') return settings;

  const next = {
    ...settings,
    endpoint: settings.endpoint.trim(),
    apiKey: settings.apiKey.trim(),
    model: settings.model.trim(),
    providerName: settings.providerName.trim(),
    searchProvider: settings.searchProvider.trim() || 'duckduckgo',
    searchApiKey: settings.searchApiKey.trim(),
    lastSavedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function maskApiKey(apiKey: string) {
  const value = apiKey.trim();
  if (!value) return '';
  if (value.length <= 8) return '*'.repeat(value.length);
  return `${value.slice(0, 4)}${'*'.repeat(Math.max(4, value.length - 8))}${value.slice(-4)}`;
}
