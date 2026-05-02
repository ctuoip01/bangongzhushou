/**
 * 报告模板系统 — 定义各类咨询报告的标准骨架
 *
 * 每个模板包含：
 * - 报告元信息（类型、默认标题、描述）
 * - 章节定义（必选/可选、建议字数、内容指引）
 * - 格式规范（字体、字号层级）
 */

export interface ChapterTemplate {
  id: string;
  title: string;
  level: number;           // 1=一级标题(一、), 2=二级((一)), 3=三级(1.)
  required: boolean;        // 是否必选
  suggestedWords: number;   // 建议字数范围(最小)
  maxWords?: number;        // 建议字数范围(最大)
  placeholder: string;      // 内容占位提示
  writingGuide: string;     // AI写作指引
}

export interface ReportTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  chapters: ChapterTemplate[];
  totalSuggestedWords: number;
  coverFields: CoverField[];
}

export interface CoverField {
  key: string;
  label: string;
  required: boolean;
  defaultValue?: string | (() => string);
  placeholder: string;
}

// ========== 模板库 ==========

const COVER_FIELDS_COMMON: CoverField[] = [
  { key: 'title', label: '报告标题', required: true, placeholder: '请输入报告完整标题' },
  { key: 'subtitle', label: '副标题', required: false, defaultValue: '', placeholder: '可选副标题' },
  {
    key: 'organization', label: '编制单位', required: true,
    defaultValue: '', placeholder: '请输入编制单位名称',
  },
  {
    key: 'author', label: '报告作者', required: false,
    defaultValue: '', placeholder: '作者姓名',
  },
  {
    key: 'date', label: '报告日期', required: true,
    defaultValue: () => new Date().toLocaleDateString('zh-CN'),
    placeholder: '',
  },
];

/** 综合性咨询报告 */
export const TEMPLATE_COMPREHENSIVE: ReportTemplate = {
  id: 'comprehensive',
  name: '综合性咨询报告',
  icon: '📋',
  description: '适用于企业战略规划、行业研究、项目评估等综合类咨询场景',
  category: 'general',
  coverFields: COVER_FIELDS_COMMON,
  chapters: [
    {
      id: 'executive-summary', title: '执行摘要', level: 1, required: true,
      suggestedWords: 800, maxWords: 1500,
      placeholder: '简要概括报告的核心结论与建议，供决策者快速了解要点...',
      writingGuide: '用300-500字概述研究背景，400-600字列出3-5条核心发现和关键建议。语言精炼、数据明确。',
    },
    {
      id: 'background', title: '研究背景', level: 1, required: true,
      suggestedWords: 1500, maxWords: 2500,
      placeholder: '介绍研究的背景、目的、范围和方法论...',
      writingGuide: '包含：研究背景与动因（300字）→ 研究目标与问题定义（400字）→ 研究方法说明（400字）→ 数据来源说明（200字）。',
    },
    {
      id: 'market-overview', title: '市场概况', level: 1, required: true,
      suggestedWords: 2000, maxWords: 3500,
      placeholder: '分析市场规模、增长趋势、细分领域等...',
      writingGuide: '包含：市场规模与增速数据（500字）→ 市场驱动因素（500字）→ 细分领域分析（500字）→ 区域分布情况（300字）。',
    },
    {
      id: 'competitive-landscape', title: '竞争格局', level: 1, required: true,
      suggestedWords: 2000, maxWords: 3200,
      placeholder: '分析主要竞争者及其市场份额、竞争策略...',
      writingGuide: '包含：主要玩家画像（每个300-400字）→ 市场集中度分析（400字）→ 竞争态势矩阵/SWOT（500字）→ 趋势预判（300字）。',
    },
    {
      id: 'trend-analysis', title: '发展趋势', level: 1, required: true,
      suggestedWords: 1800, maxWords: 2800,
      placeholder: '分析行业未来3-5年的发展趋势...',
      writingGuide: '包含：技术趋势（500字）→ 政策导向影响（400字）→ 商业模式演变（400字）→ 关键时间节点预测（300字）。',
    },
    {
      id: 'risk-analysis', title: '风险与挑战', level: 1, required: false,
      suggestedWords: 1200, maxWords: 2000,
      placeholder: '识别并分析潜在风险因素...',
      writingGuide: '按风险等级分类（高/中/低），每项风险含：风险描述→ 影响程度→ 应对建议。',
    },
    {
      id: 'recommendations', title: '战略建议', level: 1, required: true,
      suggestedWords: 1500, maxWords: 2500,
      placeholder: '基于研究发现提出具体可行的战略建议...',
      writingGuide: '分短期（6个月内）、中期（1-2年）、长期（3-5年）三个维度，每维度2-3条具体建议，含预期效果说明。',
    },
    {
      id: 'conclusion', title: '结论与展望', level: 1, required: true,
      suggestedWords: 600, maxWords: 1000,
      placeholder: '总结全文核心观点，展望未来发展...',
      writingGuide: '简明总结核心发现（300字），提出对未来发展的展望（200字）。',
    },
  ],
  get totalSuggestedWords() {
    return this.chapters.reduce((sum, ch) => sum + ch.suggestedWords, 0);
  },
};

/** 政策研究报告 */
export const TEMPLATE_POLICY: ReportTemplate = {
  id: 'policy',
  name: '政策研究报告',
  icon: '📜',
  description: '适用于政策解读、政策影响评估、政策建议书等场景',
  category: 'policy',
  coverFields: COVER_FIELDS_COMMON,
  chapters: [
    {
      id: 'policy-summary', title: '摘要', level: 1, required: true,
      suggestedWords: 600, maxWords: 1000,
      placeholder: '政策核心要点的提炼性综述...',
      writingGuide: '包含：政策背景一句话概括 → 核心条款要点（3-5条）→ 主要影响预判 → 建议。',
    },
    {
      id: 'policy-background', title: '政策背景', level: 1, required: true,
      suggestedWords: 1200, maxWords: 2000,
      placeholder: '政策出台的时代背景、现实需求...',
      writingGuide: '从宏观环境（国际国内形势）→ 行业发展现状 → 存在的问题与挑战 → 政策出台必要性，层层递进。',
    },
    {
      id: 'policy-content', title: '政策内容解读', level: 1, required: true,
      suggestedWords: 2500, maxWords: 4000,
      placeholder: '逐条解读政策核心内容...',
      writingGuide: '按政策章节/条款逐一解读：原文引述 → 含义解释 → 与现行政策的对比 → 对相关方的影响。',
    },
    {
      id: 'impact-analysis', title: '影响分析', level: 1, required: true,
      suggestedWords: 2000, maxWords: 3200,
      placeholder: '分析政策对各利益相关方的具体影响...',
      writingGuide: '分类别分析：对政府机构的影响 → 对企业的影响 → 对个人的影响 → 对行业发展的影响。每类别含定量+定性分析。',
    },
    {
      id: 'case-study', title: '案例参考', level: 1, required: false,
      suggestedWords: 1500, maxWords: 2500,
      placeholder: '国内外类似政策的实施案例...',
      writingGuide: '选取2-3个典型案例：背景→ 实施过程→ 效果评估→ 可借鉴经验。案例应具有代表性。',
    },
    {
      id: 'policy-suggestions', title: '对策建议', level: 1, required: true,
      suggestedWords: 1500, maxWords: 2500,
      placeholder: '基于政策分析的针对性建议...',
      writingGuide: '面向不同对象（政府/企业/个人）分别提出建议。每条建议需具体可行、有操作路径。',
    },
    {
      id: 'policy-conclusion', title: '结语', level: 1, required: true,
      suggestedWords: 400, maxWords: 700,
      placeholder: '总结政策意义及未来走向判断...',
      writingGuide: '简洁收尾，点明政策的长期价值和可能的发展方向。',
    },
  ],
  get totalSuggestedWords() {
    return this.chapters.reduce((sum, ch) => sum + ch.suggestedWords, 0);
  },
};

/** 市场分析报告 */
export const TEMPLATE_MARKET: ReportTemplate = {
  id: 'market',
  name: '市场分析报告',
  icon: '📊',
  description: '适用于市场规模测算、竞品分析、用户调研等商业分析场景',
  category: 'business',
  coverFields: COVER_FIELDS_COMMON,
  chapters: [
    {
      id: 'market-definition', title: '市场界定', level: 1, required: true,
      suggestedWords: 800, maxWords: 1400,
      placeholder: '明确定义研究对象市场的边界和范围...',
      writingGuide: '包含：产品/服务定义 → 目标客群画像 → 地理范围 → 时间范围 → 相关术语定义。',
    },
    {
      id: 'market-size', title: '市场规模测算', level: 1, required: true,
      suggestedWords: 2000, maxWords: 3200,
      placeholder: '使用多种方法测算市场规模...',
      writingGuide: '采用TAM/SAM/SOM漏斗法或自上而下/自下而上交叉验证法。必须包含：方法论说明 → 计算过程 → 数据来源 → 不确定性说明。',
    },
    {
      id: 'user-analysis', title: '用户需求分析', level: 1, required: true,
      suggestedWords: 1800, maxWords: 2800,
      placeholder: '深度剖析目标用户的特征与需求...',
      writingGuide: '包含：用户画像（人口统计+行为特征+心理特征）→ 需求层次分析（Kano模型或马斯洛变体）→ 用户决策旅程地图 → 痛点清单排序。',
    },
    {
      id: 'competitor-analysis', title: '竞争对手分析', level: 1, required: true,
      suggestedWords: 2200, maxWords: 3500,
      placeholder: '系统分析主要竞争者...',
      writingGuide: '对每个主要竞品：公司概况 → 产品矩阵对比表 → 定价策略 → 渠道布局 → 优劣势SWOT。附竞品对比矩阵表。',
    },
    {
      id: 'industry-trends', title: '行业趋势洞察', level: 1, required: true,
      suggestedWords: 1600, maxWords: 2500,
      placeholder: '识别并分析行业的关键趋势...',
      writingGuide: '从技术演进、监管变化、消费行为变迁、产业链重组四个维度展开。每趋势含现状描述+未来3年预判+影响评估。',
    },
    {
      id: 'market-entry', title: '进入策略建议', level: 1, required: true,
      suggestedWords: 1500, maxWords: 2500,
      placeholder: '基于以上分析给出具体的进入策略...',
      writingGuide: '包含：目标市场选择 → 产品定位 → 定价策略建议 → 渠道策略 → Go-to-Market节奏规划（里程碑）。',
    },
    {
      id: 'market-appendix', title: '附录', level: 1, required: false,
      suggestedWords: 0, maxWords: 0,
      placeholder: '数据表格、调研问卷等补充材料...',
      writingGuide: '放置支撑性的原始数据、调研问卷样本、访谈记录摘录等。',
    },
  ],
  get totalSuggestedWords() {
    return this.chapters.reduce((sum, ch) => sum + ch.suggestedWords, 0);
  },
};

/** 投资尽调报告 */
export const TEMPLATE_DUE_DILIGENCE: ReportTemplate = {
  id: 'due-diligence',
  name: '投资尽调报告',
  icon: '🔍',
  description: '适用于股权投资、并购尽职调查、项目可行性评估等场景',
  category: 'finance',
  coverFields: [
    ...COVER_FIELDS_COMMON,
    { key: 'target-company', label: '标的企业', required: true, placeholder: '被尽调企业全称' },
    { key: 'investor', label: '投资方', required: true, placeholder: '投资机构名称' },
    { key: 'round', label: '融资轮次', required: false, placeholder: 'A轮/B轮等' },
  ],
  chapters: [
    {
      id: 'dd-executive-summary', title: '执行摘要', level: 1, required: true,
      suggestedWords: 1000, maxWords: 1600,
      placeholder: '尽调发现的精华浓缩，供投决会快速审阅...',
      writingGuide: '包含：标的概况（200字）→ 核心亮点3-5条（每条100字）→ 主要风险提示（300字）→ 尽调结论与建议（200字）。',
    },
    {
      id: 'company-overview', title: '标的公司概况', level: 1, required: true,
      suggestedWords: 1500, maxWords: 2400,
      placeholder: '企业的基本信息和发展历程...',
      writingGuide: '包含：工商基本信息 → 历史沿革 → 组织架构 → 核心团队介绍（创始人+高管履历）→ 股权结构图说明。',
    },
    {
      id: 'business-model', title: '商业模式分析', level: 1, required: true,
      suggestedWords: 1800, maxWords: 2800,
      placeholder: '深入分析企业的商业模式...',
      writingGuide: '画布式拆解：价值主张 → 客户细分 → 收入模式 → 成本结构 → 核心资源 → 关键活动 → 合作伙伴网络。每部分含现状评估+改进空间。',
    },
    {
      id: 'financial-analysis', title: '财务分析', level: 1, required: true,
      suggestedWords: 2000, maxWords: 3200,
      placeholder: '财务数据的深度分析与合理性验证...',
      writingGuide: '包含：近三年财务报表概览 → 盈利能力分析（毛利率/净利率/ROE/ROIC）→ 偿债能力分析 → 运营效率指标 → 现金流质量分析 → 财务预警信号排查。',
    },
    {
      id: 'legal-compliance', title: '法律合规审查', level: 1, required: true,
      suggestedWords: 1500, maxWords: 2400,
      placeholder: '法律风险的系统性排查...',
      writingGuide: '包含：股权权属清晰度 → 知识产权状况 → 重大合同审查 → 劳动用工合规 → 诉讼仲裁历史 → 监管资质完备性。',
    },
    {
      id: 'dd-risks', title: '风险评估', level: 1, required: true,
      suggestedWords: 1500, maxWords: 2400,
      placeholder: '汇总所有已识别风险并进行评级...',
      writingGuide: '风险矩阵格式：风险类别 → 具体描述 → 发生概率(P) → 影响程度(I) → P×I评分 → 应对措施 → 责任人建议。按评分降序排列。',
    },
    {
      id: 'valuation', title: '估值分析', level: 1, required: true,
      suggestedWords: 1500, maxWords: 2400,
      placeholder: '多方法估值与投资回报测算...',
      writingGuide: '至少两种估值方法（DCF + 可比公司法），给出估值区间。含：假设条件敏感性分析 → 投资回报测算（IRR/MOIC）→ 退出路径分析。',
    },
    {
      id: 'dd-recommendation', title: '尽调结论与建议', level: 1, required: true,
      suggestedWords: 800, maxWords: 1400,
      placeholder: '最终的投资决策建议...',
      writingGuide: '明确给出：通过/有条件通过/否决的建议 → 核心交易条款建议（价格区间/对赌条款/回购条款）→ 尽职调查后待落实事项清单。',
    },
  ],
  get totalSuggestedWords() {
    return this.chapters.reduce((sum, ch) => sum + ch.suggestedWords, 0);
  },
};

/** 所有可用模板 */
export const REPORT_TEMPLATES: Record<string, ReportTemplate> = {
  comprehensive: TEMPLATE_COMPREHENSIVE,
  policy: TEMPLATE_POLICY,
  market: TEMPLATE_MARKET,
  'due-diligence': TEMPLATE_DUE_DILIGENCE,
};

export function getTemplate(id: string): ReportTemplate | undefined {
  return REPORT_TEMPLATES[id];
}
