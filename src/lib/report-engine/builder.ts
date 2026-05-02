/**
 * 报告 DOCX 构建引擎
 *
 * 将生成的报告内容（Markdown文本）构建为格式规范的 .docx 文件。
 * 使用 JSZip 直接构造 OOXML 结构（与 python-docx 思路一致），
 * 无需额外依赖（复用 docx-engine 已有的 JSZip 能力）。
 */

import * as JSZip from 'jszip';

export interface ReportChapter {
  id: string;
  title: string;
  level: number;
  content: string; // Markdown 格式的正文
}

export interface ReportBuildInput {
  title: string;
  subtitle?: string;
  organization: string;
  author?: string;
  date: string;
  chapters: ReportChapter[];
}

/**
 * 将纯文本转义为安全的 XML 内容
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 简化的 Markdown 转 OOXML 段落转换
 * 支持：# ## ### 标题、**加粗**、*斜体*、- 列表、普通段落
 */
function markdownToWParagraphs(markdown: string): string[] {
  const lines = markdown.split('\n');
  const paragraphs: string[] = [];
  let currentListItems: { bullet: string; text: string }[] | null = null;

  const flushList = () => {
    if (!currentListItems || currentListItems.length === 0) return;
    const listXml = currentListItems.map(item => {
      return `<w:p>
        <w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>
        <w:r><w:t xml:space="preserve">${escapeXml(item.text)}</w:t></w:r>
      </w:p>`;
    }).join('');
    paragraphs.push(listXml);
    currentListItems = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行
    if (trimmed === '') {
      flushList();
      continue;
    }

    // 一级标题 #
    if (/^#{1}\s/.test(trimmed)) {
      flushList();
      const text = trimmed.replace(/^#+\s*/, '');
      paragraphs.push(makeHeading(text, 28, '444444'));
      continue;
    }

    // 二级标题 ##
    if (/^#{2}\s/.test(trimmed)) {
      flushList();
      const text = trimmed.replace(/^#+\s*/, '');
      paragraphs.push(makeHeading(text, 24, '333333'));
      continue;
    }

    // 三级标题 ###
    if (/^#{3}\s/.test(trimmed)) {
      flushList();
      const text = trimmed.replace(/^#+\s*/, '');
      paragraphs.push(makeHeading(text, 21, '444444'));
      continue;
    }

    // 无序列表 -
    if (/^[-*]\s/.test(trimmed)) {
      if (!currentListItems) currentListItems = [];
      currentListItems.push({ bullet: '-', text: trimmed.replace(/^[-*]\s+/, '') });
      continue;
    }

    // 有序列表 1.
    if (/^\d+\.\s/.test(trimmed)) {
      if (!currentListItems) currentListItems = [];
      currentListItems.push({ bullet: 'num', text: trimmed.replace(/^\d+\.\s+/, '') });
      continue;
    }

    // 普通段落（支持内联加粗/斜体）
    flushList();
    paragraphs.push(makeBodyParagraph(trimmed));
  }

  flushList();
  return paragraphs.filter(p => p && p.trim());
}

function makeHeading(text: string, sizePt: number, colorHex: string): string {
  const halfPt = Math.round(sizePt * 2); // OOXML 用半磅单位
  return `<w:p>
    <w:pPr>
      <w:jc w:val="start"/>
      <w:spacing w:before="240" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:b/><w:sz w:val="${halfPt}"/>
      <w:szCs w:val="${halfPt}"/>
      <w:rFonts w:ascii="SimHei" w:eastAsia="SimHei" w:hAnsi="SimHei"/>
      <w:color w:val="${colorHex}"/>
    </w:rPr>
    <w:r>
      <w:rPr><w:b/><w:sz w:val="${halfPt}"/><w:szCs w:val="${halfPt}"/><w:rFonts w:ascii="SimHei" w:eastAsia="SimHei" w:hAnsi="SimHei"/><w:color w:val="${colorHex}"/></w:rPr>
      <w:t xml:space="preserve">${escapeXml(text)}</w:t>
    </w:r>
  </w:p>`;
}

function makeBodyParagraph(rawText: string): string {
  // 处理内联格式
  const parts: string[] = [];
  // 简单的正则分割 **text** 和 *text*
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      parts.push(makeRun(rawText.slice(lastIndex, match.index), {}));
    }
    if (match[2]) {
      // **bold**
      parts.push(makeRun(match[2], { bold: true }));
    } else if (match[3]) {
      // *italic*
      parts.push(makeRun(match[3], { italic: true }));
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < rawText.length) {
    parts.push(makeRun(rawText.slice(lastIndex), {}));
  }

  if (parts.length === 0) {
    parts.push(makeRun(rawText, {}));
  }

  const runs = parts.join('');

  return `<w:p>
    <w:pPr>
      <w:jc w:val="both"/>
      <w:spacing w:before="60" w:after="60" w:line="360" w:lineRule="auto"/>
      <w:ind w:firstLineChars="200" w:firstLine="480"/>
    </w:pPr>
    ${runs}
  </w:p>`;
}

function makeRun(text: string, opts: { bold?: boolean; italic?: boolean }): string {
  const bTag = opts.bold ? '<w:b/>' : '';
  const iTag = opts.italic ? '<w:i/>' : '';
  return `<w:r>
    <w:rPr>${bTag}${iTag}<w:sz w:val="24"/><w:szCs w:val="24"/>
    <w:rFonts w:ascii="Microsoft YaHei" w:eastAsia="仿宋_GB2312" w:hAnsi="Microsoft YaHei"/></w:rPr>
    <w:t xml:space="preserve">${escapeXml(text)}</w:t>
  </w:r>`;
}

/**
 * 主构建函数：生成完整的 .docx 文件 Buffer
 */
export async function buildReportDocx(input: ReportBuildInput): Promise<Buffer> {
  const zip = new (JSZip as any)();

  // ===== [Content_Types].xml =====
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);

  // ===== _rels/.rels =====
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  // ===== word/_rels/document.xml.rels =====
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  // ===== word/styles.xml =====
  zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="numbering" w:styleId="ListBullet">
    <w:name w:val="List Bullet"/>
    <w:numPr><w:numId w:val="1"/></w:numPr>
  </w:style>
</w:styles>`);

  // ===== word/document.xml =====
  // 构建文档主体
  let bodyXml = '';

  // 封面
  bodyXml += `
    <!-- 封面 -->
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="2400"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="400"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="44"/><w:szCs w:val="44"/><w:rFonts w:ascii="SimHei" w:eastAsia="SimHei" w:hAnsi="SimHei"/></w:rPr>
      <w:t xml:space="preserve">${escapeXml(input.title)}</w:t></w:r>
    </w:p>`;
  if (input.subtitle) {
    bodyXml += `
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="120"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/><w:rFonts w:ascii="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:hAnsi="Microsoft YaHei"/><w:color w:val="666666"/></w:rPr>
      <w:t xml:space="preserve">${escapeXml(input.subtitle)}</w:t></w:r>
    </w:p>`;
  }
  bodyXml += `
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="800"/></w:pPr></w:p>
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:rFonts w:ascii="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:hAnsi="Microsoft YaHei"/></w:rPr>
      <w:t xml:space="preserve">编制单位：${escapeXml(input.organization)}</w:t></w:r>
    </w.p>`;
  if (input.author) {
    bodyXml += `
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="40"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/><w:rFonts w:ascii="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:hAnsi="Microsoft YaHei"/></w:rPr>
      <w:t xml:space="preserve">报告作者：${escapeXml(input.author)}</w:t></w:r>
    </w:p>`;
  }
  bodyXml += `
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="40"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/><w:rFonts w:ascii="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:hAnsi="Microsoft YaHei"/></w:rPr>
      <w:t xml:space="preserve">报告日期：${escapeXml(input.date)}</w:t></w:r>
    </w:p>

    <!-- 分页 -->
    <w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>

    <!-- 目录页 -->
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="200" w:after="300"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/><w:rFonts w:ascii="SimHei" w:eastAsia="SimHei" w:hAnsi="SimHei"/></w:rPr>
      <w:t xml:space="preserve">目  录</w:t></w:r>
    </w:p>`;
  for (const ch of input.chapters) {
    bodyXml += `
    <w:p><w:pPr><w:indent w:left="420"/><w:spacing w:before="80" w:after="40"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/><w:rFonts w:ascii="Microsoft YaHei" w:eastAsia="Microsoft YaHei" w:hAnsi="Microsoft YaHei"/></w:rPr>
      <w:t xml:space="preserve">${escapeXml(ch.title)}</w:t></w:r>
    </w.p>`;
  }

  // 分页到正文
  bodyXml += '\n<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>\n';

  // 各章节正文
  for (const ch of input.chapters) {
    // 章节标题
    const headingSize = ch.level <= 1 ? 30 : ch.level === 2 ? 26 : 22;
    bodyXml += makeHeading(ch.title, headingSize, '222222');

    // 章节正文（Markdown → 段落）
    const paras = markdownToWParagraphs(ch.content);
    bodyXml += paras.join('\n');

    // 章间间距
    bodyXml += '<w:p><w:pPr><w:spacing w:before="300"/></w:pPr></w:p>';
  }

  const fullDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            mc:Ignorable="w14 wp14">
  <w:body>
${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="851" w:footer="992" w:gutter="0"/>
      <w:cols w:space="720" w:num="1"/>
      <w:docGrid w:type="lines" w:linePitch="312"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('word/document.xml', fullDocumentXml);

  return await zip.generateAsync({ type: 'nodebuffer' });
}
