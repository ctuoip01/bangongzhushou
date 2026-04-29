import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, type Message, type LLMConfig } from 'coze-coding-dev-sdk';

// ==================== 日志记录 ====================

function log(level: 'info' | 'error' | 'warn', message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
}

// ==================== 请求类型 ====================

interface AIRequest {
  moduleId: string;
  systemPrompt?: string;
  userInput: string;
  temperature?: number;
  maxTokens?: number;
}

// ==================== 通用 AI 路由 ====================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 解析请求体
    const body: AIRequest = await request.json();
    
    if (!body.userInput?.trim()) {
      return NextResponse.json(
        { error: '请提供输入内容' },
        { status: 400 }
      );
    }
    
    if (!body.moduleId) {
      return NextResponse.json(
        { error: '缺少模块标识' },
        { status: 400 }
      );
    }
    
    log('info', 'AI 请求开始', {
      moduleId: body.moduleId,
      inputLength: body.userInput.length,
      hasCustomPrompt: !!body.systemPrompt,
    });
    
    // 构建消息
    const messages: Message[] = [];
    
    // 系统提示词
    if (body.systemPrompt) {
      messages.push({
        role: 'system',
        content: body.systemPrompt,
      });
    }
    
    // 用户输入
    messages.push({
      role: 'user',
      content: body.userInput,
    });
    
    // 创建 AI 客户端
    const config = new Config();
    
    // LLM 配置
    const llmConfig: LLMConfig = {
      temperature: body.temperature ?? 0.7,
    };
    
    // 创建流式响应
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 使用流式调用
          const client = new LLMClient(config);
          
          let fullContent = '';
          
          // 处理流式响应
          for await (const chunk of client.stream(messages, llmConfig)) {
            if (chunk.content) {
              fullContent += chunk.content;
              
              // 发送数据块
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: chunk.content, done: false })}\n\n`)
              );
            }
          }
          
          // 发送完成信号
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: '', done: true })}\n\n`)
          );
          
          log('info', 'AI 请求完成', {
            moduleId: body.moduleId,
            outputLength: fullContent.length,
            duration: Date.now() - startTime,
          });
          
          controller.close();
          
        } catch (error) {
          log('error', 'AI 流式处理失败', {
            error: error instanceof Error ? error.message : '未知错误',
          });
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              error: 'AI 处理失败: ' + (error instanceof Error ? error.message : '未知错误'),
              done: true 
            })}\n\n`)
          );
          
          controller.close();
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
    
  } catch (error) {
    log('error', 'AI 请求处理失败', {
      error: error instanceof Error ? error.message : '未知错误',
    });
    
    return NextResponse.json(
      { error: '请求处理失败: ' + (error instanceof Error ? error.message : '未知错误') },
      { status: 500 }
    );
  }
}

// ==================== 非流式响应（备用） ====================

export async function PUT(request: NextRequest) {
  try {
    const body: AIRequest = await request.json();
    
    if (!body.userInput?.trim() || !body.moduleId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }
    
    // 构建消息
    const messages: Message[] = [];
    
    if (body.systemPrompt) {
      messages.push({
        role: 'system',
        content: body.systemPrompt,
      });
    }
    
    messages.push({
      role: 'user',
      content: body.userInput,
    });
    
    // 创建 AI 客户端
    const config = new Config();
    
    // LLM 配置
    const llmConfig: LLMConfig = {
      temperature: body.temperature ?? 0.7,
    };
    
    // 非流式调用
    const client = new LLMClient(config);
    const response = await client.invoke(messages, llmConfig);
    
    return NextResponse.json({
      success: true,
      content: response.content,
    });
    
  } catch (error) {
    log('error', 'AI 非流式请求失败', {
      error: error instanceof Error ? error.message : '未知错误',
    });
    
    return NextResponse.json(
      { error: 'AI 处理失败: ' + (error instanceof Error ? error.message : '未知错误') },
      { status: 500 }
    );
  }
}
