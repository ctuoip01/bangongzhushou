/**
 * 输入处理工具
 * 支持：文本输入、URL 抓取、文档上传
 */

// ==================== 输入源类型 ====================

export type InputSource = 
  | { type: 'text'; content: string }
  | { type: 'url'; url: string }
  | { type: 'document'; file: File };

export interface ProcessedInput {
  content: string;
  source: 'text' | 'url' | 'document';
  metadata?: {
    filename?: string;
    url?: string;
    title?: string;
    extractedAt: string;
  };
}

// ==================== URL 抓取 ====================

/**
 * 抓取网页内容
 */
export async function fetchUrlContent(url: string): Promise<ProcessedInput> {
  try {
    // 使用 fetch API 获取网页内容
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    // 获取 HTML 内容
    const html = await response.text();
    
    // 提取正文内容（简单的 HTML 解析）
    const content = extractTextFromHtml(html);
    
    if (!content) {
      throw new Error('无法从网页提取内容');
    }
    
    return {
      content,
      source: 'url',
      metadata: {
        url,
        title: extractTitleFromHtml(html) || extractDomain(url),
        extractedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('URL 抓取失败:', error);
    throw new Error(`URL 抓取失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 从 HTML 中提取标题
 */
function extractTitleFromHtml(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * 从域名提取网站名称
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * 从 HTML 中提取纯文本
 */
function extractTextFromHtml(html: string): string {
  // 移除 script 和 style 标签及其内容
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  
  // 替换块级标签为空格
  text = text
    .replace(/<\/?(div|p|br|h[1-6]|li|tr|blockquote)[^>]*>/gi, '\n')
    .replace(/<\/?(span|font|a|strong|b|em|i|u)[^>]*>/gi, '');
  
  // 解码 HTML 实体
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, '');
  
  // 移除剩余 HTML 标签
  text = text.replace(/<[^>]+>/g, '');
  
  // 清理空白字符
  text = text
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  
  return text;
}

// ==================== 文档解析 ====================

/**
 * 支持的文档格式
 */
export type DocumentFormat = 'txt' | 'md' | 'doc' | 'docx' | 'pdf';

const DOCUMENT_FORMATS: DocumentFormat[] = ['txt', 'md', 'doc', 'docx', 'pdf'];

/**
 * 检查文件格式是否支持
 */
export function isDocumentSupported(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() as DocumentFormat;
  return DOCUMENT_FORMATS.includes(ext);
}

/**
 * 解析文档内容
 */
export async function parseDocument(file: File): Promise<ProcessedInput> {
  const ext = file.name.split('.').pop()?.toLowerCase() as DocumentFormat;
  
  if (!isDocumentSupported(file)) {
    throw new Error(`不支持的文件格式: ${ext}，支持的格式: ${DOCUMENT_FORMATS.join(', ')}`);
  }

  let content: string;

  try {
    switch (ext) {
      case 'txt':
      case 'md':
        // 纯文本直接读取
        content = await file.text();
        break;
        
      case 'docx':
        content = await parseDocx(file);
        break;
        
      case 'doc':
        content = await parseDoc(file);
        break;
        
      case 'pdf':
        content = await parsePdf(file);
        break;
        
      default:
        throw new Error(`不支持的格式: ${ext}`);
    }
  } catch (error) {
    console.error('文档解析失败:', error);
    throw new Error(`文档解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }

  if (!content.trim()) {
    throw new Error('文档内容为空');
  }

  return {
    content,
    source: 'document',
    metadata: {
      filename: file.name,
      extractedAt: new Date().toISOString(),
    },
  };
}

/**
 * 解析 Docx 文件（使用 mammoth）
 */
async function parseDocx(file: File): Promise<string> {
  try {
    // 动态导入 mammoth
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.warn('Docx 解析失败，尝试纯文本读取:', error);
    // Fallback：尝试纯文本读取
    return file.text();
  }
}

/**
 * 解析 Doc 文件（旧格式）
 */
async function parseDoc(file: File): Promise<string> {
  try {
    // 尝试使用 mammoth（有些旧格式 .doc 也能解析）
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch {
    // Fallback：尝试纯文本读取（会包含一些乱码）
    const text = await file.text();
    // 移除一些二进制字符
    return text.replace(/[^\x20-\x7E\n\r\t\u4e00-\u9fa5]/g, ' ').trim();
  }
}

/**
 * 解析 PDF 文件
 * 注意：完整 PDF 解析需要安装专业库，这里提供基础提取
 */
async function parsePdf(file: File): Promise<string> {
  try {
    const pdfParse = await import('pdf-parse');
    const { PDFParse } = pdfParse;
    
    // 创建解析器实例
    const parser = new PDFParse({ data: await file.arrayBuffer() });
    
    // 获取文本内容
    const textResult = await parser.getText();
    const infoResult = await parser.getInfo();
    
    let text = '';
    
    // 从 TextResult 中提取文本
    if (textResult) {
      // 检查是否有 pageContent 属性
      if ('pageContent' in textResult) {
        text = String(textResult.pageContent || '');
      } else if ('text' in textResult) {
        text = String(textResult.text || '');
      } else if (typeof textResult === 'string') {
        text = textResult;
      }
    }
    
    await parser.destroy();
    
    if (!text.trim()) {
      // 如果没有提取到文本，返回元信息
      const pages = infoResult?.info?.Pages;
      return `PDF 文档信息\n\n文件名: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n页数: ${pages || '未知'}\n\n注意：此 PDF 可能包含图片或扫描内容，无法直接提取文本。`;
    }
    
    return text.trim();
  } catch (error) {
    console.warn('PDF 解析失败:', error);
    // 返回友好提示而不是错误
    return `[PDF 文件]\n文件名: ${file.name}\n文件大小: ${formatFileSize(file.size)}\n\n此文件无法直接解析，请复制文本内容后粘贴到输入框中。`;
  }
}

// ==================== 统一输入处理 ====================

/**
 * 处理任意类型的输入
 */
export async function processInput(source: InputSource): Promise<ProcessedInput> {
  switch (source.type) {
    case 'text':
      return {
        content: source.content,
        source: 'text',
        metadata: {
          extractedAt: new Date().toISOString(),
        },
      };
      
    case 'url':
      return fetchUrlContent(source.url);
      
    case 'document':
      return parseDocument(source.file);
  }
}

/**
 * 检测文本中的 URL
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  return text.match(urlRegex) || [];
}

/**
 * 检测是否是有效的 URL
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检测文件是否是可以作为 URL 的文本（以 http 开头）
 */
export function detectUrlInput(input: string): boolean {
  const trimmed = input.trim();
  return isValidUrl(trimmed);
}

/**
 * 智能处理输入
 * 自动判断是文本、URL 还是文件名
 */
export async function smartProcessInput(input: string, file?: File): Promise<ProcessedInput> {
  // 优先处理文件上传
  if (file) {
    return parseDocument(file);
  }
  
  const trimmed = input.trim();
  
  // 检测是否是 URL
  if (isValidUrl(trimmed)) {
    return fetchUrlContent(trimmed);
  }
  
  // 检测文本中是否包含 URL
  const urls = extractUrls(trimmed);
  if (urls.length > 0 && trimmed.startsWith(urls[0])) {
    // 整个输入就是一个 URL
    return fetchUrlContent(urls[0]);
  }
  
  // 默认作为纯文本处理
  return processInput({ type: 'text', content: trimmed });
}

// ==================== 文件大小格式化 ====================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
