import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 120;

// 服务端日志
function log(level: 'info' | 'error', message: string, meta?: object) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, service: 'report-generate', message, ...meta };
  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

const SYSTEM_PROMPT = `你是一位专业的咨询报告撰写专家，擅长撰写政策研究、市场分析、投资尽调等各类咨询报告。

## 能力说明
1. 根据用户提供的目录大纲，自动扩写完整的报告章节内容
2. 内容专业、逻辑严谨、数据支撑有力
3. 严格遵循咨询行业报告撰写规范
4. 格式规范：使用标准层级（一、/（一）/ 1.）

## 输出要求
1. 直接输出内容，不添加额外说明
2. 内容要专业、详实、有深度
3. 每个章节要有实质性内容，不能空洞
4. 如需数据支撑，使用"根据公开资料显示"、"据XX机构统计"等表述
5. 保持专业咨询报告的写作风格

## 章节类型参考
- 执行摘要：简明扼要概括核心观点
- 背景介绍：交代研究背景、行业现状
- 市场分析：市场规模、竞争格局、发展趋势
- 政策解读：相关政策梳理及影响分析
- 建议措施：针对问题的具体建议
- 结论展望：总结及未来展望`;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { outline, reportType, title } = await request.json();

    // 参数验证
    if (!outline || typeof outline !== 'string' || outline.trim().length === 0) {
      log('info', 'Invalid request: empty outline');
      return NextResponse.json(
        { error: "请提供报告大纲" },
        { status: 400 }
      );
    }

    const outlineLength = outline.trim().length;
    const reportTitle = title || '未命名报告';
    
    log('info', 'Report generation started', { outlineLength, reportType, reportTitle });

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const typeContext = reportType === 'policy' 
      ? '这是一份政策研究报告，请注重政策梳理、影响分析和建议措施。'
      : reportType === 'market'
      ? '这是一份市场分析报告，请注重市场规模、竞争格局、发展趋势等分析。'
      : reportType === 'due-diligence'
      ? '这是一份投资尽调报告，请注重企业基本面、财务状况、风险评估等。'
      : '这是一份综合性咨询报告，请注重专业性和实用性。';

    const prompt = `${typeContext}

请根据以下大纲，为报告"${reportTitle}"生成详细内容：

${outline}

请按章节逐一扩写，每个章节要有足够的内容量，保持专业咨询报告的写作风格。`;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ];

    // 使用流式输出
    const stream = client.stream(messages, {
      model: "doubao-seed-2-0-pro-260215",
      temperature: 0.7,
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
          
          const duration = Date.now() - startTime;
          log('info', 'Report generation completed', { duration, outlineLength, reportTitle });
        } catch (error) {
          controller.error(error);
          log('error', 'Stream error', { error: error instanceof Error ? error.message : 'Unknown' });
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
    log('error', 'Report generation failed', { error: error instanceof Error ? error.message : 'Unknown' });
    return NextResponse.json(
      { error: "报告生成服务暂时不可用，请稍后重试" },
      { status: 500 }
    );
  }
}
