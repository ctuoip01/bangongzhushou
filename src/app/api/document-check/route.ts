import { NextRequest, NextResponse } from 'next/server';
import {
  parseDocx,
  validateDocument,
  autoFixDocument,
  selectiveFix,
  type ValidationReport,
} from '@/lib/docx-engine';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ==================== POST: 校验文档 ====================

/**
 * 接收上传的 .docx 文件 → 解析格式属性 → 输出结构化校验报告
 *
 * 请求方式：multipart/form-data
 *   - file: .docx 文件（必填）
 *   - mode: "official" | "business"（默认 official）
 *
 * 响应：JSON 格式的 ValidationReport
 */
export async function POST(request: NextRequest) {
  try {
    // 支持 FormData 文件上传
    let buffer: ArrayBuffer;
    let mode: 'official' | 'business' = 'official';
    let fileName = 'document.docx';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: '请上传 .docx 文件' },
          { status: 400 },
        );
      }

      // 校验文件类型
      if (!file.name.endsWith('.docx')) {
        return NextResponse.json(
          { error: '仅支持 .docx 格式文件' },
          { status: 400 },
        );
      }

      // 文件大小限制 10MB
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: '文件大小不能超过 10MB' },
          { status: 400 },
        );
      }

      fileName = file.name;
      buffer = await file.arrayBuffer();

      const rawMode = formData.get('mode');
      if (rawMode === 'business') mode = 'business';
    } else {
      // 兼容旧版 JSON 接口（纯文本内容）
      const body = await request.json();
      const { fileContent, fileContentBase64, ...restBody } = body;

      if (fileContentBase64) {
        const binaryStr = atob(fileContentBase64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        buffer = bytes.buffer as ArrayBuffer;
      } else if (!fileContent) {
        return NextResponse.json(
          { error: '请提供文件内容或上传 .docx 文件' },
          { status: 400 },
        );
      } else {
        return NextResponse.json(
          { error: '当前版本仅支持 .docx 文件上传，请使用 multipart/form-data 方式提交' },
          { status: 400 },
        );
      }

      if ((body as Record<string, unknown>).mode === 'business') mode = 'business';
    }

    // 1. 解析 DOCX
    const parsed = await parseDocx(buffer);

    // 2. 执行校验
    const report = validateDocument(parsed, mode);
    report.documentName = fileName;

    // 3. 返回结构化报告
    return NextResponse.json({
      success: true,
      report,
      meta: {
        paragraphsCount: parsed.paragraphs.length,
        pageSettings: parsed.pageSettings,
        parsedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Document check error:', error);
    const message =
      error instanceof Error ? error.message : '校验服务暂时不可用';

    // 友好的错误信息
    if (
      message.includes('无效的 DOCX') ||
      message.includes('缺少 word/document.xml')
    ) {
      return NextResponse.json(
        { error: '无法解析该文件，请确认是有效的 .docx 格式文档' },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ==================== PATCH: 自动修复 ====================

/**
 * 根据之前的校验报告自动修复文档
 *
 * 请求方式：multipart/form-data 或 JSON
 *   - file: 原始 .docx 文件
 *   - report: 上次校验返回的 report 对象
 *   - issueIds?: 只修复指定的问题ID列表（可选，不传则全部修复）
 *
 * 响应：修复后的 .docx 文件下载流
 */
export async function PATCH(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let buffer: ArrayBuffer;
    let report: ValidationReport;
    let issueIds: string[] | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const reportJson = formData.get('report') as string | null;
      const idsStr = formData.get('issueIds') as string | undefined;

      if (!file || !reportJson) {
        return NextResponse.json(
          { error: '请提供原始文件和校验报告' },
          { status: 400 },
        );
      }
      buffer = await file.arrayBuffer();
      report = JSON.parse(reportJson) as ValidationReport;
      issueIds = idsStr ? JSON.parse(idsStr) : undefined;
    } else {
      const body = await request.json();
      const { fileBase64, report: reportData, issueIds: ids } = body as {
        fileBase64: string;
        report: ValidationReport;
        issueIds?: string[];
      };

      if (!fileBase64 || !reportData) {
        return NextResponse.json(
          { error: '请提供原始文件(base64)和校验报告' },
          { status: 400 },
        );
      }

      const binaryStr = atob(fileBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      buffer = bytes.buffer as ArrayBuffer;
      report = reportData;
      issueIds = ids;
    }

    // 执行修复
    const fixedBuffer = issueIds
      ? await selectiveFix(buffer, report, issueIds)
      : await autoFixDocument(buffer, report);

    // 返回修复后的文件
    return new Response(Buffer.from(fixedBuffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="fixed-${report.documentName}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Auto-fix error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : '自动修复服务暂时不可用',
      },
      { status: 500 },
    );
  }
}
