'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, RefreshCw, ExternalLink, Globe, Shield, TrendingUp, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type SearchResult = {
  title: string;
  url: string;
  siteName: string;
  snippet: string;
  publishTime: string;
  authLevel: number;
  authDes: string;
};

export default function PolicySearchPage() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [timeRange, setTimeRange] = useState('3m');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [rawSummary, setRawSummary] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) {
      alert('请输入搜索关键词');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setAiSummary('');
    setRawSummary('');

    try {
      const response = await fetch('/api/policy-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, searchType, timeRange }),
      });

      if (!response.ok) {
        throw new Error('搜索失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let aiContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
        }
      }

      // 解析结果
      const resultsMatch = fullContent.match(/\[SEARCH_RESULTS_START\]([\s\S]*?)\[SEARCH_RESULTS_END\]/);
      const summaryMatch = fullContent.match(/\[AI_SUMMARY_START\]([\s\S]*?)\[AI_SUMMARY_END\]/);

      if (resultsMatch) {
        try {
          const parsed = JSON.parse(resultsMatch[1]);
          setSearchResults(parsed.items || []);
          setRawSummary(parsed.summary || '');
        } catch (e) {
          console.error('Parse results error:', e);
        }
      }

      if (summaryMatch) {
        setAiSummary(summaryMatch[1].trim());
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('搜索服务暂时不可用，请稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickSearch = (keyword: string) => {
    setQuery(keyword);
    setSearchType('policy');
    setTimeRange('1m');
    setTimeout(() => {
      const input = document.getElementById('search-input') as HTMLInputElement;
      input?.focus();
    }, 100);
  };

  const getAuthBadge = (level: number) => {
    if (level >= 3) {
      return <Badge variant="default" className="bg-green-600">权威</Badge>;
    } else if (level >= 2) {
      return <Badge variant="secondary">可靠</Badge>;
    }
    return <Badge variant="outline">一般</Badge>;
  };

  const quickSearches = [
    { label: '新能源政策', keyword: '新能源汽车 补贴政策 2025 2026' },
    { label: '人工智能', keyword: '人工智能发展规划 支持政策' },
    { label: '数字经济', keyword: '数字经济促进政策' },
    { label: '医疗健康', keyword: '医疗健康产业政策' },
    { label: '半导体', keyword: '半导体芯片产业政策' },
    { label: '绿色金融', keyword: '绿色金融 ESG 政策' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/20">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold">政策搜索聚合</h1>
                <p className="text-xs text-muted-foreground">实时行业动态与政策文件检索</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* 搜索区域 */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  id="search-input"
                  placeholder="输入关键词搜索，如：新能源汽车政策、人工智能发展规划..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-12 text-base"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching || !query.trim()}
                size="lg"
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    搜索中...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    搜索
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">类型：</Label>
                <Select value={searchType} onValueChange={setSearchType}>
                  <SelectTrigger className="w-[150px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="policy">政策文件</SelectItem>
                    <SelectItem value="industry">行业动态</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">时间：</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">近1个月</SelectItem>
                    <SelectItem value="3m">近3个月</SelectItem>
                    <SelectItem value="6m">近6个月</SelectItem>
                    <SelectItem value="1y">近1年</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 快捷搜索 */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-sm text-muted-foreground mr-2">快捷搜索：</span>
              {quickSearches.map((item) => (
                <Button
                  key={item.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSearch(item.keyword)}
                  className="h-7 text-xs"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* 结果区域 */}
        <Tabs defaultValue="all" className="mb-8">
          <TabsList>
            <TabsTrigger value="all">全部结果</TabsTrigger>
            <TabsTrigger value="summary">AI 摘要</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getAuthBadge(result.authLevel)}
                          {result.siteName && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {result.siteName}
                            </span>
                          )}
                          {result.publishTime && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {result.publishTime}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-medium mb-2 line-clamp-2">
                          {result.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {result.snippet}
                        </p>
                      </div>
                      {result.url && (
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-2 hover:bg-muted rounded-lg transition-colors"
                          title="打开链接"
                        >
                          <ExternalLink className="h-5 w-5 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : !isSearching ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">开始搜索</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  输入关键词或点击快捷搜索获取政策信息
                </p>
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="summary" className="mt-6">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold">AI 智能摘要</h3>
              </div>
              
              {aiSummary ? (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {aiSummary}
                  </div>
                </div>
              ) : rawSummary ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {rawSummary}
                </div>
              ) : !isSearching ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>暂无摘要，请先进行搜索</p>
                </div>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>

        {/* 帮助信息 */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Shield className="h-4 w-4" />
            搜索说明
          </h3>
          <div className="grid gap-4 text-sm">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-4 w-4 text-purple-600 mt-0.5" />
              <div>
                <span className="font-medium">实时政策检索</span>
                <p className="text-muted-foreground">自动聚合最新政策文件，支持多时间范围筛选</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-purple-600 mt-0.5" />
              <div>
                <span className="font-medium">AI 智能摘要</span>
                <p className="text-muted-foreground">自动提炼关键信息，节省阅读时间</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Globe className="h-4 w-4 text-purple-600 mt-0.5" />
              <div>
                <span className="font-medium">权威来源标注</span>
                <p className="text-muted-foreground">自动识别政府官网、权威媒体等可信来源</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
