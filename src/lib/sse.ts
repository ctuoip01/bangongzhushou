/**
 * 统一 SSE (Server-Sent Events) 工具
 *
 * 所有流式 API 应使用此模块发送事件，保证协议一致。
 *
 * 协议格式：
 *   event: <eventType>
 *   data: <JSON>
 *   \n\n
 *
 * 标准事件类型：
 *   - 'content'     : AI 生成的文本片段
 *   - 'search'      : 结构化搜索结果
 *   - 'summary'     : AI 聚合摘要
 *   - 'outline'     : 结构化大纲（PPT/报告）
 *   - 'chapter'     : 单章内容（报告生成）
 *   - 'progress'    : 进度信息
 *   - 'done'        : 流结束信号
 *   - 'error'       : 错误信息
 */

export type SseEventType =
  | 'content'
  | 'search'
  | 'summary'
  | 'outline'
  | 'chapter'
  | 'progress'
  | 'done'
  | 'error';

/**
 * 将数据编码为 SSE 格式的事件行
 */
export function formatSseEvent(event: SseEventType, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * 创建 SSE 流响应
 */
export function createSseStream(
  encoder?: TextEncoder,
): {
  readable: ReadableStream<Uint8Array>;
  controller: ReadableStreamDefaultController;
} {
  const enc = encoder || new TextEncoder();

  let controllerRef: ReadableStreamDefaultController;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
    },
  });

  return {
    readable: stream,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    get controller() { return controllerRef!; },
  };
}

/**
 * 向 SSE 流推送事件
 */
export function pushSseEvent(
  controller: ReadableStreamDefaultController,
  event: SseEventType,
  data: unknown,
): void {
  try {
    const text = formatSseEvent(event, data);
    const encoder = new TextEncoder();
    controller.enqueue(encoder.encode(text));
  } catch (e) {
    // 流可能已关闭，忽略写入错误
  }
}
