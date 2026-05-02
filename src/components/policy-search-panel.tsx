'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Search, Filter, Clock, ExternalLink, Globe, FileText, TrendingUp, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SearchResult, SearchType, TimeRange } from '@/types';
import { parseSearchResults, getAuthBadgeVariant } from '@/lib/utils';
import { readSseEvents } from '@/lib/sse-parser';
import { cn } from '@/lib/utils';

interface PolicySearchPanelProps {
  moduleId: string;
}

function getAuthLabel(level: number): string {
  if (level >= 4) return '官方权威';
  if (level >= 3) return '权威来源';
  if (level >= 2) return '一般来源';
  return '待验证';
}

function getAuthColor(level: number): string {
  if (level >= 4) return 'bg-red-100 text-red-700 border-red-200';
  if (level >= 3) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (level >= 2) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '未知时间';
  try {
    const d = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
  } catch {
    return timeStr;
  }
}

function getDomainIcon(siteName?: string): React.ReactNode {
  const name = (siteName || '').toLowerCase();
  if (name.includes('gov')) return <FileText className="h-3.5 w-3.5" />;
  if (name.includes('edu')) return <Globe className="h-3.5 w-3.5" />;
  return <TrendingUp className="h-3.5 w-3.5" />;
}

export function PolicySearchPanel({ moduleId }: PolicySearchPanelProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [rawResults, setRawResults] = useState<{ items: SearchResult[]; summary?: string } | null>(null);
  const [aiSummary, setAiSummary] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    // 取消上一次请求
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setSearching(true);
    setRawResults(null);
    setAiSummary('');
    setStreamingText('');
    setExpandedCard(null);

    try {
      const response = await fetch('/api/policy-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          searchType,
          timeRange,
          count: 12,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error('搜索请求失败');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      let summaryText = '';

      for await (const { event, data } of readSseEvents(reader, abortRef.current.signal)) {
        if (event === 'search') {
          // 搜索结果（SSE 结构化事件）
          const payload = data as { items: unknown[]; summary?: string };
          if (payload.items?.length > 0) {
            setRawResults(payload as unknown as { items: SearchResult[]; summary?: string });
            setSearching(false);
          }
        } else if (event === 'summary_chunk') {
          // AI 聚合摘要（JSON 包装的文本片段）
          if (typeof data === 'object' && data !== null && 'text' in data) {
            summaryText += (data as { text: string }).text;
          }
          setStreamingText(summaryText);
        } else if (event === 'summary' || event === 'raw' || !event) {
          // 兼容旧格式：裸文本或原始文本
          if (typeof data === 'string') {
            summaryText += data;
          } else if (typeof data === 'object' && data !== null && 'status' in data) {
            // status 标记，忽略
            continue;
          }
          setStreamingText(summaryText);
        } else if (event === 'done') {
          // 流结束
          break;
        } else if (event === 'error') {
          const errorMsg = (typeof data === 'object' && data !== null && 'message' in data)
            ? (data as { message: string }).message
            : String(data);
          console.error('[policy-search] SSE error:', errorMsg);
          // AI 摘要失败时仍保留已收到的搜索结果，仅提示用户
          if (!rawResults) {
            setAiSummary(`搜索过程出现错误：${errorMsg || '未知错误'}`);
          } else {
            setAiSummary(prev => prev || `（AI 聚合分析暂时不可用：${errorMsg?.slice(0, 80) || '未知'}。以上搜索结果仍可正常查看。）`);
          }
          break;
        }
      }

      setAiSummary(summaryText || streamingText);
      setStreamingText('');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('搜索失败:', err);
      }
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [query, searchType, timeRange, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const displaySummary = streamingText || aiSummary;
  const resultCount = rawResults?.items?.length || 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 p-4 lg:p-6">
      {/* 搜索控制区 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入关键词搜索政策文件或行业动态..."
              className="pl-10 pr-4 h-11 text-base"
              disabled={loading}
            />
          </div>
          <Button onClick={handleSearch} disabled={loading || !query.trim()} size="lg" className="h-11 px-6">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            搜索
          </Button>
        </div>

        {/* 筛选栏 */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>类型:</span>
          </div>
          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-7">全部</TabsTrigger>
              <TabsTrigger value="policy" className="text-xs px-3 h-7">政策文件</TabsTrigger>
              <TabsTrigger value="industry" className="text-xs px-3 h-7">行业动态</TabsTrigger>
              <TabsTrigger value="shanghai" className="text-xs px-3 h-7">🏙 上海地区</TabsTrigger>
            </TabsList>
          </Tabs>

          <Separator orientation="vertical" className="h-5" />

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>时间:</span>
          </div>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">近一月</SelectItem>
              <SelectItem value="3m">近三月</SelectItem>
              <SelectItem value="6m">近六月</SelectItem>
              <SelectItem value="1y">近一年</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 主内容区 */}
      {!rawResults && !searching && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 max-w-md">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">政策与行业智能检索</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              输入关键词实时检索互联网上的政策文件与行业动态，
              <br />AI 自动聚合分析并标注来源权威性。
            </p>
            <div className="flex justify-center gap-2 pt-2">
              {['人工智能', '数据安全', '碳中和', '新质生产力'].map((kw) => (
                <Badge key={kw} variant="outline" className="cursor-pointer hover:bg-orange-50 hover:border-orange-200 transition-colors"
                  onClick={() => { setQuery(kw); }}>
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 搜索中 */}
      {(searching || (loading && !rawResults)) && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">正在联网检索{searchType === 'policy' ? '政策文件' : searchType === 'industry' ? '行业动态' : searchType === 'shanghai' ? '上海地区政策' : '相关内容'}...</p>
          </div>
        </div>
      )}

      {/* 搜索结果 */}
      {rawResults && resultCount > 0 && (
        <div className="flex-1 flex flex-col min-h-0 gap-4 overflow-hidden">
          {/* 结果统计 */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
            <span className="font-medium text-foreground">{resultCount}</span>
            <span>条结果</span>
            {searchType !== 'all' && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {searchType === 'policy' ? '政策文件' : searchType === 'industry' ? '行业动态' : '上海地区政策'}
              </Badge>
            )}
            {timeRange !== '3m' && (
              <Badge variant="outline" className="text-xs ml-1">
                {timeRange === '1m' ? '近一月' : timeRange === '6m' ? '近六月' : timeRange === '1y' ? '近一年' : '近三月'}
              </Badge>
            )}
          </div>

          {/* 双列布局：左侧结果列表 + 右侧AI摘要 */}
          <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
            {/* 左侧：搜索结果列表 */}
            <ScrollArea className="flex-1 rounded-xl border bg-card">
              <div className="p-3 space-y-2.5">
                {rawResults.items.map((item, idx) => (
                  <Card key={idx} className={cn(
                    "transition-all cursor-pointer hover:shadow-md hover:border-primary/30",
                    expandedCard === idx && "ring-1 ring-primary/20 border-primary/30"
                  )} onClick={() => setExpandedCard(expandedCard === idx ? null : idx)}>
                    <CardContent className="p-4 space-y-2">
                      {/* 标题行 */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-medium leading-snug line-clamp-2 hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="shrink-0 mt-0.5 text-muted-foreground hover:text-primary transition-colors">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>

                      {/* 摘要 */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {item.snippet || '暂无摘要'}
                      </p>

                      {/* 元信息栏 */}
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {getDomainIcon(item.siteName)}
                          <span className="max-w-[120px] truncate">{item.siteName || '未知来源'}</span>
                        </div>
                        <Badge variant={getAuthBadgeVariant(item.authLevel)} className={cn("text-[10px] px-1.5 py-0 border", getAuthColor(item.authLevel))}>
                          {getAuthLabel(item.authLevel)}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {formatTime(item.publishTime)}
                        </span>
                      </div>

                      {/* 展开详情 */}
                      {expandedCard === idx && (
                        <div className="pt-2 mt-2 border-t">
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {item.snippet || '暂无详细内容'}
                          </p>
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                            <ExternalLink className="h-3 w-3" />查看原文
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {/* 右侧：AI 摘要 */}
            <div className="w-[380px] shrink-0 flex flex-col gap-3">
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="pb-3 shrink-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-amber-400" />
                AI 智能聚合
                  </CardTitle>
                  <CardDescription className="text-xs">
                基于以上{resultCount}条搜索结果的智能分析与归纳
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    {displaySummary ? (
                      <div ref={summaryRef} className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                        {displaySummary}
                        {streamingText && !aiSummary && (
                          <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5" />
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            正在聚合分析...
                          </div>
                        ) : (
                          '等待搜索完成后自动聚合'
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* 无结果 */}
      {rawResults && resultCount === 0 && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Search className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">未找到相关结果，请尝试更换关键词</p>
          </div>
        </div>
      )}
    </div>
  );
}
