'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIModule } from '@/config/modules';
import { ModuleGlyph } from '@/components/module-glyph';

interface ModuleCardProps {
  module: AIModule;
  onEdit?: (module: AIModule) => void;
  onDelete?: (moduleId: string) => void;
  compact?: boolean;
}

const colorMap: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  blue: { bg: 'bg-blue-50/80', border: 'border-blue-200/80', text: 'text-blue-700', hover: 'hover:border-blue-400' },
  green: { bg: 'bg-green-50/80', border: 'border-green-200/80', text: 'text-green-700', hover: 'hover:border-green-400' },
  orange: { bg: 'bg-orange-50/80', border: 'border-orange-200/80', text: 'text-orange-700', hover: 'hover:border-orange-400' },
  purple: { bg: 'bg-purple-50/80', border: 'border-purple-200/80', text: 'text-purple-700', hover: 'hover:border-purple-400' },
  red: { bg: 'bg-red-50/80', border: 'border-red-200/80', text: 'text-red-700', hover: 'hover:border-red-400' },
  indigo: { bg: 'bg-indigo-50/80', border: 'border-indigo-200/80', text: 'text-indigo-700', hover: 'hover:border-indigo-400' },
  amber: { bg: 'bg-amber-50/80', border: 'border-amber-200/80', text: 'text-amber-700', hover: 'hover:border-amber-400' },
  cyan: { bg: 'bg-cyan-50/80', border: 'border-cyan-200/80', text: 'text-cyan-700', hover: 'hover:border-cyan-400' },
  emerald: { bg: 'bg-emerald-50/80', border: 'border-emerald-200/80', text: 'text-emerald-700', hover: 'hover:border-emerald-400' },
  teal: { bg: 'bg-teal-50/80', border: 'border-teal-200/80', text: 'text-teal-700', hover: 'hover:border-teal-400' },
  rose: { bg: 'bg-rose-50/80', border: 'border-rose-200/80', text: 'text-rose-700', hover: 'hover:border-rose-400' },
  sky: { bg: 'bg-sky-50/80', border: 'border-sky-200/80', text: 'text-sky-700', hover: 'hover:border-sky-400' },
  lime: { bg: 'bg-lime-50/80', border: 'border-lime-200/80', text: 'text-lime-700', hover: 'hover:border-lime-400' },
};

export function ModuleCard({ module, onEdit, onDelete, compact = false }: ModuleCardProps) {
  const router = useRouter();
  const colors = colorMap[module.color] || colorMap.blue;

  const handleClick = () => {
    router.push(`/module/${module.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(module);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定要删除模块“${module.name}”吗？`)) {
      onDelete?.(module.id);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'w-full rounded-3xl border px-4 py-3 text-left transition-all duration-300',
          'bg-white/65 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl',
          'hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.1)]',
          colors.border,
          colors.hover
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('rounded-2xl border p-2', colors.bg, colors.border)}>
            <ModuleGlyph module={module} className={colors.text} />
          </div>
          <span className={cn('font-medium', colors.text)}>{module.name}</span>
        </div>
      </button>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-[28px] border p-5 transition-all duration-300',
        'bg-white/62 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl',
        'hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)]',
        colors.border,
        colors.hover
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-white/45 to-transparent" />

      {module.category === 'custom' && (
        <span className="absolute right-4 top-4 rounded-full border border-violet-200 bg-violet-50/90 px-2.5 py-1 text-[10px] font-medium text-violet-700">
          自定义
        </span>
      )}
      {module.category === 'plugin' && (
        <span className="absolute right-4 top-4 rounded-full border border-slate-200 bg-slate-50/90 px-2.5 py-1 text-[10px] font-medium text-slate-700">
          插件
        </span>
      )}

      <div className={cn('mb-4 inline-flex rounded-3xl border p-3', colors.bg, colors.border)}>
        <ModuleGlyph module={module} className={cn('h-6 w-6', colors.text)} />
      </div>

      <h3 className={cn('mb-2 text-base font-semibold tracking-tight', colors.text)}>{module.name}</h3>

      <p className="mb-4 line-clamp-2 text-sm leading-6 text-slate-600">{module.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {module.inputTypes.map((type) => (
          <span
            key={type}
            className="rounded-full border border-white/80 bg-white/70 px-2 py-1 text-[10px] font-medium text-slate-600"
          >
            {type === 'text' && '文本'}
            {type === 'url' && 'URL'}
            {type === 'document' && '文档'}
          </span>
        ))}
      </div>

      {(onEdit || onDelete) && (
        <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          {onEdit && module.category === 'custom' && (
            <button
              onClick={handleEdit}
              className="rounded-full border border-white/80 bg-white/90 p-2 text-slate-500 shadow-sm transition hover:text-slate-900"
              title="编辑"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && module.category === 'custom' && (
            <button
              onClick={handleDelete}
              className="rounded-full border border-white/80 bg-white/90 p-2 text-slate-500 shadow-sm transition hover:text-destructive"
              title="删除"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
