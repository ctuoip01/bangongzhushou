/**
 * DOCX 公文格式校验引擎 - 类型定义
 * 参考 GB/T 9704-2012《党政机关公文格式》国家标准
 */

// ==================== 命名空间映射（OOXML WordProcessingML）====================

export const W = {
  NS: 'w:',
  P: 'p',
  PR: 'pPr',           // 段落属性
  R: 'r',              // run（文本段）
  RPR: 'rPr',          // run 属性
  T: 't',              // 文本
  RFONTS: 'rFonts',    // 字体
  SZ: 'sz',            // 字号（半磅值）
  SZCS: 'szCs',        // 复杂脚本字号
  B: 'b',              // 加粗
  I: 'i',              // 斜体
  COLOR: 'color',      // 字体颜色
  JC: 'jc',            // 对齐方式 (justify/center/right/left/both)
  SPACING: 'spacing',  // 行距与段落间距
  IND: 'ind',          // 缩进
  SECTPR: 'sectPr',    // 节属性（页边距等）
  PGMAR: 'pgMar',      // 页边距
  PG_SZ: 'pgSz',       // 页面大小
  NUMPR: 'numPr',      // 编号属性
  PILVL: 'pIlvl',      // 列表缩进级别
  NUMID: 'numId',      // 编号ID
  PINST: 'pStyle',     // 段落样式引用
  RSTYLE: 'rStyle',    // Run 样式引用
} as const;

// ==================== 核心数据结构 ====================

/** 字体信息 */
export interface FontInfo {
  ascii?: string;       // 英文字体
  eastAsia?: string;    // 中文字体
  hAnsi?: string;       // 西文字体
  sizeHalfPt?: number;  // 字号（半磅值，如32=16pt）
}

/** 缩进信息 */
export interface IndentInfo {
  left?: number;        // 左缩进（twip，1pt=20twip，约0.35mm）
  right?: number;       // 右缩进（twip）
  firstLine?: number;   // 首行缩进（twip）
  hanging?: number;     // 悬挂缩进（twip）
}

/** 段落间距 */
export interface SpacingInfo {
  line?: number;        // 行距（240=单倍行距，360=1.5倍，480=双倍；或具体磅值*240）
  lineRule?: 'auto' | 'atLeast' | 'exact';
  before?: number;      // 段前间距
  after?: number;       // 段后间距
}

/** 解析出的单个段落 */
export interface ParsedParagraph {
  /** 段落在文档中的序号（从0开始） */
  index: number;
  /** 纯文本内容 */
  text: string;
  /** 对齐方式 */
  alignment: string | null;
  /** 主字体信息（取第一个run的字体） */
  font: FontInfo;
  /** 是否加粗 */
  bold: boolean | null;
  /** 段落间距 */
  spacing: SpacingInfo | null;
  /** 缩进 */
  indent: IndentInfo | null;
  /** 编号列表级别（如果有） */
  numberingLevel?: number;
  /** 段落样式名称 */
  styleName?: string;
  /** 原始 XML 元素引用（用于后续修改） */
  _xmlElement?: unknown;
  /** 该段落的 runs 列表（每个run可能有不同格式） */
  runs: {
    text: string;
    font: FontInfo;
    sizeHalfPt?: number;
    bold: boolean | null;
    italic: boolean | null;
  }[];
}

/** 页面设置 */
export interface PageSettings {
  top: number;          // 上边距 mm
  bottom: number;       // 下边距 mm
  left: number;         // 左边距 mm
  right: number;        // 右边距 mm
  header: number;       // 页眉 mm
  footer: number;       // 页脚 mm
  width: number;        // 纸张宽度 mm
  height: number;       // 纸张高度 mm
}

/** 完整的解析结果 */
export interface ParsedDocument {
  paragraphs: ParsedParagraph[];
  pageSettings: PageSettings;
  rawXmls: {
    documentXml: string;
    stylesXml: string;
    numberingXml: string | null;
  };
}

// ==================== 校验结果类型 ====================

export type IssueSeverity = 'error' | 'warning' | 'info';

export type IssueCategory =
  | 'page_margin'        // 页边距
  | 'title_format'       // 标题格式
  | 'font_size'          // 字体字号
  | 'body_font'          // 正文字体
  | 'line_spacing'       // 行距
  | 'paragraph_indent'   // 段落缩进
  | 'alignment'          // 对齐方式
  | 'document_number'    // 发文字号
  | 'recipient'          // 主送机关
  | 'attachment'         // 附件标注
  | 'signature'          // 落款格式
  | 'date_format'        // 成文日期
  | 'structure'          // 层级结构
  | 'other';             // 其他

/** 单个校验问题 */
export interface ValidationIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  location: string;              // 位置描述，如"第3段"或"标题"
  problem: string;               // 问题描述
  expected: string;              // 应该是什么样的
  actual: string;                // 实际是什么样的
  suggestion: string;            // 修改建议
  autoFixable: boolean;          // 是否可以自动修复
  /** 关联的段落索引（用于自动修复） */
  paragraphIndex?: number;
  /** 修复指令 */
  fixAction?: FixAction;
}

/** 修复动作 */
export type FixAction =
  | { type: 'set_font'; fontName: string; fontSizePt: number }
  | { type: 'set_alignment'; alignment: string }
  | { type: 'set_line_spacing'; value: number; rule: 'auto' | 'atLeast' }
  | { type: 'set_indent'; firstLineChars: number }
  | { type: 'set_page_margin'; margin: keyof PageSettings; valueMM: number };

/** 完整校验报告 */
export interface ValidationReport {
  documentName: string;
  mode: 'official' | 'business';
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  score: number;                 // 0-100 合规评分
  issues: ValidationIssue[];
  summary: string;
  checkedAt: string;
}
