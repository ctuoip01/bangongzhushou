import { NextRequest, NextResponse } from "next/server";
import { SearchClient, Config, HeaderUtils, LLMClient } from "coze-coding-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { query, searchType, timeRange, count } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "请输入搜索关键词" },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const searchClient = new SearchClient(config, customHeaders);
    const llmClient = new LLMClient(config, customHeaders);

    // 构建增强查询
    let enhancedQuery = query;
    if (searchType === 'policy') {
      enhancedQuery = `${query} 政策 文件 规定 通知`;
    } else if (searchType === 'industry') {
      enhancedQuery = `${query} 行业动态 市场分析 发展趋势`;
    }

    // 执行搜索
    const searchResponse = await searchClient.advancedSearch(enhancedQuery, {
      count: count || 10,
      timeRange: timeRange || '3m',
      needSummary: true,
      needContent: false,
      needUrl: true,
    });

    // 使用 LLM 智能聚合结果
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

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "user", content: aggregationPrompt }
    ];

    const summaryStream = llmClient.stream(messages, {
      model: "doubao-seed-2-0-pro-260215",
      temperature: 0.5,
    });

    // 流式返回聚合结果
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // 先发送原始搜索结果
          controller.enqueue(encoder.encode(`[SEARCH_RESULTS_START]${JSON.stringify({
            summary: searchResponse.summary,
            items: searchResponse.web_items?.slice(0, 10).map(item => ({
              title: item.title,
              url: item.url,
              siteName: item.site_name,
              snippet: item.snippet,
              publishTime: item.publish_time,
              authLevel: item.auth_info_level,
              authDes: item.auth_info_des,
            })) || []
          })}[SEARCH_RESULTS_END]`));

          // 再发送 AI 聚合摘要
          controller.enqueue(encoder.encode(`\n\n[AI_SUMMARY_START]`));
          
          for await (const chunk of summaryStream) {
            if (chunk.content) {
              controller.enqueue(encoder.encode(chunk.content.toString()));
            }
          }
          
          controller.enqueue(encoder.encode(`[AI_SUMMARY_END]`));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Policy search error:", error);
    return NextResponse.json(
      { error: "搜索服务暂时不可用，请稍后重试" },
      { status: 500 }
    );
  }
}
