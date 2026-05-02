/**
 * 统一流式请求 Hook
 *
 * 统一封装 SSE / 自定义标记流 / 原始文本流的解析逻辑，
 * 消除 4 个面板组件中重复的流式读取代码。
 *
 * 支持的协议模式：
 * - 'sse'     : 标准 Server-Sent Events (data: {...}\n\n)
 * - 'marked'  : 自定义标记 [MARKER]content[MARKER]
 * - 'raw'     : 原始文本流，逐行拼接
 */

'use client';

import { useRef, useCallback, useState } from 'react';

export type StreamProtocol = 'sse' | 'marked' | 'raw';

export interface StreamFetchOptions {
  /** 流式协议类型，默认 'sse' */
  protocol?: StreamProtocol;
  /** 标记对（protocol='marked' 时使用），默认 ['[START]', '[END]'] */
  markers?: [string, string];
  /** 请求超时时间(ms)，默认 120000 (2分钟) */
  timeout?: number;
  /** 收到数据时的回调 */
  onChunk?: (text: string) => void;
  /** 收到结构化数据的回调（仅 marked 模式） */
  onMarkedData?: (marker: string, data: unknown) => void;
  /** 流结束时的回调 */
  onDone?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

export interface UseStreamFetchReturn {
  /** 触发请求 */
  execute: (url: string, body?: Record<string, unknown>) => Promise<void>;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 中止当前请求 */
  abort: () => void;
  /** 已接收的完整文本 */
  fullText: string;
}

const DEFAULT_TIMEOUT = 120_000;

/**
 * 从响应流中按协议读取内容
 */
async function readStream(
  response: Response,
  protocol: StreamProtocol,
  markers: [string, string],
  options: {
    onChunk?: (text: string) => void;
    onMarkedData?: (marker: string, data: unknown) => void;
    signal: AbortSignal;
  },
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('无法获取响应流');

  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  while (!options.signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    if (protocol === 'sse') {
      // SSE 协议：按 \n\n 分割 event
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const dataMatch = event.match(/^data:\s*(.+)$/m);
        if (dataMatch?.[1]) {
          let parsed;
          try { parsed = JSON.parse(dataMatch[1]); } catch { parsed = { content: dataMatch[1] }; }

          if (parsed.done === true) return fullText;

          if (parsed.content) {
            fullText += parsed.content;
            options.onChunk?.(parsed.content);
          }
        }
      }
    } else if (protocol === 'marked') {
      // 自定义标记协议：提取 [START]...[END] 之间的内容
      const [startMark, endMark] = markers;

      // 尝试提取所有完整的标记块
      const pattern = new RegExp(`${escapeRegExp(startMark)}([\\s\\S]*?)${escapeRegExp(endMark)}`, 'g');
      let match;

      // 重置 lastIndex 避免状态残留
      pattern.lastIndex = 0;
      while ((match = pattern.exec(buffer)) !== null) {
        const raw = match[1].trim();

        try {
          const data = JSON.parse(raw);
          options.onMarkedData?.(startMark, data);
        } catch {
          // 非 JSON 内容作为普通文本
          fullText += raw + '\n';
          options.onChunk?.(raw);
        }
      }

      // 移除已处理的标记块，保留未完成的部分
      buffer = buffer.replace(pattern, '');
    } else {
      // raw 模式：直接追加
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          fullText += line + '\n';
          options.onChunk?.(line);
        }
      }
    }
  }

  return fullText;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 统一流式请求 Hook
 *
 * @example
 * ```tsx
 * const { execute, isLoading, abort, fullText } = useStreamFetch({
 *   protocol: 'marked',
 *   markers: ['[SEARCH_RESULTS_START]', '[SEARCH_RESULTS_END]'],
 *   onChunk: (text) => appendToDisplay(text),
 *   onDone: () => setIsLoading(false),
 * });
 *
 * execute('/api/policy-search', { query: 'xxx' });
 * ```
 */
export function useStreamFetch(options: StreamFetchOptions = {}): UseStreamFetchReturn {
  const {
    protocol = 'sse',
    markers = ['[START]', '[END]'],
    timeout = DEFAULT_TIMEOUT,
    onChunk,
    onMarkedData,
    onDone,
    onError,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [fullText, setFullText] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const execute = useCallback(async (url: string, body?: Record<string, unknown>): Promise<void> => {
    // 取消前一个请求
    abort();

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setFullText('');

    // 超时控制
    const timerId = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timerId);

      if (!res.ok && res.status !== 200) {
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errBody.error || `请求失败 (${res.status})`);
      }

      const text = await readStream(res, protocol, markers, {
        onChunk: (chunk) => {
          setFullText(prev => prev + chunk);
          onChunk?.(chunk);
        },
        onMarkedData,
        signal: controller.signal,
      });

      setFullText(text);
      onDone?.();
    } catch (err) {
      clearTimeout(timerId);

      if ((err as Error).name === 'AbortError') {
        // 用户主动取消，不算错误
        return;
      }

      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [protocol, markers, timeout, onChunk, onMarkedData, onDone, onError, abort]);

  return { execute, isLoading, abort, fullText };
}
