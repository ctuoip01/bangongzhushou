'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { AIModule } from '@/config/modules';

interface ModuleCardProps {
  module: AIModule;
  onEdit?: (module: AIModule) => void;
  onDelete?: (moduleId: string) => void;
  compact?: boolean;
}

// 颜色映射
const colorMap: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hover: 'hover:border-blue-400' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', hover: 'hover:border-green-400' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', hover: 'hover:border-orange-400' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', hover: 'hover:border-purple-400' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', hover: 'hover:border-red-400' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', hover: 'hover:border-indigo-400' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', hover: 'hover:border-amber-400' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', hover: 'hover:border-cyan-400' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', hover: 'hover:border-emerald-400' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', hover: 'hover:border-teal-400' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', hover: 'hover:border-rose-400' },
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', hover: 'hover:border-sky-400' },
  lime: { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700', hover: 'hover:border-lime-400' },
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
    if (confirm(`确定要删除模块「${module.name}」吗？`)) {
      onDelete?.(module.id);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'w-full text-left p-3 rounded-lg border transition-all',
          colors.bg, colors.border, colors.hover
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{module.icon}</span>
          <span className={cn('font-medium', colors.text)}>{module.name}</span>
        </div>
      </button>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative p-5 rounded-xl border bg-card cursor-pointer transition-all',
        'hover:shadow-lg hover:-translate-y-0.5',
        colors.border, colors.hover
      )}
    >
      {/* 分类标签 */}
      {module.category === 'custom' && (
        <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
          自定义
        </span>
      )}
      {module.category === 'plugin' && (
        <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
          插件
        </span>
      )}

      {/* 图标 */}
      <div className={cn('text-3xl mb-3', colors.text)}>
        {module.icon}
      </div>

      {/* 标题 */}
      <h3 className={cn('font-semibold text-base mb-1', colors.text)}>
        {module.name}
      </h3>

      {/* 描述 */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {module.description}
      </p>

      {/* 输入类型标签 */}
      <div className="flex flex-wrap gap-1">
        {module.inputTypes.map((type) => (
          <span
            key={type}
            className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
          >
            {type === 'text' && '📝 文本'}
            {type === 'url' && '🔗 URL'}
            {type === 'document' && '📎 文档'}
          </span>
        ))}
      </div>

      {/* 操作按钮 */}
      {(onEdit || onDelete) && (
        <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && module.category === 'custom' && (
            <button
              onClick={handleEdit}
              className="p-1.5 rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground"
              title="编辑"
            >
              ✏️
            </button>
          )}
          {onDelete && module.category === 'custom' && (
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-destructive"
              title="删除"
            >
              🗑️
            </button>
          )}
        </div>
      )}
    </div>
  );
}
