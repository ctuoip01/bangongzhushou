/**
 * DOCX 公文格式校验引擎 - 统一导出
 *
 * 三层架构：
 *  1. parser   — 解压 + 解析 → 结构化数据
 *  2. validator — 规则匹配 → 校验报告
 *  3. fixer     — 报告驱动 → 自动修复
 */

export { parseDocx, quickPreview } from './parser';
export { validateDocument } from './validator';
export { autoFixDocument, selectiveFix } from './fixer';

export type {
  ParsedDocument,
  ParsedParagraph,
  PageSettings,
  FontInfo,
  SpacingInfo,
  IndentInfo,
  ValidationReport,
  ValidationIssue,
  FixAction,
  IssueSeverity,
  IssueCategory,
} from './types';

export {
  OFFICIAL_STANDARD,
  BUSINESS_STANDARD,
  mmToTwip,
  ptToHalfPt,
  twipToMM,
  halfPtToPt,
  ptToChineseSizeName,
  FONT_SIZE_MAP,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
} from './standards';
