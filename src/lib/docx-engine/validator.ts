/**
 * DOCX 格式校验引擎
 * 基于结构化解析结果 + 国家标准 → 生成校验报告
 */

import type {
  ParsedDocument,
  ValidationReport,
  ValidationIssue,
  IssueCategory,
  IssueSeverity,
} from './types';
import {
  OFFICIAL_STANDARD,
  BUSINESS_STANDARD,
  mmToTwip,
  ptToHalfPt,
  halfPtToPt,
  ptToChineseSizeName,
  CATEGORY_LABELS,
} from './standards';
import type { PageSettings } from './types';

// ==================== 问题生成工厂 ====================

let issueIdCounter = 0;

function createIssue(params: {
  category: IssueCategory;
  severity: IssueSeverity;
  location: string;
  problem: string;
  expected: string;
  actual: string;
  suggestion: string;
  autoFixable?: boolean;
  fixAction?: ValidationIssue['fixAction'];
  paragraphIndex?: number;
}): ValidationIssue {
  issueIdCounter++;
  return {
    id: `issue-${issueIdCounter}`,
    ...params,
    autoFixable: params.autoFixable ?? !!params.fixAction,
    paragraphIndex: params.paragraphIndex,
    fixAction: params.fixAction,
  };
}

// ==================== 校验规则集 ====================

/** 页边距检查 */
function checkPageMargins(doc: ParsedDocument, mode: 'official' | 'business'): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const standard = mode === 'official' ? OFFICIAL_STANDARD.pageMargins : BUSINESS_STANDARD.pageMargins;
  const actual = doc.pageSettings;

  const marginFields: (keyof Omit<PageSettings, 'width' | 'height'>)[] = [
    'top', 'bottom', 'left', 'right', 'header', 'footer',
  ];
  const fieldLabels: Record<keyof Omit<PageSettings, 'width' | 'height'>, string> = {
    top: '上边距',
    bottom: '下边距',
    left: '左边距',
    right: '右边距',
    header: '页眉距离',
    footer: '页脚距离',
  };

  for (const field of marginFields) {
    const expected = standard[field];
    const actualValue = actual[field];
    // 允许 ±1mm 误差
    if (Math.abs(actualValue - expected) > 1) {
      issues.push(createIssue({
        category: 'page_margin',
        severity: 'error',
        location: `页面设置`,
        problem: `${fieldLabels[field]}不符合规范`,
        expected: `${expected}mm`,
        actual: `${actualValue}mm`,
        suggestion: `请将${fieldLabels[field]}修改为 ${expected}mm`,
        autoFixable: true,
        fixAction: { type: 'set_page_margin', margin: field, valueMM: expected },
      }));
    }
  }

  // A4 纸张检查
  const expectedPaper = mode === 'official' ? OFFICIAL_STANDARD.pageSize : BUSINESS_STANDARD.pageSize;
  if (
    Math.abs(actual.width - expectedPaper.width) > 1 ||
    Math.abs(actual.height - expectedPaper.height) > 1
  ) {
    issues.push(createIssue({
      category: 'page_margin',
      severity: 'warning',
      location: `页面设置`,
      problem: '纸张尺寸不是标准A4',
      expected: `${expectedPaper.width}×${expectedPaper.height}mm`,
      actual: `${actual.width}×actual.height}mm`,
      suggestion: `请使用 A4 纸张（210×297mm）`,
    }));
  }

  return issues;
}

/** 标题格式检查 */
function checkTitleFormat(doc: ParsedDocument, mode: 'official' | 'business'): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const standard = mode === 'official' ? OFFICIAL_STANDARD.title : BUSINESS_STANDARD.title;

  if (doc.paragraphs.length === 0) return issues;

  // 通常第一段是标题（非空且较长）
  const firstNonEmpty = doc.paragraphs.find((p) => p.text.trim().length > 4);
  if (!firstNonEmpty) return issues;

  // 字体检查
  const titleFont = firstNonEmpty.font.eastAsia || firstNonEmpty.font.ascii || '';
  if (titleFont && !titleFont.includes(standard.font.replace(/[_\-\s]/g, '').slice(-2))) {
    // 允许一定的字体名变体（如"方正小标宋简体"包含"小标宋"）
    const isMatch =
      titleFont.includes('小标宋') ||
      titleFont.includes(standard.font) ||
      (mode === 'business' && (titleFont.includes('微软雅黑') || titleFont.includes('黑体')));
    if (!isMatch) {
      issues.push(createIssue({
        category: 'title_format',
        severity: 'error',
        location: `第${firstNonEmpty.index + 1}段（标题）`,
        problem: '标题字体不正确',
        expected: `${standard.font}`,
        actual: titleFont,
        suggestion: `将标题字体改为 ${standard.font}`,
        autoFixable: true,
        fixAction: { type: 'set_font', fontName: standard.font, fontSizePt: standard.sizePt },
        paragraphIndex: firstNonEmpty.index,
      }));
    }
  }

  // 字号检查
  if (firstNonEmpty.font.sizeHalfPt) {
    const actualPt = halfPtToPt(firstNonEmpty.font.sizeHalfPt);
    if (Math.abs(actualPt - standard.sizePt) > 1) {
      issues.push(createIssue({
        category: 'title_format',
        severity: 'error',
        location: `第${firstNonEmpty.index + 1}段（标题）`,
        problem: '标题字号不正确',
        expected: ptToChineseSizeName(standard.sizePt),
        actual: ptToChineseSizeName(actualPt),
        suggestion: `将标题字号改为 ${ptToChineseSizeName(standard.sizePt)}`,
        autoFixable: true,
        fixAction: { type: 'set_font', fontName: standard.font, fontSizePt: standard.sizePt },
        paragraphIndex: firstNonEmpty.index,
      }));
    }
  }

  // 对齐方式检查
  if (firstNonEmpty.alignment && firstNonEmpty.alignment !== standard.align) {
    issues.push(createIssue({
      category: 'title_format',
      severity: 'warning',
      location: `第${firstNonEmpty.index + 1}段（标题）`,
      problem: '标题对齐方式不正确',
      expected: standard.align === 'center' ? '居中' : standard.align,
      actual: firstNonEmpty.alignment === 'center' ? '居中' : firstNonEmpty.alignment,
      suggestion: `标题应${standard.align === 'center' ? '' : ''}居中对齐`,
      autoFixable: true,
      fixAction: { type: 'set_alignment', alignment: standard.align },
      paragraphIndex: firstNonEmpty.index,
    }));
  }

  return issues;
}

/** 正文格式批量检查（字体、字号、行距、缩进）*/
function checkBodyFormat(doc: ParsedDocument, mode: 'official' | 'business'): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const standard = mode === 'official' ? OFFICIAL_STANDARD.body : BUSINESS_STANDARD.body;

  // 跳过前3段（通常是标题区域），从第4段开始检查正文
  const startIndex = Math.min(3, doc.paragraphs.length);

  for (let i = startIndex; i < doc.paragraphs.length; i++) {
    const para = doc.paragraphs[i];
    if (!para.text.trim()) continue; // 跳过空行

    const loc = `第${para.index + 1}段`;

    // 字体检查
    const eastAsiaFont = para.font.eastAsia || para.font.ascii || '';
    if (eastAsiaFont) {
      const isStandardFont =
        mode === 'official'
          ? eastAsiaFont.includes('仿宋')
          : eastAsiaFont.includes('宋体') || eastAsiaFont.includes('微软雅黑');
      if (!isStandardFont) {
        issues.push(createIssue({
          category: 'body_font',
          severity: 'error',
          location: loc,
          problem: '正文字体不规范',
          expected: standard.font,
          actual: eastAsiaFont,
          suggestion: `正文字体应为 ${standard.font}`,
          autoFixable: true,
          fixAction: { type: 'set_font', fontName: standard.font, fontSizePt: standard.sizePt },
          paragraphIndex: para.index,
        }));
      }
    }

    // 字号检查
    if (para.font.sizeHalfPt) {
      const actualPt = halfPtToPt(para.font.sizeHalfPt);
      if (Math.abs(actualPt - standard.sizePt) > 1) {
        issues.push(createIssue({
          category: 'font_size',
          severity: 'error',
          location: loc,
          problem: '正文字号不规范',
          expected: ptToChineseSizeName(standard.sizePt),
          actual: ptToChineseSizeName(actualPt),
          suggestion: `正文字号应为 ${ptToChineseSizeName(standard.sizePt)}`,
          autoFixable: true,
          fixAction: { type: 'set_font', fontName: standard.font, fontSizePt: standard.sizePt },
          paragraphIndex: para.index,
        }));
      }
    }

    // 行距检查
    if (para.spacing?.line) {
      // line 值如果是具体磅值模式（lineRule=exact/atLeast），单位是 240 = 单倍行距
      // 固定行距28磅 = 28 * 240 / 20 = 336 （twip-based）
      const targetLineTwips = Math.round(standard.lineSpacingPt * 240 / 20); // 约 336
      const actualLine = para.spacing.line;
      const tolerance = 40; // 允许约2pt误差

      if (Math.abs(actualLine - targetLineTwips) > tolerance) {
        issues.push(createIssue({
          category: 'line_spacing',
          severity: 'warning',
          location: loc,
          problem: '行间距不规范',
          expected: `${standard.lineSpacingPt}磅固定行距`,
          actual: `${Math.round(actualLine * 20 / 240)}磅`,
          suggestion: `行间距应设为 ${standard.lineSpacingPt}磅固定值`,
          autoFixable: true,
          fixAction: { type: 'set_line_spacing', value: standard.lineSpacingPt, rule: 'atLeast' },
          paragraphIndex: para.index,
        }));
      }
    }

    // 首行缩进检查（约 2字符 ≈ 480 twips for 三号字）
    if (para.indent?.firstLine !== undefined) {
      // 三号字(16pt) × 2字符 ≈ 32pt ≈ 640 twips
      const expectedFirstLine = 640; // 近似值
      const actual = para.indent.firstLine;
      if (Math.abs(actual - expectedFirstLine) > 100) {
        issues.push(createIssue({
          category: 'paragraph_indent',
          severity: 'warning',
          location: loc,
          problem: '首行缩进不规范',
          expected: '约2字符',
          actual: `${Math.round(actual / 320)}字符左右`,
          suggestion: '首行缩进应为2字符',
          autoFixable: true,
          fixAction: { type: 'set_indent', firstLineChars: 2 },
          paragraphIndex: para.index,
        }));
      }
    } else if (para.text.trim() && !para.numberingLevel) {
      // 有内容但无首行缩进（排除编号列表项）
      issues.push(createIssue({
        category: 'paragraph_indent',
        severity: 'info',
        location: loc,
        problem: '未检测到首行缩进',
        expected: '首行缩进2字符',
        actual: '无缩进',
        suggestion: '建议设置首行缩进2字符',
        autoFixable: true,
        fixAction: { type: 'set_indent', firstLineChars: 2 },
        paragraphIndex: para.index,
      }));
    }
  }

  return issues;
}

/** 层级结构检查（一、二、三 / （一）（二）/ 1. 2. 等）*/
function checkStructure(doc: ParsedDocument, mode: 'official' | 'business'): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 只在公文模式下做严格的层级结构检查
  if (mode !== 'official') return issues;

  const headingPatterns = [
    { regex: /^[一二三四五六七八九十]+[、.．]/, level: 1, label: '一级标题（一、）' },
    { regex: /^（[一二三四五六七八九十]+）/, level: 2, label: '二级标题（（一））' },
    { regex: /^\d+[.．]\s*/, level: 3, label: '三级标题（1.）' },
    { regex: /^（\d+）/, level: 4, label: '四级标题（（1））' },
  ];

  let prevLevel = 0;
  let hasHeading = false;

  for (const para of doc.paragraphs) {
    const text = para.text.trim();
    if (!text) continue;

    for (const pattern of headingPatterns) {
      if (pattern.regex.test(text)) {
        hasHeading = true;
        // 检查层级顺序是否合理（不能跳级太多）
        if (prevLevel > 0 && pattern.level > prevLevel + 1) {
          issues.push(createIssue({
            category: 'structure',
            severity: 'warning',
            location: `第${para.index + 1}段`,
            problem: '标题层级跳跃',
            expected: `应在 ${pattern.level - 1} 级和 ${pattern.level} 级之间插入过渡层级`,
            actual: `从上一级直接跳到${pattern.label}`,
            suggestion: '确保标题层级按 一、→（一）→ 1. →（1）顺序递进',
            paragraphIndex: para.index,
          }));
        }
        prevLevel = pattern.level;
        break;
      }
    }
  }

  // 如果没有任何层级标题
  if (!hasHeading && doc.paragraphs.length > 5) {
    issues.push(createIssue({
      category: 'structure',
      severity: 'info',
      location: '全文',
      problem: '未检测到标准的公文层级结构',
      expected: '至少应有 一、二级标题划分',
      actual: '全文为平铺式排版',
      suggestion: '建议按照 GB/T 9704-2012 规范设置标题层级',
    }));
  }

  return issues;
}

/** 发文字号检查 */
function checkDocNumber(doc: ParsedDocument, _mode: 'official' | 'business'): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 发文字号通常在前几段，格式如 "××〔2026〕×号"
  const docNumberPattern = /[^\s〔]*〔\d{4}〕\d*号/;
  let found = false;

  for (let i = 0; i < Math.min(5, doc.paragraphs.length); i++) {
    if (docNumberPattern.test(doc.paragraphs[i].text)) {
      found = true;
      break;
    }
  }

  if (!found) {
    issues.push(createIssue({
      category: 'document_number',
      severity: 'info',
      location: '文首区域',
      problem: '未检测到发文字号',
      expected: '发文机关标识下方应有发文字号',
      actual: '未发现符合 ××〔年份〕××号 格式的发文字号',
      suggestion: '确认是否需要添加发文字号（部分公文类型不需要）',
    }));
  }

  return issues;
}

/** 落款格式检查 */
function checkSignature(doc: ParsedDocument, mode: 'official' | 'business'): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const standard = mode === 'official' ? OFFICIAL_STANDARD.signature : null;

  // 检查最后几段的落款
  const tailParas = doc.paragraphs.slice(-5);
  let hasSignature = false;

  for (let i = tailParas.length - 1; i >= 0; i--) {
    const para = tailParas[i];
    const text = para.text.trim();
    if (!text) continue;

    // 判断是否像落款（机关名称或日期）
    const looksLikeSignature =
      /[机关单位部门公司局委办]/.test(text) ||
      /二〇\d{2}[年月日]/.test(text) ||
      /\d{4}[年./-]\d{1,2}[年./-]\d{1,2}/.test(text);

    if (looksLikeSignature) {
      hasSignature = true;

      if (standard && para.alignment !== standard.align) {
        issues.push(createIssue({
          category: 'signature',
          severity: 'warning',
          location: `第${para.index + 1}段（落款区域）`,
          problem: '落款对齐方式不正确',
          expected: standard.align === 'right' ? '右对齐' : standard.align,
          actual: para.alignment === 'center' ? '居中' : para.alignment || '左对齐',
          suggestion: '落款应右对齐',
          autoFixable: true,
          fixAction: { type: 'set_alignment', alignment: 'right' },
          paragraphIndex: para.index,
        }));
      }

      break;
    }
  }

  if (!hasSignature && doc.paragraphs.length > 3) {
    issues.push(createIssue({
      category: 'signature',
      severity: 'info',
      location: '文档末尾',
      problem: '未检测到落款信息',
      expected: '文档末尾应有发文机关署名和成文日期',
      actual: '未发现落款',
      suggestion: '确认是否需要在末尾添加落款',
    }));
  }

  return issues;
}

// ==================== 主校验入口 ====================

/**
 * 执行完整校验
 * @param parsed - 已解析的文档
 * @param mode - 校验模式
 * @returns 完整的校验报告
 */
export function validateDocument(
  parsed: ParsedDocument,
  mode: 'official' | 'business' = 'official',
): ValidationReport {
  issueIdCounter = 0; // 重置 ID 计数器

  // 运行所有检查规则
  const allIssues = [
    ...checkPageMargins(parsed, mode),
    ...checkTitleFormat(parsed, mode),
    ...checkBodyFormat(parsed, mode),
    ...checkStructure(parsed, mode),
    ...checkDocNumber(parsed, mode),
    ...checkSignature(parsed, mode),
  ];

  // 统计各级问题数量
  const errorCount = allIssues.filter((i) => i.severity === 'error').length;
  const warningCount = allIssues.filter((i) => i.severity === 'warning').length;
  const infoCount = allIssues.filter((i) => i.severity === 'info').length;

  // 合规评分（满分100，每扣分项根据严重度）
  let score = 100;
  score -= errorCount * 8;
  score -= warningCount * 2;
  score -= infoCount;
  score = Math.max(0, score);

  // 生成摘要
  const summary = generateSummary(allIssues, score, mode);

  return {
    documentName: 'uploaded.docx',
    mode,
    totalIssues: allIssues.length,
    errorCount,
    warningCount,
    infoCount,
    score,
    issues: allIssues,
    summary,
    checkedAt: new Date().toISOString(),
  };
}

/** 生成人类可读的摘要 */
function generateSummary(issues: ValidationIssue[], score: number, mode: string): string {
  const modeLabel = mode === 'official' ? '党政公文' : '商务文档';
  const total = issues.length;

  if (total === 0) {
    return `🎉 恭喜！该${modeLabel}完全符合格式规范，评分 100 分。`;
  }

  const levelText =
    score >= 80 ? '整体较好，存在少量需调整项' :
    score >= 60 ? '基本合规，有多处需要修正' :
    '格式问题较多，建议全面修订';

  // 按 category 聚合
  const byCategory: Record<string, number> = {};
  for (const issue of issues) {
    const cat = CATEGORY_LABELS[issue.category] || issue.category;
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${name}(${count})`)
    .join('、');

  return `该${modeLabel}评分为 ${score}/100，${levelText}。主要问题分布：${topCategories}。`;
}
