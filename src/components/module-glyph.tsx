'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bot,
  ChartColumnBig,
  FileCheck2,
  FileOutput,
  FileText,
  Languages,
  NotebookPen,
  Presentation,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { AIModule } from '@/config/modules';
import { cn } from '@/lib/utils';

const moduleIconMap: Record<string, LucideIcon> = {
  'document-check': FileCheck2,
  'document-convert': FileOutput,
  'report-generate': Sparkles,
  'meeting-minutes': NotebookPen,
  'weekly-report': FileText,
  'policy-search': ScanSearch,
  'competitor-analysis': BarChart3,
  'market-research': TrendingUp,
  'ppt-helper': Presentation,
  'data-visualization': ChartColumnBig,
  'translate': Languages,
  'proofread': ShieldCheck,
};

interface ModuleGlyphProps {
  module: AIModule;
  className?: string;
}

export function ModuleGlyph({ module, className }: ModuleGlyphProps) {
  const Icon = moduleIconMap[module.id];

  if (!Icon) {
    if (module.icon?.trim()) {
      return <span className={cn('text-xl leading-none', className)}>{module.icon}</span>;
    }

    return <Bot className={cn('h-5 w-5', className)} />;
  }

  return <Icon className={cn('h-5 w-5', className)} strokeWidth={1.9} />;
}
