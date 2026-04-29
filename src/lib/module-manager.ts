/**
 * 自定义模块管理器
 * 负责存储、加载、删除用户自定义模块
 */

import type { AIModule } from '@/config/modules';

const STORAGE_KEY = 'custom-modules';

/**
 * 获取所有自定义模块
 */
export function getCustomModules(): AIModule[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    console.error('读取自定义模块失败');
    return [];
  }
}

/**
 * 保存自定义模块
 */
export function saveCustomModule(module: AIModule): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const modules = getCustomModules();
    
    // 检查是否已存在（更新）
    const existingIndex = modules.findIndex(m => m.id === module.id);
    
    if (existingIndex >= 0) {
      modules[existingIndex] = { ...module, updatedAt: new Date().toISOString() };
    } else {
      modules.push({ ...module, createdAt: new Date().toISOString() });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
    return true;
  } catch (error) {
    console.error('保存自定义模块失败:', error);
    return false;
  }
}

/**
 * 删除自定义模块
 */
export function deleteCustomModule(moduleId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const modules = getCustomModules();
    const filtered = modules.filter(m => m.id !== moduleId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('删除自定义模块失败:', error);
    return false;
  }
}

/**
 * 验证模块配置的完整性
 */
export function validateModule(module: Partial<AIModule>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!module.id?.trim()) {
    errors.push('模块 ID 不能为空');
  } else if (!/^[a-z0-9-]+$/.test(module.id)) {
    errors.push('模块 ID 只能包含小写字母、数字和连字符');
  }
  
  if (!module.name?.trim()) {
    errors.push('模块名称不能为空');
  }
  
  if (!module.description?.trim()) {
    errors.push('功能描述不能为空');
  }
  
  if (!module.systemPrompt?.trim()) {
    errors.push('AI 提示词不能为空');
  }
  
  if (!module.inputTypes || module.inputTypes.length === 0) {
    errors.push('至少需要选择一种输入类型');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 生成唯一模块 ID
 */
export function generateModuleId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36);
}

/**
 * 导出自定义模块为 JSON
 */
export function exportModules(): string {
  const modules = getCustomModules();
  return JSON.stringify(modules, null, 2);
}

/**
 * 从 JSON 导入模块
 */
export function importModules(json: string): { success: boolean; count: number; errors: string[] } {
  try {
    const imported = JSON.parse(json) as AIModule[];
    const errors: string[] = [];
    let count = 0;
    
    for (const mod of imported) {
      const validation = validateModule(mod);
      if (validation.valid) {
        // 生成新 ID 避免冲突
        const newModule = {
          ...mod,
          id: generateModuleId(mod.name) + '-imported',
          category: 'custom' as const,
        };
        if (saveCustomModule(newModule)) {
          count++;
        }
      } else {
        errors.push(`${mod.name}: ${validation.errors.join(', ')}`);
      }
    }
    
    return { success: count > 0, count, errors };
  } catch (error) {
    return { 
      success: false, 
      count: 0, 
      errors: [`JSON 解析失败: ${error instanceof Error ? error.message : '未知错误'}`] 
    };
  }
}
