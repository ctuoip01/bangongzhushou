import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 90;

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
  ],
  "exportFormats": ["Markdown", "大纲文本"]
}

## 布局类型说明
- title：封面页
- content：内容页（单栏）
- two-column：双栏布局
- chart：图表页
- closing：结束页

请直接输出JSON，不要添加任何额外说明。`;

export async function POST(request: NextRequest) {
  try {
    const { content, pptTitle, style } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "请提供需要转换的报告内容" },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

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

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ];

    // 使用流式输出
    const stream = client.stream(messages, {
      model: "doubao-seed-2-0-pro-260215",
      temperature: 0.5,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              controller.enqueue(encoder.encode(chunk.content.toString()));
            }
          }
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
    console.error("PPT generate error:", error);
    return NextResponse.json(
      { error: "PPT生成服务暂时不可用，请稍后重试" },
      { status: 500 }
    );
  }
}
