// 共享类型定义

// ========== 文档校验 ==========
export interface DocumentIssue {
  id: number;
  category: string;
  location: string;
  problem: string;
  suggestion: string;
}

export interface DocumentCheckResult {
  status: 'pass' | 'fail';
  totalIssues: number;
  mode: string;
  issues: DocumentIssue[];
  summary: string;
  rawResponse?: string;
}

export type CheckMode = 'both' | 'official' | 'business';

// ========== 报告生成 ==========
export type ReportType = 'comprehensive' | 'policy' | 'market' | 'due-diligence';

// ========== 政策搜索 ==========
export interface SearchResult {
  title: string;
  url: string;
  siteName: string;
  snippet: string;
  publishTime: string;
  authLevel: number;
  authDes: string;
}

export type SearchType = 'all' | 'policy' | 'industry';
export type TimeRange = '1m' | '3m' | '6m' | '1y';

export interface PolicySearchResponse {
  summary?: string;
  items: SearchResult[];
}

// ========== PPT助手 ==========
export interface Slide {
  page: number;
  title: string;
  content: string[];
  notes?: string;
  layout: SlideLayout;
}

export type SlideLayout = 'title' | 'content' | 'two-column' | 'chart' | 'closing';

export interface PptOutline {
  title: string;
  theme: string;
  totalSlides: number;
  slides: Slide[];
}

export type PptStyle = 'academic' | 'formal' | 'creative';

// ========== API 通用 ==========
export interface ApiError {
  error: string;
  code?: string;
}

// ========== 流式响应标记 ==========
export const STREAM_MARKERS = {
  SEARCH_RESULTS_START: '[SEARCH_RESULTS_START]',
  SEARCH_RESULTS_END: '[SEARCH_RESULTS_END]',
  AI_SUMMARY_START: '[AI_SUMMARY_START]',
  AI_SUMMARY_END: '[AI_SUMMARY_END]',
} as const;
