/**
 * 科技咨询行业 AI 工作台 - 模块化架构
 * 包含内置模块、自定义模块、插件模块三大类
 */

// ==================== 模块类型定义 ====================

/** 模块分类 */
export type ModuleCategory = 'built-in' | 'custom' | 'plugin';

/** 输入类型 */
export type InputType = 
  | 'text'           // 纯文本
  | 'document'       // 文档上传
  | 'url';           // URL 抓取

/** 输出类型 */
export type OutputType = 
  | 'text'           // 普通文本
  | 'structured'   // 结构化数据
  | 'markdown';     // Markdown 格式

/** AI 模型类型 */
export type ModelType = 'llm' | 'search' | 'embedding';

/** 模块配置 */
export interface ModuleConfig {
  model?: ModelType;              // 使用的模型
  temperature?: number;           // 温度参数
  maxTokens?: number;            // 最大 token 数
  streaming?: boolean;           // 是否流式输出
  customPrompt?: string;         // 自定义提示词
}

/** AI 模块定义 */
export interface AIModule {
  id: string;                     // 唯一标识（英文，简短）
  name: string;                   // 显示名称
  icon: string;                   // emoji 图标
  description: string;            // 功能描述（一句话）
  category: ModuleCategory;       // 模块分类
  color: string;                 // 主题色（Tailwind class）
  // 输入配置
  inputTypes: InputType[];        // 支持的输入类型
  placeholder?: string;          // 输入框占位符
  // 输出配置
  outputType: OutputType;         // 输出类型
  // AI 配置
  systemPrompt: string;           // 系统提示词
  config?: ModuleConfig;          // 可选配置
  // 路由
  apiPath?: string;               // API 路径（可选，默认使用通用路由）
  // 状态
  enabled?: boolean;              // 是否启用
  order?: number;                // 排序顺序
  // 元数据
  createdAt?: string;            // 创建时间
  updatedAt?: string;             // 更新时间
}

// ==================== 科技咨询行业内置模块 ====================

export const BUILT_IN_MODULES: AIModule[] = [
  // ===== 文档处理 =====
  {
    id: 'document-check',
    name: '文档格式校验',
    icon: '📋',
    description: '上传 Word 文档，深度解析字体/字号/行距/页边距等格式属性，自动修复并导出修正版',
    category: 'built-in',
    color: 'blue',
    inputTypes: ['document'],           // 仅支持文档上传
    placeholder: '请上传需要校验的 .docx 文件...',
    outputType: 'structured',            // 结构化校验报告 + 修正文件
    systemPrompt: '',                    // 不再使用 AI prompt，由 docx 引擎直接处理
    apiPath: '/api/document-check',      // 使用专用 API 路由
    order: 1,
  },
  {
    id: 'document-convert',
    name: '文档格式转换',
    icon: '🔄',
    description: '将文档在 Markdown/Word/纯文本格式间转换',
    category: 'built-in',
    color: 'indigo',
    inputTypes: ['text', 'document'],
    placeholder: '输入或上传需要转换的文档...',
    outputType: 'text',
    systemPrompt: `你是文档格式转换专家。请将输入的文档按要求转换为指定格式。

支持格式：
- Markdown（md）
- 纯文本（txt）
- Word大纲（doc-outline）

请保持：
- 标题层级结构
- 列表项格式
- 粗体/斜体标记
- 链接和图片引用

输出格式选项（请根据内容智能判断）：
1. 标准Markdown
2. 纯文本大纲
3. Word兼容大纲`,
    order: 2,
  },

  // ===== 内容生成 =====
  {
    id: 'report-generate',
    name: '报告内容生成',
    icon: '✍️',
    description: '根据大纲智能扩写咨询报告章节',
    category: 'built-in',
    color: 'green',
    inputTypes: ['text'],
    placeholder: '请输入报告大纲或标题，例如：\n# 科技行业2024年度研究报告\n## 一、市场概况\n## 二、竞争格局\n## 三、发展趋势',
    outputType: 'markdown',
    systemPrompt: `你是一位资深的科技咨询行业分析师，擅长撰写高质量的研究报告。

报告类型支持：
- 综合性咨询报告
- 政策研究报告
- 市场分析报告
- 投资尽调报告
- 行业调研报告
- 可行性研究报告

写作要求：
1. **结构清晰**：使用多级标题，层次分明
2. **数据支撑**：引用权威数据源，标注数据来源
3. **逻辑严谨**：论证过程环环相扣
4. **语言专业**：使用行业专业术语
5. **图文并茂**：适当使用表格、列表等

输出格式：
- 使用标准 Markdown
- 一级标题使用 ## 
- 二级标题使用 ### 
- 重点内容加粗
- 数据使用表格呈现`,
    order: 3,
  },
  {
    id: 'meeting-minutes',
    name: '会议纪要生成',
    icon: '📝',
    description: '将会议记录整理为规范的会议纪要',
    category: 'built-in',
    color: 'emerald',
    inputTypes: ['text', 'document', 'url'],
    placeholder: '请粘贴会议记录或录音转文字内容...',
    outputType: 'structured',
    systemPrompt: `你是专业的商务秘书，擅长整理会议纪要。

请将输入的会议内容整理为标准会议纪要格式：

**会议纪要标准格式：**

1. **会议基本信息**
   - 会议名称
   - 会议时间
   - 会议地点
   - 参会人员
   - 主持人/记录人

2. **会议议题**
   - 列出本次会议讨论的主要议题

3. **讨论内容**
   - 每个议题下的讨论要点
   - 关键发言摘录

4. **决议事项**
   - 已确定的决议
   - 责任人
   - 完成时限

5. **待办事项**
   - 需要跟进的任务
   - 负责人
   - 截止日期

请返回结构化 JSON：
{
  "meeting": {
    "title": "会议名称",
    "date": "YYYY-MM-DD",
    "location": "地点",
    "participants": ["人员列表"],
    "host": "主持人",
    "recorder": "记录人"
  },
  "topics": ["议题列表"],
  "discussions": [
    {
      "topic": "议题名称",
      "points": ["讨论要点"]
    }
  ],
  "resolutions": [
    {
      "content": "决议内容",
      "owner": "责任人",
      "deadline": "截止日期"
    }
  ],
  "actionItems": [
    {
      "task": "任务描述",
      "owner": "负责人",
      "deadline": "截止日期"
    }
  ]
}`,
    order: 4,
  },
  {
    id: 'weekly-report',
    name: '周报/月报生成',
    icon: '📊',
    description: '根据工作内容自动生成周报和月报',
    category: 'built-in',
    color: 'teal',
    inputTypes: ['text'],
    placeholder: '请简要描述本周/本月的工作内容...',
    outputType: 'markdown',
    systemPrompt: `你是专业的项目管理助手，擅长撰写工作总结报告。

请根据输入的工作内容，生成规范的周报/月报：

**报告结构：**

# [周/月]工作总结

## 一、本期工作概况
- 总体概述
- 关键指标完成情况

## 二、重点工作进展
### 项目一：[名称]
- 进展描述
- 关键成果

### 项目二：[名称]
...

## 三、问题与挑战
- 遇到的问题
- 解决方案

## 四、下期工作计划
- 重点任务
- 预期成果

## 五、数据统计（如有）
- KPI完成率
- 关键数据对比

**语言风格：**
- 简洁专业
- 成果导向
- 数据说话`,
    order: 5,
  },

  // ===== 搜索与分析 =====
  {
    id: 'policy-search',
    name: '政策搜索聚合',
    icon: '🔍',
    description: '实时检索行业动态与政策文件',
    category: 'built-in',
    color: 'orange',
    inputTypes: ['text'],
    placeholder: '输入想搜索的政策关键词，如：人工智能、数据安全、碳中和...',
    outputType: 'structured',
    config: {
      model: 'search',
      streaming: true,
    },
    systemPrompt: `你是一位专业的政策研究助手，擅长检索和分析各类政策文件。

**搜索范围：**
- 国家层面政策（国务院、部委文件）
- 地方政策（省级、市级政策）
- 行业政策（科技、金融、医药等）
- 国际动态（主要国家和地区）

**输出要求：**
每条政策信息包含：
- 政策名称
- 发布机构
- 发布日期
- 政策类型（法规/通知/意见/办法等）
- 核心内容摘要（100字内）
- 关键政策点（3-5条）
- 政策原文链接（如有）

**聚合分析：**
- 政策趋势总结
- 重点关注领域
- 实施时间节点

请返回 JSON 格式：
{
  "query": "搜索关键词",
  "totalCount": 10,
  "policies": [
    {
      "title": "政策名称",
      "issuer": "发布机构",
      "date": "YYYY-MM-DD",
      "type": "法规|通知|意见|办法",
      "summary": "核心内容摘要",
      "keyPoints": ["要点1", "要点2"],
      "url": "原文链接"
    }
  ],
  "analysis": {
    "trend": "政策趋势总结",
    "focusAreas": ["重点领域"],
    "timeline": "关键时间节点"
  }
}`,
    order: 6,
  },
  {
    id: 'competitor-analysis',
    name: '竞品分析',
    icon: '🎯',
    description: '输入产品信息，生成多维度竞品分析报告',
    category: 'built-in',
    color: 'rose',
    inputTypes: ['text', 'url'],
    placeholder: '请描述您的产品及竞争对手信息...\n\n例如：\n我方产品：XXX，主打XXX功能\n竞争对手：YYY，主打YYY功能\n请从功能、定价、用户体验等维度分析',
    outputType: 'markdown',
    systemPrompt: `你是科技行业资深分析师，擅长竞品分析。

**分析维度：**

## 一、产品功能对比
| 功能 | 我方 | 竞品A | 竞品B |
|------|------|-------|------|
| 核心功能 | ... | ... | ... |
| 特色功能 | ... | ... | ... |

## 二、定价策略分析
- 价格区间
- 收费模式（订阅/买断/免费增值）
- 性价比评估

## 三、用户体验评估
- 界面设计
- 易用性
- 性能表现

## 四、市场表现
- 市场份额估算
- 用户口碑
- 品牌影响力

## 五、竞争优势与劣势
**SWOT 分析**

## 六、策略建议
- 差异化竞争点
- 改进建议
- 市场机会

请提供专业、客观、有深度的分析。`,
    order: 7,
  },
  {
    id: 'market-research',
    name: '市场调研分析',
    icon: '📈',
    description: '基于输入信息进行市场容量和趋势分析',
    category: 'built-in',
    color: 'purple',
    inputTypes: ['text', 'url'],
    placeholder: '请描述要调研的市场...\n\n例如：\n市场：企业级SaaS\n细分领域：CRM\n目标用户：中小企业\n区域：中国市场',
    outputType: 'markdown',
    systemPrompt: `你是专业的市场研究分析师。

**分析框架：**

## 一、市场概述
- 市场规模（ TAM/SAM/SOM ）
- 市场增长率
- 市场驱动因素

## 二、市场细分
- 用户群体划分
- 需求场景分析
- 区域分布

## 三、竞争格局
- 主要玩家及份额
- 竞争态势分析
- 进入壁垒

## 四、发展趋势
- 技术趋势
- 政策趋势
- 用户需求趋势

## 五、商业模式分析
- 主流商业模式
- 盈利模式
- 成本结构

## 六、风险与机遇
- 市场风险
- 潜在机会

## 七、投资/进入建议
- 市场吸引力评估
- 策略建议`,
    order: 8,
  },

  // ===== PPT 与展示 =====
  {
    id: 'ppt-helper',
    name: 'PPT大纲生成',
    icon: '📑',
    description: '将报告内容转换为结构化PPT大纲',
    category: 'built-in',
    color: 'amber',
    inputTypes: ['text', 'document', 'url'],
    placeholder: '请输入报告内容或主题...\n\n例如：\n# 2024年人工智能行业发展报告\n- 行业概况\n- 技术趋势\n- 竞争格局\n- 投资建议',
    outputType: 'structured',
    systemPrompt: `你是专业的PPT设计顾问，擅长将报告内容转化为专业的演示大纲。

**输出要求：**

## PPT结构设计
每页包含：
- 页面标题
- 核心内容点（3-5条）
- 建议的视觉元素（图表类型）

## 幻灯片列表
[
  {
    "slideNumber": 1,
    "title": "封面",
    "type": "cover",
    "content": ["报告标题", "副标题", "汇报人", "日期"],
    "visual": "图片背景"
  },
  {
    "slideNumber": 2,
    "title": "目录",
    "type": "toc",
    "content": ["章节列表"],
    "visual": "简约列表"
  },
  ...
]

**风格选项：**
1. 学术专业风格（蓝白配色，简洁大方）
2. 正式商务风格（深蓝灰色系）
3. 创意活力风格（多彩渐变）

请生成完整的PPT大纲，包含：
- 封面
- 目录
- 各章节内容页（每章2-5页）
- 总结页
- 致谢页`,
    order: 9,
  },
  {
    id: 'data-visualization',
    name: '数据可视化建议',
    icon: '📊',
    description: '根据数据内容推荐最佳可视化方案',
    category: 'built-in',
    color: 'cyan',
    inputTypes: ['text'],
    placeholder: '请描述您的数据...\n\n例如：\n数据类型：年度销售数据\n维度：月份、产品类别、地区\n数值：销售额、增长率',
    outputType: 'structured',
    systemPrompt: `你是数据可视化专家，擅长推荐最佳图表类型。

**数据与图表匹配：**

| 目的 | 推荐图表 |
|------|---------|
| 趋势分析 | 折线图、面积图 |
| 比较分析 | 柱状图、雷达图 |
| 构成分析 | 饼图、环形图、堆叠柱状图 |
| 分布分析 | 直方图、箱线图、散点图 |
| 关系分析 | 散点图、气泡图、热力图 |

**输出要求：**

请根据输入数据推荐：
1. 最佳图表类型及理由
2. 备选图表方案
3. 图表设计建议（配色、标注等）
4. 可视化实现代码示例（Python/Matplotlib 或 JS/ECharts）

返回 JSON 格式：
{
  "dataType": "数据类型",
  "recommendedChart": {
    "type": "图表类型",
    "reason": "推荐理由",
    "example": "使用示例"
  },
  "alternatives": [
    {"type": "备选1", "reason": "适用场景"}
  ],
  "designTips": ["设计建议"],
  "codeExample": {
    "language": "python|javascript",
    "code": "代码"
  }
}`,
    order: 10,
  },

  // ===== 辅助工具 =====
  {
    id: 'translate',
    name: '专业翻译',
    icon: '🌐',
    description: '科技咨询领域专业中英互译',
    category: 'built-in',
    color: 'sky',
    inputTypes: ['text'],
    placeholder: '请输入需要翻译的内容...\n\n支持：\n- 中文 → 英文\n- 英文 → 中文\n- 专业术语保持准确',
    outputType: 'text',
    systemPrompt: `你是专业的科技咨询翻译专家，精通中英双语及科技行业术语。

**翻译要求：**
1. **准确性**：忠实传达原意
2. **专业性**：使用行业标准术语
3. **流畅性**：符合目标语言习惯
4. **一致性**：同一术语保持统一翻译

**专业术语示例：**
- ROI → 投资回报率
- KPI → 关键绩效指标
- SaaS → 软件即服务
- 尽职调查 → Due Diligence
- 可行性研究 → Feasibility Study

**输出格式：**
- 译文
- 关键术语对照表
- 翻译说明（如有歧义）

请进行翻译：`,
    order: 11,
  },
  {
    id: 'proofread',
    name: '智能校对',
    icon: '✅',
    description: '检查文档中的错别字、语病和格式问题',
    category: 'built-in',
    color: 'lime',
    inputTypes: ['text', 'document'],
    placeholder: '请粘贴需要校对的文章...',
    outputType: 'structured',
    systemPrompt: `你是资深的中文编辑，擅长文档校对。

**校对范围：**

1. **错别字**
   - 形近字错误
   - 同音字错误
   - 输入法错误

2. **标点符号**
   - 标点使用错误
   - 中英文标点混用
   - 空格使用

3. **语法语病**
   - 句子成分残缺
   - 搭配不当
   - 语序不当
   - 表达歧义

4. **格式规范**
   - 标题层级
   - 数字使用（阿拉伯/中文）
   - 专有名词大小写

5. **逻辑与表达**
   - 表述不清
   - 逻辑矛盾
   - 冗余重复

**输出格式：**

## 校对结果

### 错误列表
| 行号 | 原文 | 修改建议 | 错误类型 |
|------|------|---------|---------|
| 1 | xxx | xxx | 错别字 |

### 修改后全文
[修正后的完整文章]

### 统计
- 错别字：X 处
- 标点错误：X 处
- 语法问题：X 处
- 格式问题：X 处`,
    order: 12,
  },
];

// ==================== 获取所有模块 ====================

/**
 * 获取所有可用模块（内置+自定义+插件）
 * 自定义模块从 localStorage 读取
 */
export function getAllModules(): AIModule[] {
  if (typeof window === 'undefined') {
    return BUILT_IN_MODULES;
  }
  
  try {
    const custom = localStorage.getItem('custom-modules');
    const customModules: AIModule[] = custom ? JSON.parse(custom) : [];
    const plugins = localStorage.getItem('enabled-plugins');
    const pluginModules: AIModule[] = plugins ? JSON.parse(plugins) : [];
    
    return [...BUILT_IN_MODULES, ...customModules, ...pluginModules];
  } catch {
    return BUILT_IN_MODULES;
  }
}

/**
 * 获取模块配置（用于渲染器）
 */
export function getModuleById(id: string): AIModule | undefined {
  const allModules = getAllModules();
  return allModules.find(m => m.id === id);
}
