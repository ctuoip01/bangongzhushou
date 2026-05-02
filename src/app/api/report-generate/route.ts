import { NextRequest, NextResponse } from "next/server";
import type { ChapterTemplate } from '@/lib/report-engine';
import { getTemplate } from '@/lib/report-engine';
import { createLogger } from '@/lib/logger';
import { pushSseEvent, type SseEventType } from '@/lib/sse';
import { createStream } from '@/lib/ai-client';

export const runtime = "nodejs";
export const maxDuration = 180;

const log = createLogger('report-generate');

function buildChapterPrompt(chapter: ChapterTemplate, contextInfo: string): string {
  return `请撰写报告的「${chapter.title}」这一章节。

## 写作要求
${chapter.writingGuide}

## 字数要求
建议 ${chapter.suggestedWords}-${chapter.maxWords || chapter.suggestedWords * 1.5} 字

## 输出格式
- 直接输出正文内容，不要输出章节标题（标题会由系统自动添加）
- 使用标准层级格式（一、/（一）/ 1.）
- 内容要专业、详实、有深度，避免空洞表述

## 参考上下文
${contextInfo}

请开始撰写：`;
}

function getSystemPrompt(reportType: string): string {
  return `你是一位专业的咨询报告撰写专家，擅长撰写${reportType}。

## 核心能力
1. 结构化表达：严格遵循标准层级格式（一、/（一）/ 1./(1)/①）
2. 数据驱动：引用数据时标注来源，使用规范表述方式
3. 专业深度：每个观点有论据支撑，避免空泛套话
4. 行业术语：正确使用行业专业术语

## 输出规则
1. 直接输出正文内容，不添加额外说明文字
2. 不输出章节标题（由系统自动添加）
3. 保持段落之间逻辑连贯
4. 使用规范的中文标点符号
5. 数字使用阿拉伯数字，百分比用%符号`;
}

// ========== SSE 响应头常量 ==========
const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache",
  "Connection": "keep-alive",
  "X-Accel-Buffering": "no",
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      mode,
      templateId,
      chapters,
      title,
      coverData,
      globalContext,
    } = body;

    // 模式1：单章生成
    if (mode === 'chapter') {
      const { chapterId, chapterTitle, writingGuide, suggestedWords } = body;
      if (!chapterTitle?.trim()) {
        return NextResponse.json({ error: '缺少章节信息' }, { status: 400 });
      }
      log('info', 'Single chapter generation', { chapterId, chapterTitle });
      return await streamSingleChapter(
        chapterTitle, writingGuide || '', suggestedWords || 800, globalContext || '', request.headers,
      );
    }

    // 模式2：全篇顺序生成
    if (mode === 'full') {
      if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
        return NextResponse.json({ error: '请提供要生成的章节列表' }, { status: 400 });
      }
      log('info', 'Full report generation', { chapterCount: chapters.length, templateId, title: title || '' });
      return await streamFullReport(chapters, title, globalContext || '', request.headers);
    }

    // 模式3：兼容旧接口 — 纯大纲模式
    const { outline, reportType } = body;
    if (!outline || typeof outline !== 'string' || outline.trim().length === 0) {
      return NextResponse.json({ error: '请提供报告大纲或选择模板后生成' }, { status: 400 });
    }

    log('info', 'Legacy outline generation', { outlineLength: outline.trim().length });

    const typeMap: Record<string, string> = {
      policy: '政策研究报告',
      market: '市场分析报告',
      'due-diligence': '投资尽调报告',
    };
    const typeLabel = typeMap[reportType] || '综合性咨询报告';

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: getSystemPrompt(typeLabel) },
      { role: 'user', content: `这是一份${typeLabel}。请根据以下大纲扩写完整内容：\n\n${outline}` },
    ];

    return streamLLM(messages, request.headers);

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown';
    log('error', 'Report generation failed', { error: errMsg });
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

// ========== 流式辅助函数（统一 SSE） ==========

async function streamLLM(
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  requestHeaders: Headers,
) {
  const encoder = new TextEncoder();
  const stream = createStream(requestHeaders, messages, {
    model: "doubao-seed-2-0-pro-260215",
    temperature: 0.7,
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.content) {
            controller.enqueue(encoder.encode(chunk.content));
          }
        }
        pushSseEvent(controller, 'done' as SseEventType, { type: 'done' });
        controller.close();
      } catch (error) {
        pushSseEvent(controller, 'error' as SseEventType, { message: error instanceof Error ? error.message : 'Unknown' });
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: SSE_HEADERS });
}

async function streamSingleChapter(
  chapterTitle: string,
  writingGuide: string,
  suggestedWords: number,
  context: string,
  requestHeaders: Headers,
) {
  const guideText = writingGuide ? `\n## 写作指引\n${writingGuide}` : '';
  const wordHint = `建议 ${suggestedWords}-${Math.round(suggestedWords * 1.5)} 字`;

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: getSystemPrompt('咨询报告') },
    { role: 'user', content: `请撰写以下章节内容：\n\n【章节】${chapterTitle}\n${wordHint}${guideText}\n\n${context ? `已生成的上文参考：\n${context}\n\n` : ''}` },
  ];

  return streamLLM(messages, requestHeaders);
}

async function streamFullReport(
  chapters: Array<{ id: string; title: string; level: number; writingGuide?: string; suggestedWords?: number }>,
  reportTitle: string,
  globalContext: string,
  requestHeaders: Headers,
) {
  const encoder = new TextEncoder();
  const totalChapters = chapters.length;
  const fnStartTime = Date.now();

  const readable = new ReadableStream({
    async start(controller) {
      let accumulatedContext = globalContext;

      try {
        for (let i = 0; i < totalChapters; i++) {
          const ch = chapters[i];
          const chNum = i + 1;

          // event: chapter — 章节元信息
          pushSseEvent(controller, 'chapter' as SseEventType, {
            num: chNum,
            total: totalChapters,
            id: ch.id,
            title: ch.title,
          });

          // event: progress — 进度更新
          pushSseEvent(controller, 'progress' as SseEventType, {
            current: chNum,
            total: totalChapters,
            phase: `正在生成第 ${chNum}/${totalChapters} 章：${ch.title}`,
          });

          const guideText = ch.writingGuide ? `\n写作指引：${ch.writingGuide}` : '';
          const words = ch.suggestedWords || 800;

          const messages: Array<{ role: 'system' | 'user'; content: string }> = [
            { role: 'system', content: getSystemPrompt('咨询报告') },
            { role: 'user', content: `请撰写第${chNum}章「${ch.title}」。\n字数要求：${words}-${Math.round(words * 1.5)}字。\n${guideText}\n\n${accumulatedContext ? `前文摘要（用于保持逻辑连贯）：\n${accumulatedContext.slice(-1500)}\n\n` : ''}\n请直接输出该章节的正文内容：` },
          ];

          try {
            const stream = createStream(requestHeaders, messages, {
              model: "doubao-seed-2-0-pro-260215",
              temperature: 0.7,
            });

            let chapterContent = '';
            for await (const chunk of stream) {
              if (chunk.content) {
                const text = chunk.content;
                chapterContent += text;
                // event: content — 正文片段
                controller.enqueue(encoder.encode(text));
              }
            }

            accumulatedContext += `\n---\n第${chNum}章 ${ch.title}:\n${chapterContent.slice(-2000)}`;
            log('info', `Chapter ${chNum}/${totalChapters} done`, { id: ch.id, charsWritten: chapterContent.length });
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            pushSseEvent(controller, 'error' as SseEventType, {
              message: `章节"${ch.title}"生成失败`,
              detail: errMsg,
              recoverable: true,
            });
            log('error', `Chapter ${chNum} failed`, { error: errMsg });
          }
        }

        pushSseEvent(controller, 'done' as SseEventType, { type: 'done' });
        controller.close();
        log('info', 'Full report completed', { duration: Date.now() - fnStartTime, totalChapters });
      } catch (error) {
        pushSseEvent(controller, 'error' as SseEventType, { message: error instanceof Error ? error.message : 'Unknown' });
        controller.close();
        log('error', 'Full report stream error', { error: error instanceof Error ? error.message : 'Unknown' });
      }
    },
  });

  return new Response(readable, { headers: SSE_HEADERS });
}
