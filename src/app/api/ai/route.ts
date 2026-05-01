import { NextRequest, NextResponse } from 'next/server';

interface AIRequest {
  systemPrompt?: string;
  userInput: string;
  endpoint?: string;
  apiKey?: string;
  model?: string;
  providerName?: string;
  requestOptions?: {
    timeoutMs?: number;
    stream?: boolean;
    testMode?: boolean;
  };
}

interface UpstreamChunk {
  choices?: Array<{
    delta?: {
      content?: string | Array<{ text?: string }>;
      reasoning_content?: string;
    };
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
      reasoning_content?: string;
    };
    text?: string;
    finish_reason?: string | null;
  }>;
  output_text?: string;
  content?: string;
  text?: string;
  error?: {
    message?: string;
    code?: string | number;
  };
}

function jsonError(message: string, status = 400, details?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...details }, { status });
}

function encodeSse(data: Record<string, unknown>) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function normalizeEndpoint(endpoint: string) {
  const trimmed = endpoint.trim().replace(/\/+$/, '');
  return trimmed.replace(/\/chat\/completions$/i, '');
}

function buildCompletionsUrl(endpoint: string) {
  return `${normalizeEndpoint(endpoint)}/chat/completions`;
}

function extractTextFromUnknown(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return typeof record.text === 'string'
            ? record.text
            : typeof record.content === 'string'
              ? record.content
              : '';
        }
        return '';
      })
      .join('');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return typeof record.text === 'string'
      ? record.text
      : typeof record.content === 'string'
        ? record.content
        : '';
  }
  return '';
}

function extractChunkContent(payload: UpstreamChunk) {
  return (
    extractTextFromUnknown(payload.choices?.[0]?.delta?.content) ||
    extractTextFromUnknown(payload.choices?.[0]?.message?.content) ||
    payload.choices?.[0]?.text ||
    payload.output_text ||
    payload.content ||
    payload.text ||
    ''
  );
}

function buildUpstreamErrorMessage(providerName: string | undefined, status: number, detail: string) {
  const provider = providerName?.trim() ? ` [${providerName.trim()}]` : '';
  return `上游模型网关${provider} 请求失败（HTTP ${status}）：${detail || '未返回更多信息'}`;
}

async function parseUpstreamError(response: Response, providerName?: string) {
  const raw = await response.text();
  let detail = raw;

  try {
    const json = JSON.parse(raw) as {
      error?: { message?: string; code?: string | number };
      message?: string;
      detail?: string;
    };
    detail = json.error?.message || json.message || json.detail || raw;
  } catch {
    detail = raw || response.statusText;
  }

  return buildUpstreamErrorMessage(providerName, response.status, detail);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function nonStreamCompletion(url: string, init: RequestInit, providerName?: string) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(await parseUpstreamError(response, providerName));
  }

  const data = (await response.json()) as UpstreamChunk;
  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  return extractChunkContent(data);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AIRequest;

    if (!body.userInput?.trim()) {
      return jsonError('请输入需要处理的内容。');
    }
    if (!body.apiKey?.trim()) {
      return jsonError('缺少 API Key。');
    }
    if (!body.endpoint?.trim()) {
      return jsonError('缺少 Base URL。');
    }
    if (!body.model?.trim()) {
      return jsonError('缺少模型名称。');
    }

    const timeoutMs = Math.min(Math.max(body.requestOptions?.timeoutMs || 45000, 3000), 120000);
    const shouldStream = body.requestOptions?.stream !== false && !body.requestOptions?.testMode;
    const url = buildCompletionsUrl(body.endpoint);

    const payload = {
      model: body.model.trim(),
      stream: shouldStream,
      temperature: 0.3,
      messages: [
        ...(body.systemPrompt?.trim()
          ? [{ role: 'system', content: body.systemPrompt.trim() }]
          : []),
        { role: 'user', content: body.userInput.trim() },
      ],
    };

    const init: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${body.apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
    };

    let upstream: Response;
    try {
      upstream = await fetchWithTimeout(url, init, timeoutMs);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return jsonError(`请求超时：上游网关在 ${timeoutMs}ms 内未响应。`, 504, { providerName: body.providerName });
      }
      return jsonError(`无法连接上游模型网关：${error instanceof Error ? error.message : '未知错误'}`, 502, {
        providerName: body.providerName,
      });
    }

    if (!upstream.ok) {
      const message = await parseUpstreamError(upstream, body.providerName);
      const shouldFallbackToNonStream =
        shouldStream &&
        [400, 404, 405, 415, 422].includes(upstream.status) &&
        /stream|sse|unsupported|not support|response_format/i.test(message);

      if (!shouldFallbackToNonStream) {
        return jsonError(message, upstream.status, { providerName: body.providerName });
      }

      const fallbackText = await nonStreamCompletion(
        url,
        {
          ...init,
          body: JSON.stringify({ ...payload, stream: false }),
        },
        body.providerName
      );

      return NextResponse.json({
        content: fallbackText,
        mode: 'fallback_non_stream',
        providerName: body.providerName,
      });
    }

    if (!shouldStream || !upstream.body) {
      const data = (await upstream.json()) as UpstreamChunk;
      return NextResponse.json({
        content: extractChunkContent(data),
        mode: 'non_stream',
        providerName: body.providerName,
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = upstream.body!.getReader();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const segments = buffer.split(/\n\n/);
            buffer = segments.pop() ?? '';

            for (const segment of segments) {
              const lines = segment
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .filter((line) => line.startsWith('data:'));

              for (const line of lines) {
                const data = line.slice(5).trim();
                if (!data) continue;
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode(encodeSse({ done: true })));
                  continue;
                }

                try {
                  const parsed = JSON.parse(data) as UpstreamChunk;
                  if (parsed.error?.message) {
                    controller.enqueue(encoder.encode(encodeSse({ error: parsed.error.message, done: true })));
                    continue;
                  }

                  const content = extractChunkContent(parsed);
                  if (content) {
                    controller.enqueue(encoder.encode(encodeSse({ content, done: false })));
                  }
                } catch {
                  continue;
                }
              }
            }
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              encodeSse({
                error: error instanceof Error ? error.message : '流式响应解析失败。',
                done: true,
              })
            )
          );
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : '请求处理失败。', 500);
  }
}
