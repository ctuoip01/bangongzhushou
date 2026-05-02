/**
 * GB/T 9704-2012《党政机关公文格式》国家标准定义
 * 以及通用商务文档格式规范
 */

import type { PageSettings, IssueCategory } from './types';

// ==================== 单位转换工具 ====================

/** mm → twip（1mm ≈ 56.6929twip） */
export function mmToTwip(mm: number): number {
  return Math.round(mm * 56.6929);
}

/** pt → 半磅值（1pt = 2 half-points） */
export function ptToHalfPt(pt: number): number {
  return Math.round(pt * 2);
}

/** twip → mm */
export function twipToMM(twip: number): number {
  return Number((twip / 56.6929).toFixed(1));
}

/** 半磅值 → pt */
export function halfPtToPt(halfPt: number): number {
  return halfPt / 2;
}

// ==================== 公文标准（GB/T 9704-2012）====================

/**
 * 党政机关公文格式核心参数
 * 来源：GB/T 9704-2012
 */
export const OFFICIAL_STANDARD = {
  /** 页面设置 */
  pageMargins: {
    top: 37,       // 上白边 37mm
    bottom: 35,    // 下白边 35mm
    left: 28,      // 左白边 28mm
    right: 26,     // 右白边 26mm
    header: 15,    // 版心距页眉上沿 15mm
    footer: 20,    // 版心距页脚下沿 20mm
  } satisfies Omit<PageSettings, 'width' | 'height'>,

  /** 纸张：A4 (210×297mm) */
  pageSize: { width: 210, height: 297 },

  /** 标题：发文机关+关于+事项+文种 */
  title: {
    font: '小标宋',           // 或"方正小标宋简体"
    sizePt: 22,               // 二号
    align: 'center',          // 居中
  },

  /** 副标题/签发人等 */
  subtitle: {
    font: '楷体',
    sizePt: 18,              // 三号偏大
    align: 'center',
  },

  /** 发文字号 */
  docNumber: {
    font: '仿宋_GB2312',
    sizePt: 16,              // 三号
    align: 'center',
  },

  /** 正文主体 */
  body: {
    font: '仿宋_GB2312',     // 正文三号仿宋
    sizePt: 16,              // 三号
    lineSpacingPt: 28,       // 固定行距28磅
    firstLineIndentChars: 2, // 首行缩进2字符
  },

  /** 一级标题：一、二、三、... */
  heading1: {
    font: '黑体',            // 一级标题用黑体
    sizePt: 16,
    bold: true,
  },

  /** 二级标题：（一）（二）（三）... */
  heading2: {
    font: '楷体',
    sizePt: 16,
    bold: false,
  },

  /** 三级标题：1. 2. 3. ... */
  heading3: {
    font: '仿宋_GB2312',
    sizePt: 16,
    bold: true,
  },

  /** 四级标题：（1）（2）（3）... */
  heading4: {
    font: '仿宋_GB2312',
    sizePt: 16,
  },

  /** 落款（发文机关+日期） */
  signature: {
    align: 'right',          // 右对齐
    offsetFromRightChars: 4, // 距右边4字符
    dateFormat: 'chinese',   // 汉字数字日期，如"二〇二六年五月一日"
  },

  /** 附件说明 */
  attachment: {
    font: '仿宋_GB2312',
    sizePt: 16,
  },

  /** 版记（抄送、印发机关等） */
  versionNote: {
    font: '仿宋_GB2312',
    sizePt: 14,             // 四号
    lineStyle: 'solid',     // 分隔线
  },
} as const;

// ==================== 商务文档标准 =====================

/**
 * 通用商务文档格式规范
 */
export const BUSINESS_STANDARD = {
  pageMargins: {
    top: 25.4,      // 1英寸
    bottom: 25.4,
    left: 31.8,     // 约1.25英寸
    right: 31.8,
    header: 12.7,
    footer: 12.7,
  } satisfies Omit<PageSettings, 'width' | 'height'>,

  pageSize: { width: 210, height: 297 },

  title: {
    font: '微软雅黑',  // 或 "黑体"
    sizePt: 18,        // 小三
    align: 'center',
  },

  body: {
    font: '宋体',      // 或 "微软雅黑"
    sizePt: 12,        // 小四
    lineSpacingPt: 22, // 1.5倍行距左右
    firstLineIndentChars: 2,
  },
} as const;

// ==================== 字号对照表 ====================

/**
 * 中文字号与磅值对应表
 * 用于在报告中显示用户友好的字号信息
 */
export const FONT_SIZE_MAP: Record<string, number> = {
  '初号': 42,
  '小初': 36,
  '一号': 26,
  '小一': 24,
  '二号': 22,
  '小二': 18,
  '三号': 16,
  '小三': 15,
  '四号': 14,
  '小四': 12,
  '五号': 10.5,
  '小五': 9,
  '六号': 7.5,
  '七号': 5.5,
  '八号': 5,
};

/** 磅值→中文字号（反向查找） */
export function ptToChineseSizeName(pt: number): string {
  const rounded = Math.round(pt);
  for (const [name, val] of Object.entries(FONT_SIZE_MAP)) {
    if (Math.abs(val - rounded) <= 0.5) return name;
  }
  return `${pt}磅`;
}

// ==================== 分类显示名称映射 =====================

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  page_margin: '页面边距',
  title_format: '标题格式',
  font_size: '字体字号',
  body_font: '正文字体',
  line_spacing: '行间距',
  paragraph_indent: '段落缩进',
  alignment: '对齐方式',
  document_number: '发文字号',
  recipient: '主送机关',
  attachment: '附件标注',
  signature: '落款格式',
  date_format: '成文日期',
  structure: '层级结构',
  other: '其他问题',
};

export const SEVERITY_LABELS = {
  error: '错误',
  warning: '警告',
  info: '提示',
} as const;

export const SEVERITY_COLORS = {
  error: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
} as const;
