/**
 * 报告生成引擎 - 统一导出
 *
 * 包含：
 *  - templates.ts — 报告模板定义（骨架结构）
 *  - builder.ts   — DOCX 构建器（OOXML → .docx）
 */

export {
  REPORT_TEMPLATES,
  getTemplate,
  type ReportTemplate,
  type ChapterTemplate,
  type CoverField,
} from './templates';

export { buildReportDocx } from './builder';
export type { ReportChapter, ReportBuildInput } from './builder';
