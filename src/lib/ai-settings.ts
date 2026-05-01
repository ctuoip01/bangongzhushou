'use client';

export interface AIConnectionSettings {
  endpoint: string;
  apiKey: string;
  model: string;
  providerName: string;
  lastSavedAt?: string;
}

export interface AIProviderTemplate {
  id: string;
  label: string;
  providerName: string;
  endpoint: string;
  model: string;
}

const STORAGE_KEY = 'zhiyan-ai-connection';

export const aiProviderTemplates: AIProviderTemplate[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    providerName: 'DeepSeek 官方',
    endpoint: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  {
    id: 'zhipu',
    label: '智谱',
    providerName: '智谱 GLM',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
  },
  {
    id: 'kimi',
    label: 'Kimi',
    providerName: 'Moonshot Kimi',
    endpoint: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
  },
  {
    id: 'moonshot',
    label: 'Moonshot',
    providerName: 'Moonshot 国际',
    endpoint: 'https://api.moonshot.ai/v1',
    model: 'moonshot-v1-8k',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    providerName: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  {
    id: 'custom',
    label: '自定义',
    providerName: '自定义兼容网关',
    endpoint: 'https://your-gateway.example.com/v1',
    model: 'your-model',
  },
];

export const defaultAISettings: AIConnectionSettings = {
  endpoint: aiProviderTemplates[0].endpoint,
  apiKey: '',
  model: aiProviderTemplates[0].model,
  providerName: aiProviderTemplates[0].providerName,
};

export function getAISettings(): AIConnectionSettings {
  if (typeof window === 'undefined') {
    return defaultAISettings;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAISettings;

    const parsed = JSON.parse(raw) as Partial<AIConnectionSettings>;
    return {
      endpoint: parsed.endpoint || defaultAISettings.endpoint,
      apiKey: parsed.apiKey || '',
      model: parsed.model || defaultAISettings.model,
      providerName: parsed.providerName || defaultAISettings.providerName,
      lastSavedAt: parsed.lastSavedAt,
    };
  } catch {
    return defaultAISettings;
  }
}

export function saveAISettings(settings: AIConnectionSettings) {
  if (typeof window === 'undefined') return settings;

  const next = {
    ...settings,
    endpoint: settings.endpoint.trim(),
    apiKey: settings.apiKey.trim(),
    model: settings.model.trim(),
    providerName: settings.providerName.trim(),
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

