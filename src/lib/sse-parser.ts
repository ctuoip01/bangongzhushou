/**
 * 客户端 SSE 流解析器
 *
 * 与服务端 @/lib/sse 配对使用。
 * 从 ReadableStream 中解析 SSE 格式的事件流，通过回调分发不同事件类型。
 */

export interface SseParsedEvent {
  type: string;
  data: unknown;
}

/**
 * 解析 SSE 文本缓冲区，提取完整事件
 *
 * @param buffer - 累积的原始文本
 * @returns { events, remaining } - 已完成的事件列表和剩余未处理文本
 */
export function parseSseBuffer(buffer: string): { events: SseParsedEvent[]; remaining: string } {
  const events: SseParsedEvent[] = [];
  // SSE 事件以双换行分隔
  const parts = buffer.split('\n\n');
  // 最后一个部分可能不完整（未遇到 \n\n）
  let remaining = parts.length > 0 ? parts.pop()! : '';
  let eventType = '';

  for (const part of parts) {
    if (!part.trim()) continue;

    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        const rawData = line.slice(5).trim();
        // 尝试 JSON 解析
        try {
          const data = JSON.parse(rawData);
          events.push({ type: eventType || 'message', data });
        } catch {
          // 非 JSON 数据作为纯文本（兼容旧格式裸文本）
          if (rawData) {
            events.push({ type: eventType || 'content', data: rawData });
          }
        }
      }
    }
    eventType = '';
  }

  return { events, remaining };
}

/**
 * 从响应流中读取并解析 SSE 事件的异步迭代器
 */
export async function* readSseEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<{ event: string; data: unknown; rawText?: string }, void, unknown> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (!signal?.aborted) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const { events, remaining } = parseSseBuffer(buffer);
    buffer = remaining;

    for (const ev of events) {
      yield { event: ev.type, data: ev.data };
    }
  }

  // 处理缓冲区中剩余的非 SSE 文本（兼容非标准流）
  if (buffer.trim()) {
    yield { event: 'raw', data: buffer, rawText: buffer };
  }
}
