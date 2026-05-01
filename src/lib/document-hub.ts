'use client';

export type KnowledgeDocumentType = 'manual' | 'policy' | 'template' | 'research';

export interface KnowledgeDocument {
  id: string;
  title: string;
  type: KnowledgeDocumentType;
  content: string;
  source?: string;
  parentId?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'zhiyan-document-hub';

const now = () => new Date().toISOString();

const seedDocuments: KnowledgeDocument[] = [
  {
    id: 'seed-root-manual',
    title: '上手手册',
    type: 'manual',
    source: '种子文档',
    parentId: null,
    tags: ['入门', '工作台', '知识库'],
    content: [
      '# AI 办公助手上手手册',
      '',
      '## 工作台',
      '- 选择一个咨询场景，例如报告写作、会议纪要、研究分析。',
      '- 挂载左侧知识库中的文档后，系统会把文档正文拼入提示词上下文。',
      '- 生成结果会进入历史记录，可随时复用回工作台。',
      '',
      '## 知识库',
      '- 采用文档树组织手册、模板、政策摘要、研究笔记。',
      '- 支持在线 Markdown 编辑与预览切换。',
      '- 已有文档可以直接修改，适合持续沉淀团队方法论。',
      '',
      '## AI 连接',
      '- 支持 Base URL、API Key、Model 三元配置。',
      '- 支持官方服务、兼容 OpenAI 的代理网关、私有中转。 ',
    ].join('\n'),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'seed-root-templates',
    title: '模板中心',
    type: 'template',
    source: '种子文档',
    parentId: null,
    tags: ['模板'],
    content: '# 模板中心\n\n这里收纳咨询交付模板、研究摘要模板和常用提示词。',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'seed-report-template',
    title: '咨询周报模板',
    type: 'template',
    source: '模板中心',
    parentId: 'seed-root-templates',
    tags: ['周报', '模板'],
    content: [
      '# 咨询周报模板',
      '',
      '## 本周结论',
      '- 用三条结论概括项目进展。',
      '',
      '## 风险与阻塞',
      '- 说明风险来源、影响和建议动作。',
      '',
      '## 下周行动',
      '- 每一项需要明确责任人与截止时间。',
    ].join('\n'),
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'seed-policy-note',
    title: '政策研究摘要结构',
    type: 'policy',
    source: '种子文档',
    parentId: null,
    tags: ['政策', '研究'],
    content: [
      '# 政策研究摘要结构',
      '',
      '1. 政策背景',
      '2. 核心条款',
      '3. 对行业和客户的影响',
      '4. 落地时间与实施边界',
      '5. 机会判断与建议动作',
    ].join('\n'),
    createdAt: now(),
    updatedAt: now(),
  },
];

export interface DocumentTreeNode extends KnowledgeDocument {
  children: DocumentTreeNode[];
}

function ensureSeedDocuments() {
  if (typeof window === 'undefined') return seedDocuments;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedDocuments));
    return seedDocuments;
  }

  try {
    const parsed = JSON.parse(raw) as KnowledgeDocument[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedDocuments));
      return seedDocuments;
    }
    return parsed;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedDocuments));
    return seedDocuments;
  }
}

export function getKnowledgeDocuments(): KnowledgeDocument[] {
  if (typeof window === 'undefined') return seedDocuments;
  return ensureSeedDocuments();
}

export function getKnowledgeDocumentTree(): DocumentTreeNode[] {
  const documents = getKnowledgeDocuments();
  const map = new Map<string, DocumentTreeNode>();

  for (const document of documents) {
    map.set(document.id, { ...document, children: [] });
  }

  const roots: DocumentTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: DocumentTreeNode[]) => {
    nodes.sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
}

export function saveKnowledgeDocument(
  document: Omit<KnowledgeDocument, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
) {
  const documents = getKnowledgeDocuments();
  const timestamp = now();
  const existing = document.id ? documents.find((item) => item.id === document.id) : undefined;

  const nextDocument: KnowledgeDocument = {
    id: document.id || `doc-${Date.now()}`,
    title: document.title.trim(),
    type: document.type,
    content: document.content,
    source: document.source?.trim() || '',
    parentId: document.parentId ?? null,
    tags: document.tags,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  const nextDocuments = existing
    ? documents.map((item) => (item.id === nextDocument.id ? nextDocument : item))
    : [nextDocument, ...documents];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDocuments));
  return nextDocument;
}

export function createEmptyKnowledgeDocument(parentId?: string | null) {
  return saveKnowledgeDocument({
    title: '未命名文档',
    type: 'manual',
    source: '在线新建',
    parentId: parentId ?? null,
    tags: [],
    content: '# 未命名文档\n\n开始编写内容。',
  });
}

export function deleteKnowledgeDocument(id: string) {
  const documents = getKnowledgeDocuments();
  const descendantIds = new Set<string>([id]);

  let changed = true;
  while (changed) {
    changed = false;
    for (const document of documents) {
      if (document.parentId && descendantIds.has(document.parentId) && !descendantIds.has(document.id)) {
        descendantIds.add(document.id);
        changed = true;
      }
    }
  }

  const nextDocuments = documents.filter((item) => !descendantIds.has(item.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDocuments));
}
