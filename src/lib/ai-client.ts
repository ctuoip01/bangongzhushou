/**
 * 统一多 Provider AI 客户端
 *
 * 支持的 Provider：
 *   ┌──────────────────────────────────────────────┐
 *   │ LLM Provider                                  │
 *   │  puter     — 免费 Google AI (Gemini/Gemma)    │
 *   │  siliconflow — 国内免费聚合 (DeepSeek/Qwen等) │
 *   │  openai    — OpenAI 官方                      │
 *   │  deepseek  — DeepSeek 官方                    │
 *   │  coze      — Coze 沙箱 (豆包)                 │
 *   │  custom    — 用户自填任意 OpenAI 兼容 API       │
 *   ├──────────────────────────────────────────────┤
 *   │ Search Provider                               │
 *   │  duckduckgo — 免费，无需 Key                  │
 *   │  tavily    — 推荐，1000次/月免费              │
 *   │  coze      — Coze 沙箱联网搜索                │
 *   └──────────────────────────────────────────────┘
 *
 * 环境变量：
 *   AI_PROVIDER        : puter | siliconflow | openai | deepseek | coze | custom
 *   AI_API_KEY         : API 密钥（puter 不需要）
 *   AI_BASE_URL        : 自定义 Base URL（custom 模式必须）
 *   AI_MODEL           : 模型名称
 *   SEARCH_PROVIDER    : duckduckgo | tavily | coze
 *   SEARCH_API_KEY     : 搜索 API 密钥（duckduckgo 不需要）
 */

// ════════════════════════════════════════════════════
//  类型定义
// ════════════════════════════════════════════════════

export interface StreamChunk {
  content: string;
}

export interface SearchResultItem {
  title: string;
  url: string;
  site_name: string;
  snippet: string;
  publish_time: string;
  auth_info_level: number;
  auth_info_des: string;
  summary?: string;
}

export interface SearchResponse {
  summary: string;
  web_items: SearchResultItem[];
}

export type LLMProvider = 'puter' | 'siliconflow' | 'openai' | 'deepseek' | 'coze' | 'custom';
export type SearchProvider = 'duckduckgo' | 'tavily' | 'coze';

/** Provider 配置描述 */
export interface ProviderInfo {
  id: LLMProvider;
  name: string;
  description: string;
  needApiKey: boolean;
  needBaseUrl: boolean;
  defaultModel: string;
  recommendedModels: Array<{ id: string; name: string; free?: boolean }>;
  /** 是否免费 */
  free: boolean;
  /** 注册地址 */
  signupUrl?: string;
}

export interface SearchProviderInfo {
  id: SearchProvider;
  name: string;
  description: string;
  needApiKey: boolean;
  free: boolean;
  signupUrl?: string;
}

// ════════════════════════════════════════════════════
//  所有可用 Provider 注册表
// ════════════════════════════════════════════════════

export const LLM_PROVIDERS: Record<string, ProviderInfo> = {
  puter: {
    id: 'puter',
    name: 'Puter.js (Google AI)',
    description: '免费无限使用 Google Gemini / Gemma 系列，无需 API Key',
    needApiKey: false,
    needBaseUrl: false,
    defaultModel: 'google/gemini-2.5-flash',
    recommendedModels: [
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', free: true },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', free: true },
      { id: 'google/gemini-2.0-flash', name: 'Gemini 2.0 Flash', free: true },
      { id: 'google/gemma-3-27b-it', name: 'Gemma 3 27B', free: true },
      { id: 'google/gemma-4-31b-it', name: 'Gemma 4 31B', free: true },
    ],
    free: true,
    signupUrl: 'https://developer.puter.com/',
  },
  siliconflow: {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    description: '国内大模型聚合平台，DeepSeek/Qwen/GLM 等，注册送额度',
    needApiKey: true,
    needBaseUrl: false,
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    recommendedModels: [
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', free: true },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1 推理', free: true },
      { id: 'Qwen/Qwen3-32B', name: '通义千问 32B', free: true },
      { id: 'Pro/zai-org/GLM-4.7', name: '智谱 GLM-4.7', free: true },
      { id: 'THUDM/glm-4-9b-chat', name: '清华 GLM-4 9B', free: true },
    ],
    free: true,
    signupUrl: 'https://cloud.siliconflow.cn',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI 官方 GPT-4o / o3 系列',
    needApiKey: true,
    needBaseUrl: false,
    defaultModel: 'gpt-4o-mini',
    recommendedModels: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'o3-mini', name: 'o3 Mini' },
      { id: 'o4-mini', name: 'o4 Mini' },
    ],
    free: false,
    signupUrl: 'https://platform.openai.com',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: '深度求索官方 API，V3/R1 推理模型',
    needApiKey: true,
    needBaseUrl: false,
    defaultModel: 'deepseek-chat',
    recommendedModels: [
      { id: 'deepseek-chat', name: 'DeepSeek V3' },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1 推理' },
    ],
    free: false,
    signupUrl: 'https://platform.deepseek.com',
  },
  coze: {
    id: 'coze',
    name: 'Coze 豆包 (沙箱)',
    description: '字节跳动豆包系列，仅限 Coze 平台沙箱环境',
    needApiKey: false,
    needBaseUrl: false,
    defaultModel: 'doubao-seed-2-0-pro-260215',
    recommendedModels: [
      { id: 'doubao-seed-2-0-pro-260215', name: '豆包 Pro 260215' },
      { id: 'doubao-seed-1-5-lite-250115', name: '豆包 Lite' },
    ],
    free: true,
  },
  custom: {
    id: 'custom',
    name: '自定义 API',
    description: '任意 OpenAI 兼容 API，手动填写地址和密钥',
    needApiKey: true,
    needBaseUrl: true,
    defaultModel: '',
    recommendedModels: [],
    free: false,
  },
};

export const SEARCH_PROVIDERS: Record<string, SearchProviderInfo> = {
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    description: '完全免费联网搜索，无需配置',
    needApiKey: false,
    free: true,
  },
  tavily: {
    id: 'tavily',
    name: 'Tavily',
    description: '专业搜索 API，每月 1000 次免费，稳定性高',
    needApiKey: true,
    free: true,
    signupUrl: 'https://app.tavily.com',
  },
  coze: {
    id: 'coze',
    name: 'Coze 沙箱搜索',
    description: 'Coze 平台内置联网搜索，仅沙箱可用',
    needApiKey: false,
    free: true,
  },
};

// ════════════════════════════════════════════════════
//  环境变量读取 & 配置解析
// ════════════════════════════════════════════════════

function getEnv(key: string): string | undefined {
  return process.env[key]?.trim() || undefined;
}

/** 获取当前 LLM Provider */
function getLLMProvider(): LLMProvider {
  const raw = getEnv('AI_PROVIDER') || '';
  // 兼容旧值映射
  const map: Record<string, LLMProvider> = {
    openai: 'openai',
    siliconflow: 'siliconflow',
    puter: 'puter',
    deepseek: 'deepseek',
    coze: 'coze',
    custom: 'custom',
    kimi: 'custom',
    zhipu: 'custom',
  };
  return map[raw] || 'puter'; // 默认用 Puter（零配置免费）
}

/** 获取当前搜索 Provider */
function getSearchProvider(): SearchProvider {
  const sp = getEnv('SEARCH_PROVIDER');
  if (sp === 'tavily') return 'tavily';
  if (sp === 'coze') return 'coze';
  return 'duckduckgo';
}

/** 解析当前 LLM 的完整配置 */
function resolveLLMConfig(options?: { model?: string }) {
  const provider = getLLMProvider();
  const info = LLM_PROVIDERS[provider];
  const apiKey = getEnv('AI_API_KEY') || '';
  const baseUrl = getEnv('AI_BASE_URL') || '';

  // 根据 Provider 确定 base URL
  let resolvedBaseUrl = baseUrl;
  if (!resolvedBaseUrl && provider !== 'puter' && provider !== 'coze') {
    // 使用预设 URL
    const presetUrls: Partial<Record<LLMProvider, string>> = {
      siliconflow: 'https://api.siliconflow.cn/v1',
      openai: 'https://api.openai.com/v1',
      deepseek: 'https://api.deepseek.com/v1',
    };
    resolvedBaseUrl = presetUrls[provider] || '';
  }

  return {
    provider,
    info,
    apiKey,
    baseUrl: resolvedBaseUrl,
    model: options?.model || getEnv('AI_MODEL') || info.defaultModel,
  };
}

// ════════════════════════════════════════════════════
//  Provider 实现：Puter.js（免费 Google AI）
// ════════════════════════════════════════════════════

async function* puterStream(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { model?: string; temperature?: number },
): AsyncGenerator<StreamChunk> {
  // 动态导入 Puter.js（避免在不需要时加载）
  let puterModule: typeof import('@heyputer/puter.js');
  try {
    puterModule = await import('@heyputer/puter.js');
  } catch {
    throw new Error(
      'Puter.js 未安装。请运行: pnpm add @heyputer/puter.js\n\n' +
      '或切换到其他 AI Provider（设置 AI_PROVIDER=siliconflow）',
    );
  }

  const model = options?.model || 'google/gemini-2.5-flash';
  const temp = options?.temperature ?? 0.7;

  // 合并 messages 为单条 prompt（Puter chat 接受字符串或数组）
  const prompt = messages.map(m => {
    if (m.role === 'system') return `[系统指令] ${m.content}`;
    return m.content;
  }).join('\n\n');

  try {
    const response = await puterModule.puter.ai.chat(prompt, {
      model,
      temperature: temp,
      stream: true,
    });

    // 流式迭代
    if (response && typeof response[Symbol.asyncIterator] === 'function') {
      for await (const part of response as AsyncIterable<unknown>) {
        const p = part as { text?: string; reasoning?: string };
        if (p?.text) yield { content: p.text };
      }
    } else if (typeof response === 'string') {
      // 非流式响应，一次性返回
      yield { content: response };
    }
  } catch (err) {
    throw new Error(`Puter AI 调用失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ════════════════════════════════════════════════════
//  Provider 实现：OpenAI 兼容（SiliconFlow/OpenAI/DeepSeek/Custom）
// ════════════════════════════════════════════════════

async function* openaiCompatibleStream(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  config: { apiKey: string; baseUrl: string; model: string; temperature?: number },
): AsyncGenerator<StreamChunk> {
  if (!config.apiKey) {
    const providerName = getLLMProvider();
    const info = LLM_PROVIDERS[providerName];
    throw new Error(
      `${info.name} 需要配置 API Key。\n\n` +
      `请在环境变量中设置 AI_API_KEY。\n` +
      (info.signupUrl ? `注册地址：${info.signupUrl}\n` : '') +
      '\n或切换到免费的 Puter.js（设置 AI_PROVIDER=puter），无需任何配置。',
    );
  }

  let resolvedBase = (config.baseUrl || '').trim().replace(/\/+$/, '');
  const chatUrl = /\/v1\/?$/.test(resolvedBase)
    ? `${resolvedBase.replace(/\/$/, '')}/chat/completions`
    : `${resolvedBase}/v1/chat/completions`;

  const res = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      temperature: config.temperature ?? 0.7,
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`${LLM_PROVIDERS[getLLMProvider()]?.name} 请求失败 (${res.status}): ${errText.slice(0, 300)}`);
  }
  if (!res.body) throw new Error('API 未返回响应流');

  const decoder = new TextDecoder();
  let buffer = '';
  const reader = res.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) yield { content };
        } catch { /* skip */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ════════════════════════════════════════════════════
//  Provider 实现：Coze SDK（沙箱回退）
// ════════════════════════════════════════════════════

async function* cozeSDKStream(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { model?: string; temperature?: number },
  requestHeaders?: Headers,
): AsyncGenerator<StreamChunk> {
  const { LLMClient, Config, HeaderUtils } = await import('coze-coding-dev-sdk');
  const customHeaders = HeaderUtils.extractForwardHeaders(requestHeaders || new Headers());
  const client = new LLMClient(new Config(), customHeaders);

  const stream = client.stream(messages, {
    model: options?.model || 'doubao-seed-2-0-pro-260215',
    temperature: options?.temperature ?? 0.7,
  });

  for await (const chunk of stream) {
    if (chunk.content) yield { content: chunk.content.toString() };
  }
}

// ════════════════════════════════════════════════════
//  搜索实现：Tavily
// ════════════════════════════════════════════════════

async function tavilySearch(query: string, opts?: { count?: number }): Promise<SearchResponse> {
  const apiKey = getEnv('SEARCH_API_KEY') || getEnv('AI_API_KEY');
  if (!apiKey) {
    throw new Error(
      'Tavily 搜索未配置。请设置环境变量:\n' +
      '  SEARCH_PROVIDER=tavily\n' +
      '  SEARCH_API_KEY=tvly-你的Key\n\n' +
      '免费注册：https://app.tavily.com （GitHub 登录即可）\n' +
      '或改用 DuckDuckGo（不设置 SEARCH_PROVIDER 即可自动使用）',
    );
  }

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: Math.min(opts?.count || 10, 20),
      include_answer: true,
      include_raw_content: false,
      search_depth: 'basic',
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Tavily 搜索失败 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    answer: string;
    results: Array<{
      title: string; url: string; content: string;
      score: number; published_date?: string;
    }>;
  };

  return {
    summary: data.answer || '',
    web_items: (data.results || []).map(item => ({
      title: item.title || '', url: item.url || '',
      site_name: extractDomain(item.url),
      snippet: item.content?.slice(0, 300) || '',
      publish_time: item.published_date || '',
      auth_info_level: inferAuthLevel(item.url), auth_info_des: '',
    })),
  };
}

// ════════════════════════════════════════════════════
//  搜索实现：DuckDuckGo（多镜像 + 超时保护）
// ════════════════════════════════════════════════════

/** DDG 镜像列表（按优先级排序） */
const DDG_MIRRORS = [
  'https://dukgo.com',           // 国内镜像（推荐）
  'https://html.duckduckgo.com', // 原始地址
];

async function duckduckgoSearch(query: string, opts?: { count?: number }): Promise<SearchResponse> {
  const encodedQuery = encodeURIComponent(query);
  const count = Math.min(opts?.count || 10, 15);

  // 依次尝试所有镜像，任一成功即返回
  let lastError: Error | null = null;

  for (const mirror of DDG_MIRRORS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000); // 8 秒超时

      const res = await fetch(`${mirror}/html/?q=${encodedQuery}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        lastError = new Error(`DuckDuckGo (${mirror}) 返回 ${res.status}`);
        continue;
      }

      const html = await res.text();

      // 快速判断是否有结果
      if (!html.includes('result__') && !html.includes('result__a') && !html.includes('class="result')) {
        lastError = new Error(`${mirror} 未返回有效搜索结果`);
        continue;
      }

      const items = parseDdgResults(html).slice(0, count);
      if (items.length === 0) {
        lastError = new Error(`${mirror} 解析到 0 条结果`);
        continue;
      }

      return {
        summary: `找到 ${items.length} 条相关结果`,
        web_items: items,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // 如果是 abort（超时），继续尝试下一个镜像
      if ((err as Error)?.name !== 'AbortError' && !String(err).includes('abort')) {
        continue; // 网络错误也尝试下一个
      }
    }
  }

  // 所有镜像都失败 → 尝试 LLM 兜底生成
  throw new Error(
    `联网搜索暂时不可用（${lastError?.message || '未知原因'}）。\n\n` +
    `可能原因：\n` +
    `- 国内网络环境限制\n` +
    `- DuckDuckGo 服务不稳定\n\n` +
    `建议方案：\n` +
    `1. 配置 Tavily 搜索（更稳定）：在 AI 配置面板选择「Tavily」搜索引擎\n` +
    `2. 注册免费 Key：https://app.tavily.com （每月 1000 次免费）\n` +
    `3. 或使用 Coze 沙箱环境的内置搜索能力`
  );
}

// ════════════════════════════════════════════════════
//  搜索实现：Coze SDK
// ════════════════════════════════════════════════════

async function cozeSearch(requestHeaders: Headers, query: string, opts?: { count?: number; timeRange?: string }): Promise<SearchResponse> {
  const { SearchClient, Config, HeaderUtils } = await import('coze-coding-dev-sdk');
  const client = new SearchClient(new Config(), HeaderUtils.extractForwardHeaders(requestHeaders));
  const result = await client.advancedSearch(query, {
    count: opts?.count || 10,
    timeRange: opts?.timeRange || '3m',
    needSummary: true,
    needContent: false,
    needUrl: true,
  });
  return result as unknown as SearchResponse;
}

// ════════════════════════════════════════════════════
//  辅助工具函数
// ════════════════════════════════════════════════════

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch { return ''; }
}

function inferAuthLevel(url: string): number {
  const d = extractDomain(url).toLowerCase();
  if (/\.gov\.cn$|\.gov$/.test(d)) return 4;
  if (/\.edu\.cn$|\.edu$|.org\.cn$|.org$/.test(d)) return 3;
  if (/\.com\.cn$|\.com$/.test(d)) return 2;
  return 1;
}

function parseDdgResults(html: string): SearchResultItem[] {
  const items: SearchResultItem[] = [];
  const resultRegex = /class="result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="result|$)/g;
  const titleRegex = /class="result__a"[^>]*href="([^"]*)"[^>]*>\s*<[^>]*>([\s\S]*?)<\/[^>]+>/;
  const snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/[at]/g;

  let match;
  while ((match = resultRegex.exec(html)) !== null) {
    const block = match[1];
    const tm = block.match(titleRegex);
    if (!tm) continue;

    const rawTitle = tm[2].replace(/<[^>]+>/g, '').trim();
    const link = tm[1];
    snippetRegex.lastIndex = 0;
    const sm = snippetRegex.exec(block);
    const snippet = sm ? sm[1].replace(/<[^>]+>/g, '').trim().slice(0, 300) : '';

    if (rawTitle && link) {
      items.push({
        title: decodeHtml(rawTitle),
        url: link.startsWith('//') ? 'https:' + link : link,
        site_name: extractDomain(link),
        snippet: decodeHtml(snippet),
        publish_time: '', auth_info_level: inferAuthLevel(link),
        auth_info_des: '',
      });
    }
  }
  return items;
}

function decodeHtml(t: string): string {
  return t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ');
}

// ════════════════════════════════════════════════════
//  统一公开接口
// ════════════════════════════════════════════════════

/**
 * 创建流式 LLM 调用
 * 自动根据 AI_PROVIDER 环境变量选择 Provider
 */
export function createStream(
  requestHeaders: Headers,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { model?: string; temperature?: number },
): AsyncGenerator<StreamChunk> {
  const config = resolveLLMConfig(options);
  const temperature = options?.temperature ?? 0.7;

  switch (config.provider) {
    case 'puter':
      return puterStream(messages, { ...options, model: config.model, temperature });

    case 'coze':
      return cozeSDKStream(messages, { ...options, model: config.model, temperature }, requestHeaders);

    case 'siliconflow':
    case 'openai':
    case 'deepseek':
    case 'custom':
    default:
      return openaiCompatibleStream(messages, {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        temperature,
      });
  }
}

/**
 * 执行联网搜索
 * 自动根据 SEARCH_PROVIDER 选择搜索引擎
 * 内置多重 fallback：Tavily → DuckDuckGo（多镜像）→ LLM 兜底
 */
export async function performSearch(
  requestHeaders: Headers,
  query: string,
  opts?: { count?: number; timeRange?: string; needSummary?: boolean },
): Promise<SearchResponse> {
  const sp = getSearchProvider();
  const count = opts?.count || 10;

  // 策略 1：用户指定的搜索引擎
  try {
    switch (sp) {
      case 'tavily': return await tavilySearch(query, opts);
      case 'coze': return await cozeSearch(requestHeaders, query, opts);
      case 'duckduckgo':
      default: return await duckduckgoSearch(query, opts);
    }
  } catch (primaryErr) {
    // 如果不是 DDG，且主搜索失败 → 尝试 DDG 作为 fallback
    if (sp !== 'duckduckgo') {
      try {
        return await duckduckgoSearch(query, opts);
      } catch { /* DDG 也失败，继续走 LLM 兜底 */ }
    }

    // 策略 2：LLM 兜底生成
    try {
      return await llmSearchFallback(requestHeaders, query, { count });
    } catch (llmErr) {
      // 所有策略都失败了，返回原始错误
      throw new Error(
        `${primaryErr instanceof Error ? primaryErr.message : String(primaryErr)}\n\n` +
        `LLM 兜底也失败: ${llmErr instanceof Error ? llmErr.message : String(llmErr)}`
      );
    }
  }
}

/**
 * LLM 兜底搜索：当所有搜索引擎不可用时，
 * 用已配置的 AI 大模型基于其训练知识生成搜索结果
 */
async function llmSearchFallback(
  requestHeaders: Headers,
  query: string,
  opts?: { count?: number },
): Promise<SearchResponse> {
  const prompt = `你是一个专业的研究助手。请根据你的知识库为以下搜索词提供相关信息。

搜索关键词：${query}

请以 JSON 数组格式返回 5-8 条相关结果，每条包含：
- title: 标题（简明扼要）
- url: 相关的官方或权威网站 URL（如果知道的话）
- snippet: 100-200 字的摘要说明

要求：
1. 覆盖政策文件、行业报告、新闻动态等多个角度
2. 优先提供 gov.cn / edu.cn 等权威来源
3. 标注信息的大致时间范围（如"2024-2025年"、"近期"等）
4. 内容客观准确，标注"【AI知识库生成】"

仅输出 JSON 数组，不要其他文字。`;

  let fullContent = '';
  const stream = createStream(requestHeaders, [{ role: 'user', content: prompt }], { temperature: 0.3 });
  for await (const chunk of stream) {
    if (chunk.content) fullContent += chunk.content;
  }

  // 从 LLM 输出中解析 JSON
  const jsonMatch = fullContent.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    // 解析失败时用文本包装返回
    return {
      summary: '【AI 知识库生成】以下内容基于大语言模型训练数据生成，可能存在时效性限制。',
      web_items: [{
        title: `${query} - 综合信息`,
        url: '',
        site_name: 'AI 知识库',
        snippet: fullContent.slice(0, 500),
        publish_time: new Date().toISOString().slice(0, 10),
        auth_info_level: 1,
        auth_info_des: 'AI 生成内容',
      }],
    };
  }

  try {
    const items = JSON.parse(jsonMatch[0]) as Array<{ title: string; url: string; snippet: string }>;
    return {
      summary: `【AI 知识库生成】找到 ${items.length} 条相关参考信息。注：内容基于模型训练数据，建议通过 Tavily 等搜索引擎获取最新实时结果。`,
      web_items: items.map(item => ({
        title: item.title || '',
        url: item.url || '',
        site_name: item.url ? extractDomain(item.url) : 'AI 知识库',
        snippet: (item.snippet || '').slice(0, 300),
        publish_time: '',
        auth_info_level: item.url ? inferAuthLevel(item.url) : 1,
        auth_info_des: 'AI 生成',
      })),
    };
  } catch {
    // JSON 解析失败
    return {
      summary: '【AI 知识库生成】基于模型知识的综合分析',
      web_items: [{
        title: `${query} - AI 分析`,
        url: '',
        site_name: 'AI 知识库',
        snippet: fullContent.slice(0, 500),
        publish_time: new Date().toISOString().slice(0, 10),
        auth_info_level: 1,
        auth_info_des: 'AI 生成内容',
      }],
    };
  }
}

/**
 * 获取当前 LLM Provider 信息（供前端展示）
 */
export function getCurrentLLMConfig(): {
  provider: LLMProvider;
  info: ProviderInfo;
  model: string;
  hasApiKey: boolean;
} {
  const config = resolveLLMConfig();
  return {
    provider: config.provider,
    info: config.info,
    model: config.model,
    hasApiKey: !!config.apiKey,
  };
}

/**
 * 获取当前搜索 Provider 信息
 */
export function getCurrentSearchConfig(): {
  provider: SearchProvider;
  info: SearchProviderInfo;
  hasApiKey: boolean;
} {
  const sp = getSearchProvider();
  const info = SEARCH_PROVIDERS[sp];
  return { provider: sp, info, hasApiKey: !!getEnv('SEARCH_API_KEY') || !!getEnv('AI_API_KEY') };
}
