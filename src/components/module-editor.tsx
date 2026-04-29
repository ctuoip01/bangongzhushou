'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { validateModule, generateModuleId } from '@/lib/module-manager';
import type { AIModule, InputType } from '@/config/modules';

interface ModuleEditorProps {
  module?: AIModule;  // 如果有值则为编辑模式
  onSave: (module: AIModule) => void;
  onCancel: () => void;
}

// 预设图标列表
const PRESET_ICONS = ['📋', '📝', '🔍', '📊', '📈', '🎯', '💡', '⚡', '🔧', '🚀', '💼', '📑', '🌐', '🤖', '📱', '🖥️', '📁', '🔗', '✅', '📌'];

// 预设颜色
const PRESET_COLORS = [
  { name: '蓝色', value: 'blue' },
  { name: '绿色', value: 'green' },
  { name: '橙色', value: 'orange' },
  { name: '紫色', value: 'purple' },
  { name: '红色', value: 'red' },
  { name: '青色', value: 'cyan' },
  { name: '天蓝', value: 'sky' },
  { name: '琥珀', value: 'amber' },
];

// 预设模板
const PRESET_TEMPLATES = [
  {
    name: '通用问答',
    icon: '💬',
    description: '回答通用问题',
    prompt: '你是一个友好的AI助手，请根据用户的问题提供准确、有帮助的回答。',
  },
  {
    name: '内容总结',
    icon: '📝',
    description: '将长文本总结为要点',
    prompt: '请将以下内容总结为3-5个关键要点，每个要点简洁明了：\n\n',
  },
  {
    name: 'SWOT分析',
    icon: '🎯',
    description: '进行SWOT分析',
    prompt: `请对以下主题进行SWOT分析：

## Strengths (优势)
- 

## Weaknesses (劣势)
- 

## Opportunities (机会)
- 

## Threats (威胁)
- 

请提供详细、客观的分析。`,
  },
  {
    name: '方案策划',
    icon: '💡',
    description: '制定详细执行方案',
    prompt: `请根据以下需求制定详细执行方案：

## 需求背景


## 目标


## 执行计划
### 第一阶段：


### 第二阶段：


### 第三阶段：


## 资源需求


## 风险与对策

请提供切实可行的方案。`,
  },
];

export function ModuleEditor({ module, onSave, onCancel }: ModuleEditorProps) {
  const [formData, setFormData] = useState<Partial<AIModule>>({
    id: '',
    name: '',
    icon: '💡',
    description: '',
    inputTypes: ['text'],
    outputType: 'text',
    systemPrompt: '',
    color: 'blue',
    category: 'custom',
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'prompt' | 'advanced'>('basic');

  // 初始化编辑数据
  useEffect(() => {
    if (module) {
      setFormData(module);
    } else {
      setFormData({
        id: generateModuleId(''),
        name: '',
        icon: '💡',
        description: '',
        inputTypes: ['text'],
        outputType: 'text',
        systemPrompt: '',
        color: 'blue',
        category: 'custom',
      });
    }
  }, [module]);

  // 处理输入变化
  const handleChange = (field: keyof AIModule, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  // 切换输入类型
  const toggleInputType = (type: InputType) => {
    const current = formData.inputTypes || [];
    if (current.includes(type)) {
      if (current.length > 1) {
        handleChange('inputTypes', current.filter(t => t !== type));
      }
    } else {
      handleChange('inputTypes', [...current, type]);
    }
  };

  // 应用模板
  const applyTemplate = (template: typeof PRESET_TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      name: prev.name || template.name,
      icon: template.icon,
      description: template.description,
      systemPrompt: template.prompt,
    }));
  };

  // 保存
  const handleSave = () => {
    const validation = validateModule(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const finalModule: AIModule = {
      id: formData.id || generateModuleId(formData.name || ''),
      name: formData.name!,
      icon: formData.icon || '💡',
      description: formData.description || '',
      category: 'custom',
      color: formData.color || 'blue',
      inputTypes: formData.inputTypes || ['text'],
      outputType: formData.outputType || 'text',
      systemPrompt: formData.systemPrompt || '',
    };

    onSave(finalModule);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background rounded-xl shadow-2xl">
        {/* 头部 */}
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {module ? '编辑自定义模块' : '创建自定义模块'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-md hover:bg-muted"
          >
            ✕
          </button>
        </div>

        {/* Tab */}
        <div className="border-b bg-muted/30">
          <div className="flex px-6">
            {(['basic', 'prompt', 'advanced'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab === 'basic' && '基本信息'}
                {tab === 'prompt' && '提示词配置'}
                {tab === 'advanced' && '高级设置'}
              </button>
            ))}
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-5">
          {/* 基本信息 */}
          {activeTab === 'basic' && (
            <>
              {/* 名称 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">模块名称 *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="例如：竞品分析"
                  className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* 描述 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">功能描述 *</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="简要描述这个模块的功能"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* 图标 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">选择图标</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => handleChange('icon', icon)}
                      className={cn(
                        'w-10 h-10 text-xl rounded-lg border transition-colors',
                        formData.icon === icon
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-muted-foreground'
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* 颜色 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">主题颜色</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleChange('color', color.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                        formData.color === color.value
                          ? 'ring-2 ring-offset-2 ring-primary'
                          : 'bg-muted hover:bg-muted/80'
                      )}
                      style={{
                        backgroundColor: `var(--${color.value}-100)`,
                        color: `var(--${color.value}-700)`,
                      }}
                    >
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 输入类型 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">支持的输入类型 *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.inputTypes?.includes('text')}
                      onChange={() => toggleInputType('text')}
                      className="rounded border-muted-foreground"
                    />
                    <span>📝 文本输入</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.inputTypes?.includes('url')}
                      onChange={() => toggleInputType('url')}
                      className="rounded border-muted-foreground"
                    />
                    <span>🔗 URL 抓取</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.inputTypes?.includes('document')}
                      onChange={() => toggleInputType('document')}
                      className="rounded border-muted-foreground"
                    />
                    <span>📎 文档上传</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* 提示词配置 */}
          {activeTab === 'prompt' && (
            <>
              {/* 模板 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">快速模板</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_TEMPLATES.map((template) => (
                    <button
                      key={template.name}
                      onClick={() => applyTemplate(template)}
                      className="p-3 text-left border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>{template.icon}</span>
                        <span className="font-medium text-sm">{template.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 系统提示词 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  系统提示词 *
                  <span className="text-muted-foreground font-normal ml-2">
                    定义 AI 的角色和能力
                  </span>
                </label>
                <textarea
                  value={formData.systemPrompt || ''}
                  onChange={(e) => handleChange('systemPrompt', e.target.value)}
                  placeholder="你是一位专业的XXX，擅长...
                  
请按照以下格式输出：
1. 
2. 
3. "
                  rows={12}
                  className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary/50 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  💡 提示词越详细，AI 输出质量越高。可包含角色设定、输出格式、注意事项等。
                </p>
              </div>

              {/* 输出类型 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">输出格式</label>
                <div className="flex gap-4">
                  {[
                    { value: 'text', label: '📝 普通文本', desc: '纯文本回复' },
                    { value: 'markdown', label: '📋 Markdown', desc: '支持格式化的文本' },
                    { value: 'structured', label: '📊 结构化', desc: 'JSON 格式数据' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors',
                        formData.outputType === option.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      )}
                    >
                      <input
                        type="radio"
                        name="outputType"
                        value={option.value}
                        checked={formData.outputType === option.value}
                        onChange={() => handleChange('outputType', option.value)}
                        className="sr-only"
                      />
                      <div>
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 高级设置 */}
          {activeTab === 'advanced' && (
            <>
              <div className="space-y-4">
                {/* 温度参数 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    温度参数 (Temperature)
                    <span className="text-muted-foreground font-normal ml-2">
                      控制输出的随机性
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={0.7}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>精确 (0.0)</span>
                    <span>平衡 (0.7)</span>
                    <span>创意 (1.0)</span>
                  </div>
                </div>

                {/* 最大 Token */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    最大输出长度
                    <span className="text-muted-foreground font-normal ml-2">
                      限制 AI 输出的最大字符数
                    </span>
                  </label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background">
                    <option value="1024">1,000 字</option>
                    <option value="2048">2,000 字</option>
                    <option value="4096" selected>4,000 字</option>
                    <option value="8192">8,000 字</option>
                  </select>
                </div>

                {/* ID */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    模块 ID
                    <span className="text-muted-foreground font-normal ml-2">
                      唯一标识符
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.id || ''}
                    onChange={(e) => handleChange('id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="my-custom-module"
                    className="w-full px-3 py-2 border rounded-md bg-muted font-mono text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* 错误提示 */}
          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <div className="font-medium mb-1">请修正以下问题：</div>
              <ul className="list-disc list-inside space-y-0.5">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="sticky bottom-0 bg-background border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            保存模块
          </button>
        </div>
      </div>
    </div>
  );
}
