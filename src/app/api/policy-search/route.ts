import { NextRequest, NextResponse } from "next/server";
import { createLogger } from '@/lib/logger';
import { pushSseEvent, type SseEventType } from '@/lib/sse';
import { createStream, performSearch } from '@/lib/ai-client';
import { searchPolicySources } from '@/lib/policy-sources';

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
      // 行业搜索增强：加入多维度专业关键词，引导搜索引擎返回研报/分析/深度报告类内容
      enhancedQuery = `${query} 研报 行业报告 市场分析 深度研究 发展趋势 竞争格局 券商 艾瑞 易观 36氪 虎嗅 第一财经`;
    } else if (searchType === 'shanghai') {
      enhancedQuery = `${query} 上海 政策 申报 通知 补贴`;
    }

    console.log(`[policy-search] enhancedQuery="${enhancedQuery.slice(0, 80)}", provider=${process.env.AI_PROVIDER || '(default)'}, searchProvider=${process.env.SEARCH_PROVIDER || '(default)'}`);

    // ── 搜索策略：分层获取 ──
    // 策略 A：政策源直连（政策类型搜索时优先，免费+国内可用+权威）
    // 策略 B：通用搜索引擎（Bing/DDG/Tavily）
    // 两者结果合并去重，优先展示政策源结果
    let searchResponse: Awaited<ReturnType<typeof performSearch>>;
    let policySourceResults: Awaited<ReturnType<typeof searchPolicySources>> | null = null;

    if (searchType === 'policy' || searchType === 'all') {
      // 先尝试从政府网站直接抓取（并行）
      const [engineResults, sourceResults] = await Promise.allSettled([
        performSearch(request.headers, enhancedQuery, {
          count: count || 10,
          timeRange: timeRange || '3m',
          needSummary: true,
        }),
        searchPolicySources(query, { maxResults: count || 10 }),
      ]);

      // 搜索引擎结果
      if (engineResults.status === 'fulfilled') {
        searchResponse = engineResults.value;
        log('info', 'Engine search done', { count: searchResponse.web_items?.length || 0 });
      } else {
        searchResponse = { summary: '', web_items: [] };
        log('warn', 'Engine search failed', { error: engineResults.reason instanceof Error ? engineResults.reason.message : String(engineResults.reason) });
      }

      // 政策源结果
      if (sourceResults.status === 'fulfilled' && sourceResults.value.web_items.length > 0) {
        policySourceResults = sourceResults.value;
        log('info', 'Policy source results', { count: policySourceResults.web_items.length });
      }
    } else if (searchType === 'shanghai') {
      // 上海地区：仅搜索上海源 + 搜索引擎带"上海"关键词
      const [engineResults, shSourceResults] = await Promise.allSettled([
        performSearch(request.headers, enhancedQuery, {
          count: count || 10,
          timeRange: timeRange || '3m',
          needSummary: true,
        }),
        searchPolicySources(query, { maxResults: count || 12, region: 'shanghai' }),
      ]);

      if (engineResults.status === 'fulfilled') {
        searchResponse = engineResults.value;
        log('info', 'Shanghai engine search done', { count: searchResponse.web_items?.length || 0 });
      } else {
        searchResponse = { summary: '', web_items: [] };
      }

      if (shSourceResults.status === 'fulfilled' && shSourceResults.value.web_items.length > 0) {
        policySourceResults = shSourceResults.value;
        log('info', 'Shanghai policy sources done', { count: policySourceResults.web_items.length });
      }
    } else {
      // 行业动态类型：搜索引擎为主（能索引到券商/媒体/咨询等专业内容）+ 行业源补充
      const [engineResults, indSourceResults] = await Promise.allSettled([
        performSearch(request.headers, enhancedQuery, {
          count: Math.max(count || 10, 15), // 行业搜索增加引擎结果数
          timeRange: timeRange || '3m',
          needSummary: true,
        }),
        searchPolicySources(query, { maxResults: (count || 8), region: 'industry' }),
      ]);

      if (engineResults.status === 'fulfilled') {
        searchResponse = engineResults.value;
        log('info', 'Industry engine search done', { count: searchResponse.web_items?.length || 0 });
      } else {
        searchResponse = { summary: '', web_items: [] };
        log('warn', 'Industry engine search failed', { error: engineResults.reason instanceof Error ? engineResults.reason.message : String(engineResults.reason) });
      }

      if (indSourceResults.status === 'fulfilled' && indSourceResults.value.web_items.length > 0) {
        policySourceResults = indSourceResults.value;
        log('info', 'Industry research sources done', { count: policySourceResults.web_items.length });
      }
    }

    // ── 合并结果：政策源优先 + 搜索引擎补充（去重）──
    const allItems = [
      ...(policySourceResults?.web_items || []),
      ...(searchResponse.web_items || []),
    ];

    // URL 去重（保留第一次出现的，即政策源优先）
    const seenUrls = new Set<string>();
    const dedupedItems = allItems.filter(item => {
      if (!item.url || seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    }).slice(0, 12); // 最多返回 12 条

    const finalSummary = policySourceResults?.summary && dedupedItems.length > 0
      ? `${policySourceResults.summary}。${searchResponse.summary ? ' ' + searchResponse.summary : ''}`
      : (searchResponse.summary || (dedupedItems.length > 0 ? `找到 ${dedupedItems.length} 条相关结果` : ''));

    const resultCount = dedupedItems.length;
    log('info', 'Search executed', { resultsCount: resultCount });
    console.log(`[policy-search] search done: ${resultCount} items (sources=${policySourceResults?.web_items?.length || 0}, engine=${searchResponse.web_items?.length || 0})`);

    // 统一 SSE 流（所有事件均为 JSON 格式，不混用裸文本）
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // ─── 阶段1：推送结构化搜索结果（JSON SSE 事件）────
          pushSseEvent(controller, 'search' as SseEventType, {
            summary: finalSummary,
            items: dedupedItems.map(item => ({
              title: item.title,
              url: item.url,
              siteName: item.site_name,
              snippet: item.snippet,
              publishTime: item.publish_time,
              authLevel: item.auth_info_level,
              authDes: item.auth_info_des,
            })) || [],
          });
          console.log(`[policy-search] SSE: event=search pushed, ${resultCount} items`);

          // ─── 阶段2：推送 AI 聚合摘要（流式，每片都包在 JSON 中）────
          pushSseEvent(controller, 'status' as SseEventType, { status: 'summarizing', resultCount });

          // AI 摘要步骤独立容错：失败不影响已推送的搜索结果
          try {
            if (resultCount > 0) {
              const aggregationPrompt = `请帮我整理和归纳以下搜索结果，提取关键信息，按重要性排序：

搜索关键词：${query}

搜索结果：
${dedupedItems.map((item, i) => `
【结果${i + 1}】
标题：${item.title}
来源：${item.site_name || '未知'}
摘要：${item.snippet || '无'}
权威等级：${item.auth_info_level >= 4 ? '官方权威' : item.auth_info_level >= 3 ? '权威来源' : '一般来源'}
`).join('\n')}

请按以下格式整理：
1. 核心发现（最重要的3-5条）
2. 按主题/时间分类汇总
3. 可信的权威来源推荐

保持客观、专业，用中文输出。`;

              const messages = [
                { role: 'user' as const, content: aggregationPrompt },
              ];

              console.log('[policy-search] → starting LLM summary stream...');
              const summaryStream = createStream(request.headers, messages, {
                temperature: 0.5,
              });

              for await (const chunk of summaryStream) {
                if (chunk.content) {
                  // 关键修复：每片文本都包装为 JSON SSE 事件，不再裸发
                  pushSseEvent(controller, 'summary_chunk' as SseEventType, { text: chunk.content });
                }
              }
              console.log('[policy-search] LLM summary stream completed');
            } else {
              // 无搜索结果时发送提示
              pushSseEvent(controller, 'summary_chunk' as SseEventType, {
                text: '未找到足够的搜索结果进行聚合分析，建议更换关键词后重试。',
              });
            }
          } catch (summaryErr) {
            // AI 摘要失败时发送提示而非中断整个流（搜索结果已正常推送）
            const sumMsg = summaryErr instanceof Error ? summaryErr.message : String(summaryErr);
            console.warn('[policy-search] LLM summary failed (non-fatal):', sumMsg);
            pushSseEvent(controller, 'summary_chunk' as SseEventType, {
              text: `（AI 聚合分析暂时不可用：${sumMsg.slice(0, 100)}。以上搜索结果仍可正常查看。）`,
            });
          }

          // ─── 阶段3：完成信号 ──
          pushSseEvent(controller, 'done' as SseEventType, { type: 'done' });
          controller.close();

          log('info', 'Policy search completed', { duration: Date.now() - startTime });
        } catch (error) {
          const errMsg = error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : JSON.stringify(error ?? '未知错误');
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
    const errMsg = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : JSON.stringify(error ?? '未知错误');
    log('error', 'Policy search failed', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
