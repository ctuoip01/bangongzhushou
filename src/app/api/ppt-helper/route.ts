import { NextRequest, NextResponse } from "next/server";
import { createLogger } from '@/lib/logger';
import { pushSseEvent, type SseEventType } from '@/lib/sse';
import { createStream } from '@/lib/ai-client';

export const runtime = "nodejs";
export const maxDuration = 90;

const log = createLogger('ppt-helper');

const SYSTEM_PROMPT = `你是一位专业的PPT大纲设计专家，擅长将报告内容转化为结构清晰、逻辑合理的PPT演示文稿。

## 工作原则
1. 将长篇报告精炼为适合演示的PPT大纲
2. 每页内容简洁明了，突出重点
3. 保持逻辑连贯性和层次清晰性
4. 提供每页的标题、要点和备注建议

## 输出格式
请严格按照以下JSON格式输出：

{
  "title": "PPT标题",
  "theme": "配色主题建议",
  "totalSlides": 总页数,
  "slides": [
    {
      "page": 1,
      "title": "页面标题",
      "content": ["要点1", "要点2", "要点3"],
      "notes": "备注说明（可选）",
      "layout": "布局类型：title/content/two-column/chart/closing"
    }
  ]
}

## 布局类型说明
- title：封面页
- content：内容页（单栏）
- two-column：双栏布局
- chart：图表页
- closing：结束页

请直接输出JSON，不要添加任何额外说明。`;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache",
  "Connection": "keep-alive",
  "X-Accel-Buffering": "no",
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { content, pptTitle, style } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      log('info', 'Invalid request: empty content');
      return NextResponse.json({ error: "请提供需要转换的报告内容" }, { status: 400 });
    }

    log('info', 'PPT generation started', { contentLength: content.trim().length, pptTitle, style });

    const styleContext = style === 'formal'
      ? '风格：正式商务风格，适合政府汇报、企业汇报'
      : style === 'creative'
      ? '风格：创意活力风格，适合产品发布、团队展示'
      : '风格：学术专业风格，适合研究报告、方案分析';

    const prompt = `请将以下报告内容转换为PPT大纲。

${styleContext}
${pptTitle ? `PPT标题建议：${pptTitle}` : ''}

报告内容：
${content}

请生成一个结构清晰、适合演示的PPT大纲，每页控制在3-5个要点以内。`;

    const messages: Array<{ role: "system" | "user"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ];

    // 统一 SSE 流输出 — 使用 createStream 自动选择 AI Provider
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          pushSseEvent(controller, 'outline' as SseEventType, { status: 'streaming' });

          let rawText = '';
          const stream = createStream(request.headers, messages, {
            model: "doubao-seed-2-0-pro-260215",
            temperature: 0.5,
          });

          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content;
              rawText += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          // 尝试解析完整的大纲 JSON
          let parsedOutline = null;
          try {
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsedOutline = JSON.parse(jsonMatch[0]);
            }
          } catch {
            // 解析失败，客户端会处理原始文本
          }

          pushSseEvent(controller, 'done' as SseEventType, { type: 'done', parsedOutline });
          controller.close();

          log('info', 'PPT generation completed', { duration: Date.now() - startTime });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : 'Unknown';
          pushSseEvent(controller, 'error' as SseEventType, { message: errMsg });
          controller.close();
          log('error', 'Stream error', { error: errMsg });
        }
      },
    });

    return new Response(readable, { headers: SSE_HEADERS });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown';
    log('error', 'PPT generation failed', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
