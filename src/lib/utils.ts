// 共享工具函数

import { STREAM_MARKERS } from '@/types';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind CSS 类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 解析流式响应内容
 */
export function parseStreamContent(content: string, marker: string): string | null {
  const pattern = new RegExp(`\\[${marker}([\\s\\S]*?)\\]\\[${marker.replace('[', '')}`);
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

/**
 * 提取 JSON 对象
 */
export function extractJson(text: string): object | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 解析搜索结果
 */
export function parseSearchResults(content: string): { items: Record<string, unknown>[]; summary?: string } {
  const resultsMatch = content.match(
    new RegExp(`${STREAM_MARKERS.SEARCH_RESULTS_START}([\\s\\S]*?)${STREAM_MARKERS.SEARCH_RESULTS_END}`)
  );
  
  if (resultsMatch) {
    try {
      const parsed = JSON.parse(resultsMatch[1]);
      return {
        items: parsed.items || [],
        summary: parsed.summary || '',
      };
    } catch {
      return { items: [] };
    }
  }
  
  return { items: [] };
}

/**
 * 解析 AI 摘要
 */
export function parseAiSummary(content: string): string {
  const summaryMatch = content.match(
    new RegExp(`${STREAM_MARKERS.AI_SUMMARY_START}([\\s\\S]*?)${STREAM_MARKERS.AI_SUMMARY_END}`)
  );
  return summaryMatch ? summaryMatch[1].trim() : '';
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * 下载文本文件
 */
export function downloadTextFile(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 获取分类图标
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    '标题': '📋',
    '发文字号': '📝',
    '主送机关': '🏢',
    '正文结构': '📄',
    '附件格式': '📎',
    '落款格式': '✍️',
    '字体字号': '🔤',
    '标点符号': '⚡',
    '段落格式': '📏',
    '表格规范': '📊',
    '列表格式': '📑',
    '其他': '💡',
  };
  return icons[category] || '💡';
}

/**
 * 获取布局名称
 */
export function getLayoutName(layout: string): string {
  const names: Record<string, string> = {
    'title': '封面页',
    'content': '内容页',
    'two-column': '双栏布局',
    'chart': '图表页',
    'closing': '结束页',
  };
  return names[layout] || layout;
}

/**
 * 获取布局图标
 */
export function getLayoutIcon(layout: string): string {
  const icons: Record<string, string> = {
    'title': '📄',
    'content': '📝',
    'two-column': '📊',
    'chart': '📈',
    'closing': '✅',
  };
  return icons[layout] || '📄';
}

/**
 * 获取权威等级徽章类型
 */
export function getAuthBadgeVariant(level: number): 'default' | 'secondary' | 'outline' {
  if (level >= 3) return 'default';
  if (level >= 2) return 'secondary';
  return 'outline';
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
