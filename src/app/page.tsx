'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ModuleCard } from '@/components/module-card';
import { ModuleEditor } from '@/components/module-editor';
import { BUILT_IN_MODULES, type AIModule } from '@/config/modules';
import { getCustomModules, saveCustomModule, deleteCustomModule } from '@/lib/module-manager';

type CategoryFilter = 'all' | 'built-in' | 'custom';

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [editingModule, setEditingModule] = useState<AIModule | undefined>();
  const [customModules, setCustomModules] = useState<AIModule[]>([]);
  const [recentModules, setRecentModules] = useState<string[]>([]);

  // 加载自定义模块
  useEffect(() => {
    setCustomModules(getCustomModules());
    
    // 加载最近使用
    const stored = localStorage.getItem('recent-modules');
    if (stored) {
      try {
        setRecentModules(JSON.parse(stored));
      } catch {
        setRecentModules([]);
      }
    }
  }, []);

  // 所有可用模块
  const allModules = [...BUILT_IN_MODULES, ...customModules];
  
  // 筛选模块
  const filteredModules = allModules.filter(m => {
    if (activeCategory === 'all') return true;
    return m.category === activeCategory;
  });

  // 处理保存模块
  const handleSaveModule = (module: AIModule) => {
    saveCustomModule(module);
    setCustomModules(getCustomModules());
    setShowEditor(false);
    setEditingModule(undefined);
  };

  // 处理删除模块
  const handleDeleteModule = (moduleId: string) => {
    deleteCustomModule(moduleId);
    setCustomModules(getCustomModules());
  };

  // 处理编辑模块
  const handleEditModule = (module: AIModule) => {
    setEditingModule(module);
    setShowEditor(true);
  };

  // 统计数据
  const stats = {
    total: allModules.length,
    builtIn: BUILT_IN_MODULES.length,
    custom: customModules.length,
  };

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧边栏 */}
      <aside className="w-72 border-r flex flex-col bg-muted/30">
        {/* Logo */}
        <div className="p-5 border-b">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            智研助手
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            科技咨询行业 AI 工作台
          </p>
        </div>

        {/* 统计 */}
        <div className="p-4 border-b bg-muted/20">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-background">
              <div className="text-lg font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">全部</div>
            </div>
            <div className="p-2 rounded-lg bg-background">
              <div className="text-lg font-bold text-blue-600">{stats.builtIn}</div>
              <div className="text-xs text-muted-foreground">内置</div>
            </div>
            <div className="p-2 rounded-lg bg-background">
              <div className="text-lg font-bold text-purple-600">{stats.custom}</div>
              <div className="text-xs text-muted-foreground">自定义</div>
            </div>
          </div>
        </div>

        {/* 分类筛选 */}
        <div className="p-4 space-y-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            功能分类
          </h2>
          {[
            { key: 'all' as CategoryFilter, label: '📦 全部模块', count: stats.total },
            { key: 'built-in' as CategoryFilter, label: '🔒 内置模块', count: stats.builtIn },
            { key: 'custom' as CategoryFilter, label: '✨ 我的模块', count: stats.custom },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                activeCategory === key
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <span>{label}</span>
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                activeCategory === key ? 'bg-primary-foreground/20' : 'bg-muted'
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* 最近使用 */}
        {recentModules.length > 0 && (
          <div className="px-4 py-3 border-t">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              最近使用
            </h2>
            <div className="space-y-1">
              {recentModules.slice(0, 3).map((moduleId) => {
                const mod = allModules.find(m => m.id === moduleId);
                if (!mod) return null;
                return (
                  <Link
                    key={moduleId}
                    href={`/module/${moduleId}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm"
                  >
                    <span>{mod.icon}</span>
                    <span className="truncate">{mod.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 添加自定义模块 */}
        <div className="mt-auto p-4 border-t">
          <button
            onClick={() => {
              setEditingModule(undefined);
              setShowEditor(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <span>+</span>
            创建自定义模块
          </button>
        </div>
      </aside>

      {/* 右侧主区域 */}
      <main className="flex-1 overflow-auto">
        {/* 头部 */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {activeCategory === 'all' && '全部功能模块'}
                {activeCategory === 'built-in' && '内置模块'}
                {activeCategory === 'custom' && '我的自定义模块'}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {filteredModules.length} 个可用模块
              </p>
            </div>
            
            {/* 快捷搜索 */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder="搜索模块..."
                className="w-full pl-9 pr-4 py-2 border rounded-lg bg-muted/50 focus:bg-background focus:ring-2 focus:ring-primary/50"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                🔍
              </span>
            </div>
          </div>
        </header>

        {/* 模块网格 */}
        <div className="p-8">
          {filteredModules.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  onEdit={handleEditModule}
                  onDelete={handleDeleteModule}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-medium mb-2">
                {activeCategory === 'custom' ? '还没有自定义模块' : '暂无模块'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {activeCategory === 'custom' 
                  ? '点击下方按钮创建你的第一个自定义模块' 
                  : '该分类下暂无可用模块'}
              </p>
              {activeCategory === 'custom' && (
                <button
                  onClick={() => setShowEditor(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  创建自定义模块
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 模块编辑器 */}
      {showEditor && (
        <ModuleEditor
          module={editingModule}
          onSave={handleSaveModule}
          onCancel={() => {
            setShowEditor(false);
            setEditingModule(undefined);
          }}
        />
      )}
    </div>
  );
}
