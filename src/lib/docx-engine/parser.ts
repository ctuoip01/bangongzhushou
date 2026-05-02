/**
 * DOCX 解析引擎
 * 将 .docx 文件解压为结构化数据（段落+格式属性）
 *
 * 技术原理：
 * - .docx 本质是 ZIP 压缩包，内部包含 XML 文件
 * - 核心文件：word/document.xml（内容）+ word/styles.xml（样式定义）+ word/numbering.xml（编号列表）
 * - 使用 jszip 解压，fast-xml-parser 解析 XML
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import type {
  ParsedDocument,
  ParsedParagraph,
  FontInfo,
  SpacingInfo,
  IndentInfo,
  PageSettings,
} from './types';

// ==================== XML 解析器配置 ====================

/** 忽略的命名空间前缀映射 */
const NS_MAP: Record<string, string> = {
  'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  'mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
  'w14': 'http://schemas.microsoft.com/office/word/2010/wordml',
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  tagValueProcessor: (val) => val.replace(/\s+/g, ' ').trim(),
  isArray: () => true, // 所有节点都返回数组
});

// ==================== 工具函数 ====================

/** 获取带命名空间的标签名 */
function ns(tag: string): string {
  return `http://schemas.openxmlformats.org/wordprocessingml/2006/main:${tag}`;
}

/** 安全获取数组中的第一个元素 */
function first<T>(arr: T[] | T | undefined | null): T | undefined {
  if (!arr) return undefined;
  return Array.isArray(arr) ? arr[0] : arr;
}

/** 安全获取属性值 */
function attr(el: Record<string, unknown> | undefined, name: string): string | undefined {
  if (!el || typeof el !== 'object') return undefined;
  const v = el[`@_${name}`];
  return typeof v === 'string' ? v : undefined;
}

// ==================== 字体解析 ====================

/** 从 rPr 元素解析字体信息 */
function parseRunFont(rPr: unknown): FontInfo {
  const fontInfo: FontInfo = {};
  if (!rPr || typeof rPr !== 'object' || !('rFonts' in rPr)) return fontInfo;

  const rFonts = (rPr as Record<string, unknown>)['rFonts'] as Record<string, unknown>;
  fontInfo.ascii = attr(rFonts, 'ascii') ?? attr(rFonts, 'asciiTheme');
  fontInfo.eastAsia = attr(rFonts, 'eastAsia') ?? attr(rFonts, 'eastAsiaTheme');
  fontInfo.hAnsi = attr(rFonts, 'hAnsi') ?? attr(rFonts, 'hAnsiTheme');

  return fontInfo;
}

/** 从 rPr 或 pPr 解析字号 */
function parseFontSize(pr: Record<string, unknown> | undefined): number | undefined {
  if (!pr) return undefined;
  // sz 是半磅值，szCs 是复杂脚本字号，优先取 sz
  const raw = attr(pr, 'sz');
  if (raw) {
    const val = parseInt(raw, 10);
    if (!isNaN(val)) return val;
  }
  // 尝试从样式的继承值中获取（需要 styles.xml 配合）
  return undefined;
}

// ==================== 段落解析 ====================

/** 从 pPr 元素解析段落属性 */
function parseParagraphProps(pPr: unknown): {
  alignment: string | null;
  spacing: SpacingInfo | null;
  indent: IndentInfo | null;
  numberingLevel?: number;
  styleName?: string;
} {
  if (!pPr || typeof pPr !== 'object') {
    return { alignment: null, spacing: null, indent: null };
  }

  const props = pPr as Record<string, unknown>;

  // 对齐方式
  const jcEl = first(props['jc']);
  const alignment = jcEl ? (attr(jcEl as Record<string, unknown>, 'val') ?? null) : null;

  // 段落间距
  let spacing: SpacingInfo | null = null;
  const spacingEl = first(props['spacing']);
  if (spacingEl && typeof spacingEl === 'object') {
    const sp = spacingEl as Record<string, unknown>;
    spacing = {};
    const lineVal = attr(sp, 'line');
    if (lineVal) spacing.line = parseInt(lineVal, 10);
    const lineRule = attr(sp, 'lineRule');
    if (lineRule) spacing.lineRule = lineRule as SpacingInfo['lineRule'];
    const before = attr(sp, 'before');
    if (before) spacing.before = parseInt(before, 10);
    const after = attr(sp, 'after');
    if (after) spacing.after = parseInt(after, 10);
  }

  // 缩进
  let indent: IndentInfo | null = null;
  const indEl = first(props['ind']);
  if (indEl && typeof indEl === 'object') {
    const ind = indEl as Record<string, unknown>;
    indent = {};
    const left = attr(ind, 'left');
    if (left) indent.left = parseInt(left, 10);
    const right = attr(ind, 'right');
    if (right) indent.right = parseInt(right, 10);
    const firstLine = attr(ind, 'firstLine');
    if (firstLine) indent.firstLine = parseInt(firstLine, 10);
    const hanging = attr(ind, 'hanging');
    if (hanging) indent.hanging = parseInt(hanging, 10);
  }

  // 编号级别
  let numberingLevel: number | undefined;
  const numPr = first(props['numPr']) as Record<string, unknown> | undefined;
  if (numPr) {
    const ilvlEl = first(numPr['pIlvl']) as Record<string, unknown> | undefined;
    if (ilvlEl) {
      const val = attr(ilvlEl, 'val');
      if (val !== undefined) numberingLevel = parseInt(val, 10);
    }
  }

  // 样式名称
  let styleName: string | undefined;
  const pStyleEl = first(props['pStyle']) as Record<string, unknown> | undefined;
  if (pStyleEl) {
    styleName = attr(pStyleEl, 'val');
  }

  return { alignment, spacing, indent, numberingLevel, styleName };
}

/** 提取 run 的文本内容和格式 */
function extractRuns(rArr: unknown[]): {
  text: string;
  runs: ParsedParagraph['runs'];
  font: FontInfo;
  sizeHalfPt?: number;
  bold: boolean | null;
} {
  const runs: ParsedParagraph['runs'] = [];
  const textParts: string[] = [];
  let mainFont: FontInfo = {};
  let mainSize: number | undefined;
  let mainBold: boolean | null = null;

  for (const r of rArr) {
    if (!r || typeof r !== 'object') continue;
    const rObj = r as Record<string, unknown>;

    // 提取文本
    const tArr = rObj['t'];
    if (Array.isArray(tArr)) {
      for (const t of tArr) {
        const text = typeof t === 'string' ? t : (t && typeof t === 'object' ? attr(t as Record<string, unknown>, '_text') : '');
        if (text) textParts.push(text);
      }
    } else if (typeof tArr === 'string' && tArr) {
      textParts.push(tArr);
    }

    // 提取格式
    const rPr = first(rObj['rPr']);
    const font = rPr ? parseRunFont(rPr) : {};
    const size = rPr ? parseFontSize(rPr as Record<string, unknown>) : undefined;
    const b = rPr ? (attr(rPr as Record<string, unknown>, 'b') === '1' ||
      attr(rPr as Record<string, unknown>, 'b') === 'true' ? true :
      (attr(rPr as Record<string, unknown>, 'b') === '0' ||
        attr(rPr as Record<string, unknown>, 'b') === 'false' ? false : null)
    ) : null;
    const i = rPr ? (attr(rPr as Record<string, unknown>, 'i') === '1' ||
      attr(rPr as Record<string, unknown>, 'i') === 'true'
    ) : false;

    runs.push({
      text: textParts[textParts.length - 1] || '',
      font,
      sizeHalfPt: size,
      bold: b,
      italic: i,
    });

    // 记录第一个有格式的 run 作为段落的"主格式"
    if (!mainFont.eastAsia && font.eastAsia) mainFont = font;
    if (mainSize === undefined && size !== undefined) mainSize = size;
    if (mainBold === null && b !== null) mainBold = b;
  }

  return {
    text: textParts.join(''),
    runs,
    font: mainFont,
    sizeHalfPt: mainSize,
    bold: mainBold,
  };
}

/** 解析单个段落元素 */
function parseParagraph(
  pEl: Record<string, unknown>,
  index: number,
): ParsedParagraph {
  // 段落属性
  const pPr = first(pEl['pPr']);
  const paraProps = parseParagraphProps(pPr);

  // Runs（文本片段）
  const rArr = Array.isArray(pEl['r']) ? pEl['r'] : (pEl['r'] ? [pEl['r']] : []);
  const { text, runs, font, sizeHalfPt, bold } = extractRuns(rArr);

  return {
    index,
    text,
    alignment: paraProps.alignment,
    font: { ...font, sizeHalfPt },
    bold,
    spacing: paraProps.spacing,
    indent: paraProps.indent,
    numberingLevel: paraProps.numberingLevel,
    styleName: paraProps.styleName,
    _xmlElement: pEl,
    runs,
  };
}

// ==================== 页面设置解析 ====================

/** 从 document.xml 的 sectPr 中提取页面设置 */
function parsePageSettings(bodyEl: Record<string, unknown>): PageSettings {
  // sectPr 可能在 body 级别或最后一个 paragraph 的 pPr 里
  let sectPr = first(bodyEl['sectPr']) as Record<string, unknown> | undefined;

  // 如果没有，查找最后一个段落的 sectPr
  if (!sectPr) {
    const paragraphs = bodyEl['p'];
    if (Array.isArray(paragraphs) && paragraphs.length > 0) {
      const lastP = paragraphs[paragraphs.length - 1] as Record<string, unknown>;
      if (lastP && typeof lastP === 'object') {
        const pPr = first(lastP['pPr']);
        if (pPr && typeof pPr === 'object') {
          sectPr = first((pPr as Record<string, unknown>)['sectPr']) as Record<string, unknown> | undefined;
        }
      }
    }
  }

  /** twip → mm */
  function twipToMM(val: string | undefined, defaultVal: number): number {
    if (!val) return defaultVal;
    const num = parseInt(val, 10);
    return isNaN(num) ? defaultVal : Number((num / 56.6929).toFixed(1));
  }

  const pgMar = sectPr ? (first(sectPr['pgMar']) as Record<string, unknown> | undefined) : undefined;
  const pgSz = sectPr ? (first(sectPr['pgSz']) as Record<string, unknown> | undefined) : undefined;

  return {
    top: twipToMM(pgMar ? attr(pgMar, 'top') : undefined, 25.4),
    bottom: twipToMM(pgMar ? attr(pgMar, 'bottom') : undefined, 25.4),
    left: twipToMM(pgMar ? attr(pgMar, 'left') : undefined, 31.8),
    right: twipToMM(pgMar ? attr(pgMar, 'right') : undefined, 31.8),
    header: twipToMM(pgMar ? attr(pgMar, 'header') : undefined, 12.7),
    footer: twipToMM(pgMar ? attr(pgMar, 'footer') : undefined, 12.7),
    width: twipToMM(pgSz ? attr(pgSz, 'w') : undefined, 210),
    height: twipToMM(pgSz ? attr(pgSz, 'h') : undefined, 297),
  };
}

// ==================== 主入口：解析 DOCX ====================

/**
 * 解析 DOCX 文件为结构化数据
 * @param buffer - 文件的 ArrayBuffer / Buffer
 * @returns 结构化的文档数据
 */
export async function parseDocx(buffer: BufferSource | Blob | ArrayBuffer): Promise<ParsedDocument> {
  // 1. 解压 ZIP
  const zip = await JSZip.loadAsync(new Uint8Array(buffer as ArrayBufferLike));

  // 2. 提取关键 XML 文件
  const documentXmlFile = zip.file('word/document.xml');
  if (!documentXmlFile) {
    throw new Error('无效的 DOCX 文件：缺少 word/document.xml');
  }

  const documentXmlStr = await documentXmlFile.async('string');

  const stylesXmlFile = zip.file('word/styles.xml');
  const stylesXmlStr = stylesXmlFile ? await stylesXmlFile.async('string') : '';

  const numberingXmlFile = zip.file('word/numbering.xml');
  const numberingXmlStr = numberingXmlFile ? await numberingXmlFile.async('string') : null;

  // 3. 解析 XML 为 JSON 对象
  const xmlDoc = xmlParser.parse(documentXmlStr);

  // 4. 提取 body > 段落列表
  const body = first(xmlDoc['document']) as Record<string, unknown> | undefined;
  if (!body) throw new Error('无法解析 document.xml');

  const bodyBody = first(body['body']) as Record<string, unknown> | undefined;
  if (!bodyBody) throw new Error('无法找到 <body>');

  // 5. 解析所有段落
  const pElements = Array.isArray(bodyBody['p'])
    ? bodyBody['p']
    : (bodyBody['p'] ? [bodyBody['p']] : []);

  const paragraphs: ParsedParagraph[] = [];

  for (let i = 0; i < pElements.length; i++) {
    const pEl = pElements[i];
    if (pEl && typeof pEl === 'object') {
      paragraphs.push(parseParagraph(pEl as Record<string, unknown>, i));
    }
  }

  // 6. 解析页面设置
  const pageSettings = parsePageSettings(bodyBody);

  return {
    paragraphs,
    pageSettings,
    rawXmls: {
      documentXml: documentXmlStr,
      stylesXml: stylesXmlStr,
      numberingXml: numberingXmlStr,
    },
  };
}

/**
 * 快速预览模式 — 仅提取纯文本和基本信息（用于大文件的快速扫描）
 */
export async function quickPreview(buffer: BufferSource | Blob | ArrayBuffer): Promise<{
  text: string;
  pageCount: number;
}> {
  const zip = await JSZip.loadAsync(new Uint8Array(buffer as ArrayBufferLike));
  const file = zip.file('word/document.xml');
  if (!file) throw new Error('无效的 DOCX 文件');

  const xmlStr = await file.async('string');
  const xmlDoc = xmlParser.parse(xmlStr);
  const body = first(first(xmlDoc['document'])?.['body']);

  const texts: string[] = [];
  if (body?.['p']) {
    const ps = Array.isArray(body['p']) ? body['p'] : [body['p']];
    for (const p of ps) {
      if (!p || typeof p !== 'object') continue;
      const rs = Array.isArray(p['r']) ? p['r'] : (p['r'] ? [p['r']] : []);
      for (const r of rs) {
        if (!r || typeof r !== 'object') continue;
        const ts = Array.isArray(r['t']) ? r['t'] : (r['t'] ? [r['t']] : []);
        for (const t of ts) {
          const txt = typeof t === 'string' ? t : (typeof t === 'object' ? attr(t as Record<string, unknown>, '_text') : '');
          if (txt) texts.push(txt);
        }
      }
    }
  }

  return {
    text: texts.join('\n'),
    // 通过分页符粗略估计页数
    pageCount: Math.max(1, Math.ceil(texts.join('').length / 2000)),
  };
}
