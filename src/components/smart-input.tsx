'use client';

import { useCallback, useRef, useState } from 'react';
import { FileText, Globe, Type, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFileSize, isDocumentSupported, isValidUrl } from '@/lib/input-handler';

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

const tabMeta = {
  text: { label: '文本', icon: Type },
  url: { label: '链接', icon: Globe },
  document: { label: '文档', icon: FileText },
};

export function SmartInput({
  value,
  onChange,
  onFileSelect,
  placeholder = '输入内容...',
  disabled = false,
  inputTypes = ['text', 'url', 'document'],
  minHeight = '200px',
}: SmartInputProps) {
  const [activeTab, setActiveTab] = useState<InputTab>(inputTypes.includes('text') ? 'text' : inputTypes[0]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectInputType = useCallback((input: string): InputTab | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    return isValidUrl(trimmed) ? 'url' : 'text';
  }, []);

  const handleTextChange = useCallback(
    (nextValue: string) => {
      onChange(nextValue);

      if (nextValue.trim() && activeTab === 'text') {
        const detected = detectInputType(nextValue);
        if (detected === 'url' && inputTypes.includes('url')) {
          setActiveTab('url');
        }
      }
    },
    [activeTab, detectInputType, inputTypes, onChange]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      setFileError(null);

      if (!isDocumentSupported(file)) {
        setFileError('不支持该文件格式，请上传 txt、md、doc、docx 或 pdf 文件。');
        setSelectedFile(null);
        onFileSelect?.(null);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setFileError('文件大小超过 10MB 限制。');
        setSelectedFile(null);
        onFileSelect?.(null);
        return;
      }

      setSelectedFile(file);
      onFileSelect?.(file);

      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'txt' || ext === 'md') {
        file.text().then((content) => onChange(content));
      }
    },
    [onChange, onFileSelect]
  );

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setFileError(null);
    onFileSelect?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileSelect]);

  return (
    <div className="overflow-hidden rounded-[26px] border border-white/70 bg-white/70">
      {inputTypes.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-white/80 px-3 py-3">
          {inputTypes.map((type) => {
            const meta = tabMeta[type];
            const Icon = meta.icon;

            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveTab(type)}
                disabled={disabled}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition',
                  activeTab === type
                    ? 'bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]'
                    : 'bg-white/75 text-slate-600 hover:text-slate-900'
                )}
              >
                <Icon className="h-4 w-4" />
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="p-4">
        {activeTab === 'text' && (
          <textarea
            value={value}
            onChange={(event) => handleTextChange(event.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full resize-y rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            style={{ minHeight }}
          />
        )}

        {activeTab === 'url' && (
          <div className="space-y-3">
            <input
              type="url"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder="输入网页链接，例如 https://example.com/article"
              disabled={disabled}
              className={cn(
                'w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            />
            <p className="text-xs leading-6 text-slate-500">输入链接后，系统会按模块能力提取并分析页面内容。</p>
          </div>
        )}

        {activeTab === 'document' && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className={cn(
                'rounded-[28px] border-2 border-dashed p-8 text-center transition',
                isDragging
                  ? 'border-slate-700 bg-slate-50'
                  : 'border-slate-300 bg-white/75 hover:border-slate-500 hover:bg-white',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.doc,.docx,.pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                disabled={disabled}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <div className="mx-auto inline-flex rounded-3xl border border-slate-200 bg-slate-50 p-3">
                    <FileText className="h-5 w-5 text-slate-700" />
                  </div>
                  <div className="text-sm font-medium text-slate-900">{selectedFile.name}</div>
                  <div className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleClear();
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                    移除
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mx-auto inline-flex rounded-3xl border border-slate-200 bg-slate-50 p-3">
                    <UploadCloud className="h-5 w-5 text-slate-700" />
                  </div>
                  <div className="text-sm font-medium text-slate-900">点击或拖拽文件到这里</div>
                  <div className="text-xs leading-6 text-slate-500">支持 txt、md、doc、docx、pdf，最大 10MB。</div>
                </div>
              )}
            </div>

            {fileError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{fileError}</div>
            )}

            <details className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-700">或直接粘贴文档文本</summary>
              <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className={cn(
                  'mt-3 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
                style={{ minHeight: '120px' }}
              />
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
