/**
 * 统一多 Provider AI 客户端
 *
 * 支持的 Provider：
 *   ┌──────────────────────────────────────────────┐
 *   │ LLM Provider                                  │
 *   │  siliconflow — 国内免费聚合 (DeepSeek/Qwen等) │
 *   │  gemini     — Google Gemini REST API (免费)    │
 *   │  puter      — Puter.js (仅浏览器端)            │
 *   │  openai     — OpenAI 官方                      │
 *   │  deepseek   — DeepSeek 官方                    │
 *   │  coze       — Coze 沙箱 (豆包)                 │
 *   │  custom     — 用户自填任意 OpenAI 兼容 API       │
 *   ├──────────────────────────────────────────────┤
 *   │ Search Provider                               │
 *   │  bing       — Azure Bing Search (国内可用)     │
 *   │  duckduckgo — 免费，无需 Key                  │
 *   │  tavily     — 推荐，1000次/月免费              │
 *   │  coze       — Coze 沙箱联网搜索                │
 *   └──────────────────────────────────────────────┘
 *
 * 环境变量：
 *   AI_PROVIDER        : siliconflow | gemini | puter | openai | deepseek | coze | custom
 *   AI_API_KEY         : API 密钥（gemini/puter 不需要特殊 key，需 Google AI Studio Key）
 *   AI_BASE_URL        : 自定义 Base URL（custom/gemini 模式可配）
 *   AI_MODEL           : 模型名称
 *   SEARCH_PROVIDER    : bing | duckduckgo | tavily | coze
 *   SEARCH_API_KEY     : 搜索 API 密钥（bing 需要，duckduckgo 不需要）
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

export type LLMProvider = 'siliconflow' | 'gemini' | 'puter' | 'openai' | 'deepseek' | 'coze' | 'custom';
export type SearchProvider = 'baidu' | 'bing' | 'duckduckgo' | 'tavily' | 'coze';

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
  siliconflow: {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    description: '国内大模型聚合平台，DeepSeek/Qwen/GLM 等，注册送额度，服务端可用',
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
  gemini: {
    id: 'gemini',
    name: 'Google Gemini (REST API)',
    description: 'Google AI Studio 免费 API，走标准 HTTP 接口，服务端可用（推荐）',
    needApiKey: true,
    needBaseUrl: false,
    defaultModel: 'gemini-2.5-flash',
    recommendedModels: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', free: true },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', free: true },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', free: true },
    ],
    free: true,
    signupUrl: 'https://aistudio.google.com/apikey',
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
  baidu: {
    id: 'baidu',
    name: '百度搜索',
    description: '百度移动端搜索（m.baidu.com），完全免费无需Key，国内稳定，返回真实网页结果',
    needApiKey: false,
    free: true,
  },
  bing: {
    id: 'bing',
    name: 'Azure Bing Search',
    description: '微软 Bing 搜索 API，国内可访问，每月 1000 次免费',
    needApiKey: true,
    free: true,
    signupUrl: 'https://portal.azure.com/#create/Microsoft.BingSearch',
  },
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
    siliconflow: 'siliconflow',
    gemini: 'gemini',
    openai: 'openai',
    puter: 'puter',
    deepseek: 'deepseek',
    coze: 'coze',
    custom: 'custom',
    kimi: 'custom',
    zhipu: 'custom',
  };
  return map[raw] || 'siliconflow'; // 默认用 SiliconFlow（国内可用，服务端稳定）
}

/** 获取当前搜索 Provider */
function getSearchProvider(): SearchProvider {
  const sp = getEnv('SEARCH_PROVIDER');
  if (sp === 'baidu') return 'baidu';
  if (sp === 'bing') return 'bing';
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
      gemini: 'https://generativelanguage.googleapis.com/v1beta',
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
//  Provider 实现：Google Gemini REST API（服务端可用）
// ════════════════════════════════════════════════════

async function* geminiStream(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  config: { apiKey: string; baseUrl: string; model: string; temperature?: number },
): AsyncGenerator<StreamChunk> {
  if (!config.apiKey) {
    throw new Error(
      'Google Gemini 需要 API Key。\n\n' +
      `请设置环境变量 AI_API_KEY。\n` +
      `免费申请：https://aistudio.google.com/apikey\n\n` +
      `或切换到 SiliconFlow（AI_PROVIDER=siliconflow），国内更稳定。`,
    );
  }

  const model = config.model || 'gemini-2.5-flash';
  const baseUrl = (config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');

  // 将 OpenAI 格式 messages 转为 Gemini 格式
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  // system instruction 单独提取
  const sysInstruction = messages.find(m => m.role === 'system')?.content;

  const url = `${baseUrl}/models/${model}:streamGenerateContent?key=${config.apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      ...(sysInstruction ? { systemInstruction: { parts: [{ text: sysInstruction }] } } : {}),
      generationConfig: {
        temperature: config.temperature ?? 0.7,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API 请求失败 (${res.status}): ${errText.slice(0, 300)}`);
  }
  if (!res.body) throw new Error('Gemini API 未返回响应流');

  const decoder = new TextDecoder();
  let buffer = '';
  const reader = res.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Gemini 返回的是 JSON 数组，每行一个对象
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('[') && !trimmed.endsWith(']')) continue;
        try {
          // 可能是数组片段，尝试解析
          const parsed = JSON.parse(trimmed.replace(/^\[|\]$/g, ''));
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield { content: text };
        } catch {
          // 忽略非 JSON 行
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ════════════════════════════════════════════════════
//  Provider 实现：Puter.js（仅浏览器端可用）
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
//  搜索实现：Azure Bing Search（国内可用）
// ════════════════════════════════════════════════════

async function bingSearch(query: string, opts?: { count?: number }): Promise<SearchResponse> {
  const apiKey = getEnv('SEARCH_API_KEY') || getEnv('BING_API_KEY');
  if (!apiKey) {
    throw new Error(
      'Bing 搜索未配置。请设置环境变量:\n' +
      '  SEARCH_PROVIDER=bing\n' +
      '  SEARCH_API_KEY=你的Bing API Key\n\n' +
      '免费申请步骤：\n' +
      '1. 访问 https://portal.azure.com/\n' +
      '2. 搜索 "Bing Search" 资源并创建\n' +
      '3. 在资源中获取 API Key（每月 1000 次免费）\n' +
      '4. 参考: https://portal.azure.com/#create/Microsoft.BingSearch',
    );
  }

  const count = Math.min(opts?.count || 10, 50);
  const encodedQuery = encodeURIComponent(query);

  const res = await fetch(
    `https://api.bing.microsoft.com/v7.0/search?q=${encodedQuery}&count=${count}&mkt=zh-CN&setlang=zh-Hans`,
    {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Bing 搜索失败 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    webPages?: {
      value?: Array<{
        name: string;
        url: string;
        snippet: string;
        dateLastCrawled?: string;
        displayUrl?: string;
      }>;
    };
  };

  const items = (data.webPages?.value || []).map(item => ({
    title: item.name || '',
    url: item.url || '',
    site_name: extractDomain(item.url),
    snippet: item.snippet?.slice(0, 300) || '',
    publish_time: item.dateLastCrawled || '',
    auth_info_level: inferAuthLevel(item.url),
    auth_info_des: '',
  }));

  return {
    summary: items.length > 0 ? `找到 ${items.length} 条相关结果` : '未找到相关结果',
    web_items: items,
  };
}

// ════════════════════════════════════════════════════
//  搜索实现：百度移动端搜索（免费、国内稳定）
// ════════════════════════════════════════════════════

/**
 * 百度移动端搜索 (m.baidu.com)
 *
 * 直接请求百度搜索结果页 HTML，从中解析出真实搜索结果
 * （标题、URL、摘要），而非仅返回联想词。
 *
 * 特点：完全免费、无需 Key、国内官方接口、返回真实网页结果
 */
async function baiduSearch(query: string, opts?: { count?: number }): Promise<SearchResponse> {
  const count = Math.min(opts?.count || 10, 20);
  const encodedQuery = encodeURIComponent(query);

  // 使用百度移动端搜索页（HTML 结构简单，易解析，且对服务端爬虫友好）
  const url = `https://m.baidu.com/s?word=${encodedQuery}&rn=${count}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000); // 百度可能稍慢

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://m.baidu.com/',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`百度搜索返回状态 ${res.status}`);
    }

    const html = await res.text();

    if (!html || html.length < 500) {
      throw new Error('百度搜索响应为空');
    }

    // 解析百度移动端搜索结果的 HTML 结构
    // 典型结构：<div class="c-result"><div class="c-abstract">...<a href="...">...</a></div>...
    const items = parseBaiduResults(html, count);
    console.log(`[baidu] 解析到 ${items.length} 条真实搜索结果`);

    return {
      summary: items.length > 0 ? `百度搜索找到 ${items.length} 条相关结果` : `百度未找到"${query}"相关结果`,
      web_items: items,
    };
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error)?.name === 'AbortError') {
      throw new Error('百度搜索请求超时（10秒）');
    }
    throw err;
  }
}

/**
 * 解析百度移动端搜索结果页 HTML
 *
 * 匹配模式（按优先级）：
 *   1. <div class="result ..."> 容器 → 内部提取标题(a)、摘要、来源
 *   2. <div class="c-result ..."> 备选容器
 */
function parseBaiduResults(html: string, maxCount: number): SearchResultItem[] {
  const items: SearchResultItem[] = [];
  const seen = new Set<string>();

  // 百度移动端搜索结果的主要容器模式
  const resultPatterns = [
    // 标准 result 容器 + 标题 a 标签
    /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]{50,3000}?)<\/div>\s*(?=<div\s|<\/body|$)/gi,
    // c-result 容器
    /<div[^>]*class="[^"]*c-result[^"]*"[^>]*>([\s\S]{50,2000}?)<\/div>\s*(?=<div\s|<\/body|$)/gi,
  ];

  for (const re of resultPatterns) {
    if (items.length >= maxCount) break;
    re.lastIndex = 0;
    let blockMatch;
    while ((blockMatch = re.exec(html)) !== null && items.length < maxCount) {
      const block = blockMatch[1];

      // 从结果块中提取标题和链接
      const titleLinkMatch = block.match(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]{2,120}?)(?=<\/a><\/span>|<\/a>)/i);
      if (!titleLinkMatch) continue;

      const rawUrl = titleLinkMatch[1];
      const rawTitle = titleLinkMatch[2].replace(/<[^>]+>/g, '').trim();
      if (!rawTitle || rawTitle.length < 3 || seen.has(rawUrl)) continue;

      // 提取摘要文本（通常在 c-abstract 或 c-font-normal 类中）
      const abstractPatterns = [
        /<div[^>]*class="[^"]*(?:abstract|content)[^"]*"[^>]*>([\s\S]{10,400}?)<\/div>/i,
        /<span[^>]*class="[^"]*(?:text-color|content-right_)[^"]*"[^>]*>([\s\S]{10,300}?)<\/span>/i,
        /<p[^>]*>([\s\S]{15,300}?)<\/p>/i,
      ];
      let snippet = '';
      for (const apRe of abstractPatterns) {
        const am = block.match(apRe);
        if (am) { snippet = am[1].replace(/<[^>]+>/g, '').trim(); break; }
      }

      // 提取来源名称
      const sourceMatch = block.match(/(?:来自|来源)[:\s]*([^\s<>]{2,30})|class="[^"]*source-name[^"]*"[^>]*>([^<]+)/i);
      const sourceName = sourceMatch
        ? (sourceMatch[1] || sourceMatch[2]).trim()
        : extractDomain(rawUrl) || '百度';

      // 清理 URL（百度可能有重定向链接）
      let finalUrl = rawUrl;
      const realUrlMatch = rawUrl.match(/[&?]url=([^&\s]*)/) || rawUrl.match(/[&?]srcurl=(https?[^&\s]*)/);
      if (realUrlMatch) {
        try { finalUrl = decodeURIComponent(realUrlMatch[1]); } catch { /* use original */ }
      }

      seen.add(finalUrl);
      items.push({
        title: rawTitle.slice(0, 100),
        url: finalUrl.startsWith('http') ? finalUrl : `https:${finalUrl}`,
        site_name: sourceName,
        snippet: snippet.slice(0, 300),
        publish_time: '',
        auth_info_level: inferAuthLevel(finalUrl),
        auth_info_des: '',
      });
    }
  }

  return items;
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
    case 'gemini':
      return geminiStream(messages, {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        temperature,
      });

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
 * 内置多重 fallback：Bing → DuckDuckGo（多镜像）→ LLM 兜底
 */
export async function performSearch(
  requestHeaders: Headers,
  query: string,
  opts?: { count?: number; timeRange?: string; needSummary?: boolean },
): Promise<SearchResponse> {
  const sp = getSearchProvider();
  const count = opts?.count || 10;

  // ─── 诊断日志：记录搜索入口信息 ───
  console.log(`[performSearch] provider=${sp}, query="${query.slice(0, 50)}", count=${count}`);

  // 策略 1：用户指定的搜索引擎
  try {
    let result: SearchResponse;

    switch (sp) {
      case 'baidu':
        console.log('[performSearch] → trying baiduSearch...');
        result = await baiduSearch(query, opts);
        console.log(`[performSearch] baiduSearch OK: ${result.web_items?.length || 0} items`);
        return result;
      case 'bing':
        console.log('[performSearch] → trying bingSearch...');
        result = await bingSearch(query, opts);
        console.log(`[performSearch] bingSearch OK: ${result.web_items?.length || 0} items`);
        return result;
      case 'tavily':
        console.log('[performSearch] → trying tavilySearch...');
        result = await tavilySearch(query, opts);
        console.log(`[performSearch] tavilySearch OK: ${result.web_items?.length || 0} items`);
        return result;
      case 'coze':
        console.log('[performSearch] → trying cozeSearch...');
        result = await cozeSearch(requestHeaders, query, opts);
        console.log(`[performSearch] cozeSearch OK: ${result.web_items?.length || 0} items`);
        return result;
      case 'duckduckgo':
      default:
        console.log('[performSearch] → trying duckduckgoSearch...');
        result = await duckduckgoSearch(query, opts);
        console.log(`[performSearch] duckduckgoSearch OK: ${result.web_items?.length || 0} items`);
        return result;
    }
  } catch (primaryErr) {
    const errMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    console.error(`[performSearch] 主引擎(${sp})失败:`, errMsg);

    // 如果不是 DDG，且主搜索失败 → 尝试 DDG 作为 fallback
    if (sp !== 'duckduckgo') {
      try {
        console.log('[performSearch] → fallback to duckduckgoSearch...');
        const ddgResult = await duckduckgoSearch(query, opts);
        console.log(`[performSearch] duckduckgo fallback OK: ${ddgResult.web_items?.length || 0} items`);
        return ddgResult;
      } catch (ddgErr) {
        console.error(`[performSearch] DuckDuckGo fallback 也失败:`, ddgErr instanceof Error ? ddgErr.message : String(ddgErr));
        /* DDG 也失败，继续走 LLM 兜底 */
      }
    }

    // 策略 2：LLM 兜底生成
    try {
      console.log('[performSearch] → fallback to llmSearchFallback...');
      console.log(`[performSearch] LLM Provider=${getLLMProvider()}, hasApiKey=${!!getEnv('AI_API_KEY')}`);
      const llmResult = await llmSearchFallback(requestHeaders, query, { count });
      console.log(`[performSearch] llmSearchFallback OK: ${llmResult.web_items?.length || 0} items`);
      return llmResult;
    } catch (llmErr) {
      const llmErrMsg = llmErr instanceof Error ? llmErr.message : String(llmErr);
      console.error(`[performSearch] LLM 兜底也失败:`, llmErrMsg);
      // 所有策略都失败了，返回原始错误
      throw new Error(
        `${errMsg}\n\nLLM 兜底也失败: ${llmErrMsg}`
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
