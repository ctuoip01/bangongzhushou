import { NextRequest, NextResponse } from "next/server";
import { createLogger } from '@/lib/logger';
import { pushSseEvent, type SseEventType } from '@/lib/sse';
import { createStream, performSearch } from '@/lib/ai-client';
import { readSseEvents } from '@/lib/sse-parser';

export const runtime = "nodejs";
export const maxDuration = 60;

const log = createLogger('policy-search');

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { query, searchType, timeRange, count } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      log('info', 'Invalid request: empty query');
      return NextResponse.json({ error: "请输入搜索关键词" }, { status: 400 });
    }

    log('info', 'Policy search started', { queryLength: query.trim().length, searchType, timeRange });

    // 构建增强查询
    let enhancedQuery = query;
    if (searchType === 'policy') {
      enhancedQuery = `${query} 政策 文件 规定 通知`;
    } else if (searchType === 'industry') {
      enhancedQuery = `${query} 行业动态 市场分析 发展趋势`;
    }

    // 使用统一搜索客户端（自动选择 Coze SDK 或 fallback）
    const searchResponse = await performSearch(request.headers, enhancedQuery, {
      count: count || 10,
      timeRange: timeRange || '3m',
      needSummary: true,
    });

    log('info', 'Search executed', { resultsCount: searchResponse.web_items?.length || 0 });

    // 统一 SSE 流
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // event: search — 结构化搜索结果
          pushSseEvent(controller, 'search' as SseEventType, {
            summary: searchResponse.summary,
            items: searchResponse.web_items?.slice(0, 10).map(item => ({
              title: item.title,
              url: item.url,
              siteName: item.site_name,
              snippet: item.snippet,
              publishTime: item.publish_time,
              authLevel: item.auth_info_level,
              authDes: item.auth_info_des,
            })) || [],
          });

          // event: summary — AI 聚合摘要（流式）
          pushSseEvent(controller, 'summary' as SseEventType, { status: 'streaming' });

          const aggregationPrompt = `请帮我整理和归纳以下搜索结果，提取关键信息，按重要性排序：

搜索关键词：${query}

搜索结果：
${searchResponse.web_items?.map((item, i) => `
【结果${i + 1}】
标题：${item.title}
来源：${item.site_name || '未知'}
摘要：${item.snippet || '无'}
${item.summary ? `AI摘要：${item.summary}` : ''}
`).join('\n')}

请按以下格式整理：
1. 核心发现（最重要的3-5条）
2. 按主题/时间分类汇总
3. 可信的权威来源推荐

保持客观、专业，用中文输出。`;

          const messages = [
            { role: 'user' as const, content: aggregationPrompt },
          ];

          const summaryStream = createStream(request.headers, messages, {
            temperature: 0.5,
          });

          for await (const chunk of summaryStream) {
            if (chunk.content) {
              controller.enqueue(encoder.encode(chunk.content));
            }
          }

          // event: done
          pushSseEvent(controller, 'done' as SseEventType, { type: 'done' });
          controller.close();

          log('info', 'Policy search completed', { duration: Date.now() - startTime });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown';
          pushSseEvent(controller, 'error' as SseEventType, { message: errMsg });
          controller.close();
          log('error', 'Stream error', { error: errMsg });
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown';
    log('error', 'Policy search failed', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
