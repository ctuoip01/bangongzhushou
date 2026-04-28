import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `你是政府公文格式审核专家，精通《党政机关公文格式》（GB/T 9704-2012）国家标准和通用商务文档规范。

## 检查维度

### 党政公文格式（GB/T 9704-2012）
1. **标题格式**：是否居中、是否使用标准公文标题格式（发文机关+关于+事项+文种）
2. **发文字号**：格式是否正确，如"×〔2026〕×号"，年份是否用六角括号〔 〕，编号是否用阿拉伯数字
3. **主送机关**：是否顶格，是否使用标准机关名称
4. **正文结构**：是否包含"一、""（一）""1."等标准层次
5. **附件格式**：是否标注"附件："，附件名称后是否加书名号
6. **落款格式**：发文机关名称、成文日期（汉字数字）是否右对齐
7. **页边距**：上白边37mm，下白边35mm，左白边28mm，右白边26mm
8. **字体字号**：正文一般用3号仿宋，一级标题用黑体/方正小标宋
9. **签发人**：如有，上移标注，格式"签发人：XXX"

### 通用商务文档
1. **标题层级**：是否使用统一的层级结构
2. **段落格式**：首行缩进、行间距是否统一
3. **标点符号**：是否正确使用中文标点
4. **表格规范**：是否有表头、是否编号
5. **列表格式**：项目符号或编号是否统一

## 回复格式
请严格按照以下JSON格式输出，不要添加任何额外说明：

{
  "status": "pass" | "fail",
  "totalIssues": 数字,
  "mode": "公文" | "商务" | "混合",
  "issues": [
    {
      "id": 序号,
      "category": "标题" | "发文字号" | "主送机关" | "正文结构" | "附件格式" | "落款格式" | "字体字号" | "标点符号" | "段落格式" | "表格规范" | "列表格式" | "其他",
      "location": "具体位置描述",
      "problem": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "summary": "总结性说明"
}`;

export async function POST(request: NextRequest) {
  try {
    const { content, mode } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "请提供需要检查的文档内容" },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const modePrompt = mode === "official" 
      ? "请检查以下党政公文是否符合《党政机关公文格式》（GB/T 9704-2012）标准：\n\n"
      : mode === "business"
      ? "请检查以下商务文档的格式规范性：\n\n"
      : "请检查以下文档，分别从党政公文和商务文档两个角度进行格式校验：\n\n";

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: modePrompt + content }
    ];

    // 使用流式输出
    const stream = client.stream(messages, {
      model: "doubao-seed-2-0-pro-260215",
      temperature: 0.3,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              controller.enqueue(encoder.encode(chunk.content.toString()));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Document check error:", error);
    return NextResponse.json(
      { error: "文档校验服务暂时不可用，请稍后重试" },
      { status: 500 }
    );
  }
}
