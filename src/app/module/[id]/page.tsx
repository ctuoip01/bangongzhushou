'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SmartInput } from '@/components/smart-input';
import { BUILT_IN_MODULES, type AIModule } from '@/config/modules';
import { getCustomModules } from '@/lib/module-manager';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ModulePage() {
  const params = useParams();
  const moduleId = params.id as string;
  
  const [moduleData, setModuleData] = useState<AIModule | null>(null);
  const [userInput, setUserInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载模块配置
  useEffect(() => {
    const allModules = [...BUILT_IN_MODULES, ...getCustomModules()];
    const found = allModules.find(m => m.id === moduleId);
    
    if (!found) {
      setError('模块不存在');
      return;
    }
    
    setModuleData(found);
    
    // 记录最近使用
    const recent = localStorage.getItem('recent-modules');
    const recentList: string[] = recent ? JSON.parse(recent) : [];
    const filtered = recentList.filter(id => id !== moduleId);
    localStorage.setItem('recent-modules', JSON.stringify([moduleId, ...filtered].slice(0, 10)));
  }, [moduleId]);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 处理提交
  const handleSubmit = useCallback(async () => {
    if (!userInput.trim() || !moduleData || isLoading) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: moduleData.id,
          systemPrompt: moduleData.systemPrompt,
          userInput: userInput + (selectedFile ? `\n\n[上传文件: ${selectedFile.name}]` : ''),
          temperature: moduleData.config?.temperature ?? 0.7,
          maxTokens: moduleData.config?.maxTokens ?? 4096,
        }),
      });
      
      if (!response.ok) {
        throw new Error('请求失败');
      }
      
      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      
      if (reader) {
        const assistantMessageObj: ChatMessage = {
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, assistantMessageObj]);
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.error) {
                  throw new Error(data.error);
                }
                
                if (data.content !== undefined) {
                  assistantMessage += data.content;
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: assistantMessage,
                    };
                    return updated;
                  });
                }
              } catch {
                // 忽略解析错误
              }
            }
          }
        }
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
      // 移除最后一条用户消息
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      setSelectedFile(null);
    }
  }, [userInput, moduleData, isLoading, selectedFile]);

  // 键盘快捷键 - 暂未使用
  // const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  //   if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
  //     e.preventDefault();
  //     handleSubmit();
  //   }
  // }, [handleSubmit]);

  // 复制内容
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  // 导出内容
  const exportAsMarkdown = useCallback(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;
    
    const blob = new Blob([lastMessage.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleData?.name || 'output'}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, moduleData]);

  // 清空对话
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  if (error && !moduleData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-xl font-semibold mb-2">模块不存在</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 头部 */}
      <header className="flex items-center gap-4 px-6 py-4 border-b bg-card">
        <Link
          href="/"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          title="返回首页"
        >
          ←
        </Link>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{moduleData.icon}</span>
            <div>
              <h1 className="font-semibold">{moduleData.name}</h1>
              <p className="text-sm text-muted-foreground">{moduleData.description}</p>
            </div>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <button
                onClick={() => copyToClipboard(messages[messages.length - 1]?.content || '')}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors"
                title="复制结果"
              >
                📋 复制
              </button>
              <button
                onClick={exportAsMarkdown}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors"
                title="导出 Markdown"
              >
                💾 导出
              </button>
              <button
                onClick={clearChat}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors text-destructive"
                title="清空对话"
              >
                🗑️ 清空
              </button>
            </>
          )}
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 对话区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="text-6xl mb-4">{moduleData.icon}</div>
                  <h2 className="text-xl font-semibold mb-2">{moduleData.name}</h2>
                  <p className="text-muted-foreground">
                    {moduleData.description}
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <span>支持:</span>
                    {moduleData.inputTypes.map((type) => (
                      <span key={type} className="px-2 py-0.5 bg-muted rounded">
                        {type === 'text' && '📝 文本'}
                        {type === 'url' && '🔗 URL'}
                        {type === 'document' && '📎 文档'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex gap-4',
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    {message.role === 'user' ? '👤' : '🤖'}
                  </div>
                  
                  <div
                    className={cn(
                      'flex-1 max-w-3xl rounded-2xl px-5 py-4',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {message.content || (isLoading && index === messages.length - 1 ? '思考中...' : '')}
                      </pre>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* 加载指示器 */}
            {isLoading && messages.length > 0 && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  🤖
                </div>
                <div className="bg-muted rounded-2xl px-5 py-4">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="border-t bg-card p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* 智能输入 */}
              <SmartInput
                value={userInput}
                onChange={setUserInput}
                onFileSelect={setSelectedFile}
                placeholder={moduleData.placeholder || '输入内容，或粘贴网址，或上传文档...'}
                disabled={isLoading}
                inputTypes={moduleData.inputTypes}
                minHeight="120px"
              />
              
              {/* 提交按钮 */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  💡 按 <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> 快速提交
                </div>
                
                <button
                  onClick={handleSubmit}
                  disabled={!userInput.trim() || isLoading}
                  className={cn(
                    'px-6 py-2.5 rounded-lg font-medium transition-all',
                    'bg-primary text-primary-foreground',
                    'hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed',
                    'flex items-center gap-2'
                  )}
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      处理中...
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      提交
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧边栏 - 提示词预览 */}
        <aside className="w-80 border-l bg-muted/30 hidden lg:block overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-3">系统提示词</h3>
            <div className="p-4 bg-card rounded-lg border">
              <pre className="text-xs whitespace-pre-wrap text-muted-foreground font-mono">
                {moduleData.systemPrompt || '无'}
              </pre>
            </div>
            
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>输入类型</span>
                <span>{moduleData.inputTypes.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span>输出格式</span>
                <span>{moduleData.outputType}</span>
              </div>
              {moduleData.config?.temperature && (
                <div className="flex justify-between">
                  <span>温度参数</span>
                  <span>{moduleData.config.temperature}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
