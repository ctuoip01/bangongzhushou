import { NextResponse } from 'next/server';
import {
  LLM_PROVIDERS,
  SEARCH_PROVIDERS,
  getCurrentLLMConfig,
  getCurrentSearchConfig,
} from '@/lib/ai-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ai-config
 * 返回当前 AI 配置和所有可用的 Provider 列表
 * 前端用于展示设置面板
 */
export async function GET() {
  return NextResponse.json({
    llm: {
      current: getCurrentLLMConfig(),
      available: Object.values(LLM_PROVIDERS).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        free: p.free,
        needApiKey: p.needApiKey,
        needBaseUrl: p.needBaseUrl,
        defaultModel: p.defaultModel,
        recommendedModels: p.recommendedModels,
        signupUrl: p.signupUrl || null,
      })),
    },
    search: {
      current: getCurrentSearchConfig(),
      available: Object.values(SEARCH_PROVIDERS).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        free: p.free,
        needApiKey: p.needApiKey,
        signupUrl: p.signupUrl || null,
      })),
    },
  });
}
