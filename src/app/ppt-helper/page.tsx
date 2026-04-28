'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Presentation, RefreshCw, Copy, Check, Download, Sparkles, FileText, Layout, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Slide = {
  page: number;
  title: string;
  content: string[];
  notes?: string;
  layout: string;
};

type PptOutline = {
  title: string;
  theme: string;
  totalSlides: number;
  slides: Slide[];
};

export default function PptHelperPage() {
  const [content, setContent] = useState('');
  const [pptTitle, setPptTitle] = useState('');
  const [style, setStyle] = useState('academic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pptOutline, setPptOutline] = useState<PptOutline | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewSlide, setPreviewSlide] = useState<Slide | null>(null);

  const handleGenerate = async () => {
    if (!content.trim()) {
      alert('请输入需要转换的报告内容');
      return;
    }

    setIsGenerating(true);
    setStreamingContent('');
    setPptOutline(null);

    try {
      const response = await fetch('/api/ppt-helper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, pptTitle, style }),
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setStreamingContent(fullContent);
        }
      }

      // 尝试解析 JSON
      try {
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setPptOutline(parsed);
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    } catch (error) {
      console.error('Generate error:', error);
      alert('PPT生成服务暂时不可用，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyOutline = async () => {
    if (!pptOutline) return;
    
    const markdown = generateMarkdown();
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleDownload = () => {
    if (!pptOutline) return;
    
    const markdown = generateMarkdown();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pptOutline.title || 'PPT大纲'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateMarkdown = () => {
    if (!pptOutline) return '';
    
    let md = `# ${pptOutline.title || 'PPT大纲'}\n\n`;
    md += `**主题风格**：${pptOutline.theme || '默认'}\n`;
    md += `**总页数**：${pptOutline.totalSlides || pptOutline.slides?.length || 0} 页\n\n`;
    md += `---\n\n`;
    
    pptOutline.slides?.forEach((slide) => {
      md += `## 第${slide.page}页：${slide.title}\n\n`;
      md += `**布局**：${getLayoutName(slide.layout)}\n\n`;
      if (slide.content && slide.content.length > 0) {
        slide.content.forEach((point, i) => {
          md += `${i + 1}. ${point}\n`;
        });
      }
      if (slide.notes) {
        md += `\n> 备注：${slide.notes}\n`;
      }
      md += `\n---\n\n`;
    });
    
    return md;
  };

  const getLayoutName = (layout: string) => {
    const names: Record<string, string> = {
      'title': '封面页',
      'content': '内容页',
      'two-column': '双栏布局',
      'chart': '图表页',
      'closing': '结束页',
    };
    return names[layout] || layout;
  };

  const getLayoutIcon = (layout: string) => {
    const icons: Record<string, string> = {
      'title': '📄',
      'content': '📝',
      'two-column': '📊',
      'chart': '📈',
      'closing': '✅',
    };
    return icons[layout] || '📄';
  };

  const handleReset = () => {
    setContent('');
    setPptTitle('');
    setPptOutline(null);
    setStreamingContent('');
  };

  const handleSampleContent = () => {
    setPptTitle('中国新能源汽车行业发展分析');
    setContent(`一、市场规模
2025年中国新能源汽车销量突破1200万辆，同比增长35%，市场渗透率达40%。

二、竞争格局
比亚迪、特斯拉、理想等头部企业占据市场主导地位，新势力品牌快速崛起。

三、技术趋势
电动化、智能化、网联化成为主要发展方向，电池技术持续突破。

四、政策环境
国家持续出台支持政策，购置税减免、充电桩建设补贴等政策延续。

五、发展建议
1. 加强核心技术研发
2. 完善充电基础设施
3. 推动产业链协同发展`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* 导航栏 */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                返回首页
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/20">
                <Presentation className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold">PPT助手</h1>
                <p className="text-xs text-muted-foreground">报告内容一键转换为PPT大纲</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* 左侧：输入区域 */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                输入报告内容
              </h2>

              {/* PPT标题 */}
              <div className="mb-4">
                <Label htmlFor="ppt-title" className="text-sm font-medium mb-2 block">
                  PPT标题（可选）
                </Label>
                <Input
                  id="ppt-title"
                  placeholder="例如：2026年新能源行业分析报告"
                  value={pptTitle}
                  onChange={(e) => setPptTitle(e.target.value)}
                />
              </div>

              {/* 风格选择 */}
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">演示风格</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择风格" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="academic">学术专业风格</SelectItem>
                    <SelectItem value="formal">正式商务风格</SelectItem>
                    <SelectItem value="creative">创意活力风格</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 报告内容 */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="content" className="text-sm font-medium">
                    报告内容
                  </Label>
                  <Button variant="ghost" size="sm" onClick={handleSampleContent} className="text-xs h-7">
                    📋 使用示例
                  </Button>
                </div>
                <Textarea
                  id="content"
                  placeholder="请粘贴需要转换为PPT的报告内容..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[300px] text-sm"
                />
              </div>

              <div className="mt-4 flex gap-3">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !content.trim()}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Presentation className="mr-2 h-4 w-4" />
                      生成PPT大纲
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isGenerating}
                >
                  重置
                </Button>
              </div>
            </div>

            {/* 风格说明 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">风格说明</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-orange-600">📊</span>
                  <div>
                    <span className="font-medium">学术专业</span>
                    <p className="text-muted-foreground">适合研究报告、方案分析</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600">💼</span>
                  <div>
                    <span className="font-medium">正式商务</span>
                    <p className="text-muted-foreground">适合政府汇报、企业汇报</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-600">✨</span>
                  <div>
                    <span className="font-medium">创意活力</span>
                    <p className="text-muted-foreground">适合产品发布、团队展示</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：输出区域 */}
          <div className="space-y-6">
            {/* 流式输出 */}
            {(isGenerating || streamingContent) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-orange-600" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 text-orange-600" />
                        生成结果
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-muted/50 p-4 text-sm font-mono whitespace-pre-wrap max-h-[300px] overflow-auto">
                    {streamingContent || '等待生成...'}
                    {isGenerating && <span className="animate-pulse">▋</span>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PPT大纲结构化展示 */}
            {pptOutline && !isGenerating && (
              <div className="space-y-4">
                {/* 概览 */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{pptOutline.title || 'PPT大纲'}</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopyOutline}>
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownload}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      主题风格：{pptOutline.theme} · 总计 {pptOutline.totalSlides || pptOutline.slides?.length || 0} 页
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* 幻灯片列表 */}
                <div className="space-y-3">
                  {pptOutline.slides?.map((slide) => (
                    <Card
                      key={slide.page}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setPreviewSlide(slide)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{getLayoutIcon(slide.layout)}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                P{slide.page}
                              </Badge>
                              <span className="font-medium">{slide.title}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Layout className="h-3 w-3" />
                              {getLayoutName(slide.layout)}
                              {slide.content && slide.content.length > 0 && (
                                <span>· {slide.content.length} 个要点</span>
                              )}
                            </div>
                            {slide.content && slide.content.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {slide.content.slice(0, 3).map((point, i) => (
                                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                                    <span className="text-primary">•</span>
                                    {point}
                                  </li>
                                ))}
                                {slide.content.length > 3 && (
                                  <li className="text-xs text-muted-foreground">
                                    ...还有 {slide.content.length - 3} 条
                                  </li>
                                )}
                              </ul>
                            )}
                          </div>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 幻灯片预览 */}
            {previewSlide && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">幻灯片预览 - 第{previewSlide.page}页</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setPreviewSlide(null)}>
                      关闭
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border-2 border-dashed border-muted-foreground/20 p-6 bg-white dark:bg-slate-900 aspect-video flex flex-col">
                    <div className="text-center mb-4">
                      <Badge className="mb-2">{getLayoutName(previewSlide.layout)}</Badge>
                      <h3 className="text-xl font-bold">{previewSlide.title}</h3>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      {previewSlide.content && previewSlide.content.length > 0 ? (
                        <ul className="space-y-2 text-center">
                          {previewSlide.content.map((point, i) => (
                            <li key={i} className="text-sm">{point}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground text-sm">内容区域</p>
                      )}
                    </div>
                    {previewSlide.notes && (
                      <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                        备注：{previewSlide.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 空状态 */}
            {!pptOutline && !isGenerating && !streamingContent && (
              <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/50">
                <Presentation className="mb-4 h-16 w-16 text-muted-foreground/50" />
                <p className="text-lg font-medium text-muted-foreground">等待内容输入</p>
                <p className="mt-1 text-sm text-muted-foreground/70">
                  在左侧输入报告内容，点击「生成PPT大纲」
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
