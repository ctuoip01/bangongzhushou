'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileText } from 'lucide-react';
import type { CoverField } from '@/lib/report-engine';

interface ReportCoverEditorProps {
  fields: CoverField[];
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

/**
 * 报告封面编辑器 — Step 2 左侧面板
 *
 * 从 report-panel.tsx 中抽取，负责封面信息表单的渲染和交互。
 */
export function ReportCoverEditor({ fields, data, onChange }: ReportCoverEditorProps) {
  return (
    <Card className="w-[320px] shrink-0 flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" /> 封面信息
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 overflow-y-auto">
        {fields.map(field => (
          <div key={field.key}>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              {field.label}{field.required ? '*' : ''}
            </label>
            {field.key === 'date' ? (
              <Input
                type="date"
                value={data[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="h-9 text-sm"
              />
            ) : (
              <Input
                value={data[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="h-9 text-sm"
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
