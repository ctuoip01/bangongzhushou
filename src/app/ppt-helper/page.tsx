'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Presentation, RefreshCw, Copy, Check, Download, Sparkles, Layout, Eye, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CharCount } from '@/components/char-count';
import { useToast } from '@/components/toast';
import { copyToClipboard, downloadTextFile, getLayoutName, getLayoutIcon } from '@/lib/utils';
import { PptOutline, Slide, PptStyle } from '@/types';

export default function PptHelperPage() {
  const [content, setContent] = useState('');
  const [pptTitle, setPptTitle] = useState('');
  const [style, setStyle] = useState<PptStyle>('academic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pptOutline, setPptOutline] = useState<PptOutline | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewSlide, setPreviewSlide] = useState<Slide | null>(null);
  const { showToast } = useToast();

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (content.trim() && !isGenerating) {
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, isGenerating]);

  const handleGenerate = async () => {
    if (!content.trim()) {
      showToast('请输入需要转换的报告内容', 'error');
      return;
    }

    setIsGenerating(true);
    setStreamingContent('');
    setPptOutline(null);

    try {
      const response = await fetch('/api/ppt-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, pptTitle, style }),
      });

      if (!response.ok) throw new Error('生成失败');

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
          showToast(`成功生成 ${parsed.totalSlides || parsed.slides?.length || 0} 页 PPT 大纲`, 'success');
        }
      } catch (e) {
        console.error('Parse error:', e);
        showToast('解析结果失败', 'error');
      }
    } catch (error) {
      console.error('Generate error:', error);
      showToast('PPT生成服务暂时不可用，请稍后重试', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyOutline = useCallback(async () => {
    if (!pptOutline) return;
    const markdown = generateMarkdown();
    const success = await copyToClipboard(markdown);
    if (success) {
      setCopied(true);
      showToast('已复制到剪贴板', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('复制失败，请手动选择复制', 'error');
    }
  }, [pptOutline, showToast]);

  const handleDownload = useCallback(() => {
    if (!pptOutline) return;
    const markdown = generateMarkdown();
    downloadTextFile(markdown, `${pptOutline.title || 'PPT大纲'}.md`);
    showToast('文件已下载', 'success');
  }, [pptOutline, showToast]);

  const generateMarkdown = useCallback(() => {
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
      if (slide.notes) md += `\n> 备注：${slide.notes}\n`;
      md += `\n---\n\n`;
    });
    return md;
  }, [pptOutline]);

  const handleReset = () => {
    setContent('');
    setPptTitle('');
    setPptOutline(null);
    setStreamingContent('');
    showToast('已重置', 'info');
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
    showToast('已加载示例内容', 'success');
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  输入报告内容
                </CardTitle>
                <CardDescription>粘贴需要转换为PPT的报告内容</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* PPT标题 */}
                <div>
                  <Label htmlFor="ppt-title" className="text-sm font-medium mb-2 block">PPT标题（可选）</Label>
                  <Input
                    id="ppt-title"
                    placeholder="例如：2026年新能源行业分析报告"
                    value={pptTitle}
                    onChange={(e) => setPptTitle(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                {/* 风格选择 */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">演示风格</Label>
                  <Select value={style} onValueChange={(v) => setStyle(v as PptStyle)}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择风格" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academic">📊 学术专业风格</SelectItem>
                      <SelectItem value="formal">💼 正式商务风格</SelectItem>
                      <SelectItem value="creative">✨ 创意活力风格</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 报告内容 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="content" className="text-sm font-medium">报告内容</Label>
                    <Button variant="ghost" size="sm" onClick={handleSampleContent} className="text-xs h-7" disabled={isGenerating}>
                      📋 使用示例
                    </Button>
                  </div>
                  <div className="relative">
                    <Textarea
                      id="content"
                      placeholder="请粘贴需要转换为PPT的报告内容..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[250px] text-sm resize-none"
                      disabled={isGenerating}
                    />
                    <div className="absolute bottom-3 right-3">
                      <CharCount current={content.length} />
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3">
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
                  <Button variant="outline" onClick={handleReset} disabled={isGenerating}>
                    重置
                  </Button>
                </div>

                {/* 快捷键提示 */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Keyboard className="h-3 w-3" />
                  <span>按 <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> 快速提交</span>
                </div>
              </CardContent>
            </Card>

            {/* 风格说明 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">风格说明</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: '📊', name: '学术专业', desc: '适合研究报告、方案分析' },
                  { icon: '💼', name: '正式商务', desc: '适合政府汇报、企业汇报' },
                  { icon: '✨', name: '创意活力', desc: '适合产品发布、团队展示' },
                ].map((item) => (
                  <div key={item.name} className="flex items-start gap-2">
                    <span className="text-orange-600">{item.icon}</span>
                    <div>
                      <span className="font-medium text-sm">{item.name}</span>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：输出区域 */}
          <div className="space-y-6">
            {/* 流式输出 */}
            {(isGenerating || streamingContent) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-orange-600" />
                        生成中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-orange-600" />
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
                  <CardHeader>
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
                              <span className="text-xs bg-muted px-2 py-0.5 rounded">P{slide.page}</span>
                              <span className="font-medium">{slide.title}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Layout className="h-3 w-3" />
                              {getLayoutName(slide.layout)}
                              {slide.content && slide.content.length > 0 && (
                                <span>· {slide.content.length} 个要点</span>
                              )}
                            </div>
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
                <CardHeader>
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
                      <span className="inline-block bg-muted px-2 py-0.5 rounded text-xs mb-2">
                        {getLayoutName(previewSlide.layout)}
                      </span>
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
