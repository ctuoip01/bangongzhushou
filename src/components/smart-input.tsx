'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { isValidUrl, formatFileSize, isDocumentSupported } from '@/lib/input-handler';

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  onFileSelect?: (file: File | null) => void;
  placeholder?: string;
  disabled?: boolean;
  inputTypes?: ('text' | 'url' | 'document')[];
  minHeight?: string;
}

type InputTab = 'text' | 'url' | 'document';

export function SmartInput({
  value,
  onChange,
  onFileSelect,
  placeholder = '输入内容...',
  disabled = false,
  inputTypes = ['text', 'url', 'document'],
  minHeight = '200px',
}: SmartInputProps) {
  const [activeTab, setActiveTab] = useState<InputTab>(
    inputTypes.includes('url') ? 'url' : 'text'
  );
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 检测输入内容类型
  const detectInputType = useCallback((input: string): InputTab | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    
    if (isValidUrl(trimmed)) {
      return 'url';
    }
    
    return 'text';
  }, []);

  // 自动切换 tab
  const handleTextChange = useCallback((newValue: string) => {
    onChange(newValue);
    
    // 自动检测 URL
    if (newValue.trim() && activeTab === 'text') {
      const detected = detectInputType(newValue);
      if (detected === 'url' && inputTypes.includes('url')) {
        setActiveTab('url');
      }
    }
  }, [onChange, activeTab, detectInputType, inputTypes]);

  // 处理文件选择
  const handleFileSelect = useCallback((file: File) => {
    setFileError(null);
    
    if (!isDocumentSupported(file)) {
      setFileError(`不支持的文件格式，请上传 txt、md、doc、docx 或 pdf 文件`);
      setSelectedFile(null);
      onFileSelect?.(null);
      return;
    }
    
    // 检查文件大小（限制 10MB）
    if (file.size > 10 * 1024 * 1024) {
      setFileError('文件大小超过 10MB 限制');
      setSelectedFile(null);
      onFileSelect?.(null);
      return;
    }
    
    setSelectedFile(file);
    onFileSelect?.(file);
    
    // 如果是纯文本或 markdown，直接读取内容
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'txt' || ext === 'md') {
      file.text().then(content => {
        onChange(content);
      });
    }
  }, [onChange, onFileSelect]);

  // 处理拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // 点击上传区域
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 清空选择
  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setFileError(null);
    onFileSelect?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect]);

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Tab 切换 */}
      {inputTypes.length > 1 && (
        <div className="flex border-b bg-muted/50">
          {inputTypes.includes('text') && (
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              disabled={disabled}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === 'text'
                  ? 'bg-background text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              📝 文本输入
            </button>
          )}
          {inputTypes.includes('url') && (
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              disabled={disabled}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === 'url'
                  ? 'bg-background text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              🔗 URL 抓取
            </button>
          )}
          {inputTypes.includes('document') && (
            <button
              type="button"
              onClick={() => setActiveTab('document')}
              disabled={disabled}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === 'document'
                  ? 'bg-background text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              📎 文档上传
            </button>
          )}
        </div>
      )}

      {/* 输入区域 */}
      <div className="p-4">
        {/* 文本输入 */}
        {activeTab === 'text' && (
          <textarea
            value={value}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full resize-y border-0 bg-transparent outline-none',
              'placeholder:text-muted-foreground',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{ minHeight }}
          />
        )}

        {/* URL 输入 */}
        {activeTab === 'url' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="url"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="请输入网页 URL，例如：https://example.com/article"
                disabled={disabled}
                className={cn(
                  'flex-1 px-3 py-2 border rounded-md bg-background',
                  'outline-none focus:ring-2 focus:ring-primary/50',
                  'placeholder:text-muted-foreground',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              💡 输入网址后将自动抓取网页内容进行分析
            </p>
          </div>
        )}

        {/* 文档上传 */}
        {activeTab === 'document' && (
          <div className="space-y-3">
            {/* 上传区域 */}
            <div
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.doc,.docx,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                disabled={disabled}
                className="hidden"
              />
              
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="text-3xl">📄</div>
                  <div className="font-medium">{selectedFile.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                    className="text-sm text-destructive hover:underline"
                  >
                    移除
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-3xl">📎</div>
                  <div className="font-medium">点击或拖拽文件到此处</div>
                  <div className="text-sm text-muted-foreground">
                    支持 txt、md、doc、docx、pdf 格式，最大 10MB
                  </div>
                </div>
              )}
            </div>

            {/* 错误提示 */}
            {fileError && (
              <div className="text-sm text-destructive flex items-center gap-2">
                <span>⚠️</span> {fileError}
              </div>
            )}

            {/* 手动文本输入 */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                或者直接粘贴文本内容
              </summary>
              <div className="mt-2">
                <textarea
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  disabled={disabled}
                  className={cn(
                    'w-full resize-y border rounded-md p-3 bg-background',
                    'outline-none focus:ring-2 focus:ring-primary/50',
                    'placeholder:text-muted-foreground',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  style={{ minHeight: '120px' }}
                />
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
