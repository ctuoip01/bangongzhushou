/**
 * DOCX 自动修复引擎
 * 根据校验报告中的修复指令，生成修正后的 DOCX 文件
 *
 * 技术路径：
 * 1. 基于 rawXmls（原始XML字符串）
 * 2. 使用正则/字符串操作修改对应节点的属性值
 * 3. 重新打包为 ZIP → 输出新的 .docx 文件
 */

import JSZip from 'jszip';
import type { ValidationReport, FixAction, ParsedDocument } from './types';

// ==================== XML 属性修改工具 ====================

/**
 * 在 XML 字符串中定位并修改指定元素的属性
 *
 * @param xml - 原始 XML 字符串
 * @param tagName - 目标标签名（不带命名空间前缀）
 * @param index - 第几个匹配的标签（0-indexed，用于定位特定段落）
 * @param attrName - 要修改的属性名
 * @param newValue - 新属性值
 * @param createIfMissing - 如果属性不存在是否创建
 */
function setXmlAttribute(
  xml: string,
  tagName: string,
  index: number,
  attrName: string,
  newValue: string,
  createIfMissing = false,
): string {
  // 构建带命名空间的正则
  // OOXML 格式：<w:tagName ... w:attrName="oldValue" ...>
  // 匹配策略：找第 index 个 <w:tagName 开始标签

  const pattern = new RegExp(`<\\w*:${tagName}(?=[\\s/>])([^>]*)>`, 'g');
  let match: RegExpExecArray | null;
  let currentIndex = 0;
  let result = xml;

  while ((match = pattern.exec(xml)) !== null) {
    if (currentIndex === index) {
      const fullTag = match[0];
      const attrsPart = match[1];

      // 查找目标属性
      const attrPattern = new RegExp(`(\\w*:${attrName}=)(["'][^"']*["'])`, 'g');
      const attrMatch = attrsPart.match(attrPattern);

      if (attrMatch) {
        // 属性存在，替换值
        const oldAttrStr = attrMatch[0];
        const newAttrStr = oldAttrStr.replace(/=["'][^"']*["']/g, '="' + newValue + '"');
        const newFullTag = fullTag.replace(oldAttrStr, newAttrStr);
        result = result.substring(0, match.index) + newFullTag + result.substring(match.index + fullTag.length);
      } else if (createIfMissing) {
        // 属性不存在，创建它（在闭合 > 之前插入）
        const insertPos = match.index + fullTag.indexOf('>') + 1; // 实际上是在 > 之前
        const newAttr = ` ${attrName}="${newValue}"`;
        const newFullTag = fullTag.replace(/>$/, `${newAttr}>`);
        result = result.substring(0, match.index) + newFullTag + result.substring(match.index + fullTag.length);
      }
      break;
    }
    currentIndex++;
  }

  return result;
}

/**
 * 在指定段落的 pPr 内设置或创建子元素属性
 */
function setParagraphProperty(
  xml: string,
  paragraphIndex: number,
  childTagName: string,
  attrName: string,
  value: string,
): string {
  // 先找到第 paragraphIndex 个 <w:p>
  const pPattern = /<\w*:p\b/g;
  let pMatch: RegExpExecArray | null;
  let pIdx = 0;
  let targetPStart = -1;
  let targetPEnd = -1;

  while ((pMatch = pPattern.exec(xml)) !== null) {
    if (pIdx === paragraphIndex) {
      // 找到这个段落的范围（到下一个 <w:p> 或 </w:body>）
      targetPStart = pMatch.index;
      const nextPMatch = pPattern.exec(xml);
      targetPEnd = nextPMatch ? nextPMatch.index : xml.indexOf('</w:body>');
      if (targetPEnd === -1) targetPEnd = xml.length;
      break;
    }
    pIdx++;
  }

  if (targetPStart === -1) return xml; // 未找到目标段落

  const pContent = xml.substring(targetPStart, targetPEnd);

  // 检查是否已有 pPr
  const hasPPr = /<\w*:pPr\b/.test(pContent);

  if (hasPPr) {
    // 已有 pPr，在其中查找或创建子元素
    // 简单策略：在整个段落范围内设置该属性
    return setXmlAttribute(xml, childTagName, paragraphIndex, attrName, value, true);
  }

  // 没有 pPr，需要在 <w:p> 后面插入一个 <w:pPr><w:childTag attrName="value"/></w:pPr>
  const insertAfterPTag = `<w:pPr><w:${childTagName} w:${attrName}="${value}"/></w:pPr>`;
  return (
    xml.substring(0, targetPStart + pMatch![0].length) +
    insertAfterPTag +
    xml.substring(targetPStart + pMatch![0].length)
  );
}

// ==================== 修复动作实现 ====================

/** 应用单个修复动作到 XML */
function applyFix(xml: string, action: FixAction, paragraphIndex?: number): string {
  switch (action.type) {
    case 'set_font': {
      // 设置字体和字号
      // 需要在目标段落的每个 <w:r> 的 rPr 中修改 rFonts 和 sz
      const halfPt = Math.round(action.fontSizePt * 2).toString();

      if (paragraphIndex !== undefined) {
        let modified = xml;

        // 1. 设置 rFonts（在每个 run 中）
        modified = setParagraphProperty(modified, paragraphIndex, 'rFonts', 'ascii', action.fontName);
        modified = setParagraphProperty(modified, paragraphIndex, 'rFonts', 'eastAsia', action.fontName);
        modified = setParagraphProperty(modified, paragraphIndex, 'rFonts', 'hAnsi', action.fontName);

        // 2. 设置 sz
        modified = setParagraphProperty(modified, paragraphIndex, 'sz', 'val', halfPt);
        modified = setParagraphProperty(modified, paragraphIndex, 'szCs', 'val', halfPt);

        return modified;
      }
      return xml;
    }

    case 'set_alignment': {
      // 设置段落对齐方式
      if (paragraphIndex !== undefined) {
        return setParagraphProperty(xml, paragraphIndex, 'jc', 'val', action.alignment);
      }
      return xml;
    }

    case 'set_line_spacing': {
      // 设置行距
      // line 值 = 磅值 * 240 / 20 = 磅值 * 12
      const lineVal = Math.round(action.value * 12).toString();
      if (paragraphIndex !== undefined) {
        return setParagraphProperty(xml, paragraphIndex, 'spacing', 'val', lineVal);
      }
      return xml;
    }

    case 'set_indent': {
      // 设置首行缩进
      // 2字符 ≈ 对于三号字(16pt) = 32pt = 640 twips
      const CHARS_TO_TWIPS = 320; // 近似每字符 twips
      const twipVal = (action.firstLineChars * CHARS_TO_TWIPS).toString();
      if (paragraphIndex !== undefined) {
        return setParagraphProperty(xml, paragraphIndex, 'ind', 'firstLine', twipVal);
      }
      return xml;
    }

    case 'set_page_margin': {
      // 修改页边距（mm → twip）
      const twipVal = Math.round(action.valueMM * 56.6929).toString();
      // 页边距在 sectPr > pgMar 中
      return setXmlAttribute(xml, 'pgMar', 0, action.margin, twipVal, true);
    }

    default:
      return xml;
  }
}

// ==================== 主入口 ====================

/**
 * 根据校验报告自动修复文档
 * @param originalBuffer - 原始 DOCX 文件的 buffer
 * @param report - 校验报告
 * @param parsed - 已解析的文档对象（可选，用于辅助定位）
 * @param options - 选项
 * @returns 修复后的 DOCX 文件 Uint8Array
 */
export async function autoFixDocument(
  originalBuffer: BufferSource | ArrayBuffer,
  report: ValidationReport,
  parsed?: ParsedDocument,
  options?: { fixAll?: boolean; onlyAutoFixable?: boolean },
): Promise<Uint8Array> {
  const { fixAll = true, onlyAutoFixable = true } = options ?? {};

  // 筛选要执行的修复动作
  const fixesToApply = report.issues.filter((issue) => {
    if (!issue.fixAction) return false;
    if (onlyAutoFixable && !issue.autoFixable) return false;
    return true;
  });

  if (fixesToApply.length === 0) {
    // 无可修复项，返回原文件
    return new Uint8Array(originalBuffer instanceof ArrayBuffer ? originalBuffer : (originalBuffer as Buffer));
  }

  // 1. 加载原始 ZIP
  const zip = await JSZip.loadAsync(new Uint8Array(originalBuffer as ArrayBufferLike));
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) throw new Error('无效的 DOCX 文件');

  let xml = await docXmlFile.async('string');

  // 2. 按段落索引分组修复（同一段落合并处理）
  const fixesByPara = new Map<number | 'global', FixAction[]>();

  for (const fix of fixesToApply) {
    if (fix.fixAction) {
      const key = fix.paragraphIndex !== undefined ? fix.paragraphIndex : 'global';
      const list = fixesByPara.get(key) ?? [];
      list.push(fix.fixAction);
      fixesByPara.set(key, list);
    }
  }

  // 3. 依次应用修复（注意顺序：全局修复先执行）
  const globalFixes = fixesByPara.get('global') ?? [];
  for (const action of globalFixes) {
    xml = applyFix(xml, action);
  }

  // 按段落索引排序后逐个应用（从后往前修改避免位置偏移）
  const paraIndices = [...fixesByPara.keys()].filter((k) => k !== 'global').sort((a, b) => b - a);
  for (const paraIdx of paraIndices) {
    const actions = fixesByPara.get(paraIdx)!;
    for (const action of actions) {
      xml = applyFix(xml, action, paraIdx as number);
    }
  }

  // 4. 替换回 ZIP 并输出
  zip.file('word/document.xml', xml);

  const output = await zip.generateAsync({ type: 'uint8array' });
  return output;
}

/**
 * 仅修复指定的问题ID列表
 */
export async function selectiveFix(
  originalBuffer: BufferSource | ArrayBuffer,
  report: ValidationReport,
  issueIds: string[],
): Promise<Uint8Array> {
  const selectedFixes = report.issues.filter((i) => issueIds.includes(i.id));

  const filteredReport: ValidationReport = {
    ...report,
    issues: selectedFixes,
    totalIssues: selectedFixes.length,
    errorCount: selectedFixes.filter((i) => i.severity === 'error').length,
    warningCount: selectedFixes.filter((i) => i.severity === 'warning').length,
    infoCount: selectedFixes.filter((i) => i.severity === 'info').length,
  };

  return autoFixDocument(originalBuffer, filteredReport);
}
