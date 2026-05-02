'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronRight, BookOpen, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportTemplate } from '@/lib/report-engine';

interface ReportTemplateSelectorProps {
  templates: Record<string, ReportTemplate>;
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}

/**
 * 报告模板选择器 — Step 1 独立组件
 *
 * 从 report-panel.tsx 中抽取，负责展示模板卡片网格和选择交互。
 */
export function ReportTemplateSelector({
  templates,
  selectedId,
  onSelect,
  onConfirm,
}: ReportTemplateSelectorProps) {
  return (
    <div className="flex-1 flex items-center justify-center overflow-auto">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center mb-3">
            <BookOpen className="h-7 w-7 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold">选择报告模板</h2>
          <p className="text-sm text-muted-foreground mt-1">根据你的需求选择一个合适的报告骨架结构</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(templates).map(tpl => (
            <Card
              key={tpl.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selectedId === tpl.id ? 'ring-2 ring-primary border-primary' : '',
              )}
              onClick={() => onSelect(tpl.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{tpl.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{tpl.name}</h3>
                      {selectedId === tpl.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{tpl.description}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <Badge variant="outline">
                        <Layers className="h-3 w-3 mr-1" />
                        {tpl.chapters.filter(c => c.required).length}/{tpl.chapters.length} 章
                      </Badge>
                      <span>{Math.round(tpl.totalSuggestedWords / 1000)}K 字预估</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex justify-center mt-6">
          <Button size="lg" onClick={onConfirm} className="gap-2 px-8">
            确认模板，继续配置 <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
