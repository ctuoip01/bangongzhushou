import PptxGenJS from 'pptxgenjs';
import type { Slide as SlideType, PptOutline, PptStyle, SlideLayout } from '@/types';

// ========== 风格配置系统 ==========
interface StyleConfig {
  name: string;
  themeColor: string;
  titleFont: string;
  bodyFont: string;
  bgColor: string;
  accentColors: string[];
  slideMasterOptions: {
    title: string;
    background?: { color: string };
    [key: string]: unknown;
  };
}

const STYLE_CONFIGS: Record<PptStyle, StyleConfig> = {
  academic: {
    name: '学术专业',
    themeColor: '1E40AF',        // 深蓝
    titleFont: 'SimHei',         // 黑体
    bodyFont: 'Microsoft YaHei', // 微软雅黑
    bgColor: 'F0F9FF',
    accentColors: ['1E40AF', '3B82F6', '60A5FA', 'DBEAFE'],
    slideMasterOptions: {
      title: 'Academic Professional',
      background: { color: 'FFFFFF' },
    },
  },
  formal: {
    name: '正式商务',
    themeColor: '334155',        // 深灰蓝
    titleFont: 'SimHei',
    bodyFont: 'Microsoft YaHei',
    bgColor: 'F8FAFC',
    accentColors: ['334155', '475569', '64748B', 'E2E8F0'],
    slideMasterOptions: {
      title: 'Formal Business',
      background: { color: 'FFFFFF' },
    },
  },
  creative: {
    name: '创意活力',
    themeColor: '7C3AED',        // 紫色
    titleFont: 'Microsoft YaHei',
    bodyFont: 'Microsoft YaHei',
    bgColor: 'FAF5FF',
    accentColors: ['7C3AED', 'A78BFA', 'C4B5FD', 'EDE9FE'],
    slideMasterOptions: {
      title: 'Creative Dynamic',
      background: { color: 'FFFFFF' },
    },
  },
};

// ========== 布局渲染器 ==========
function renderTitleSlide(pptx: PptxGenJS, slide: SlideType, style: StyleConfig): void {
  const ps = pptx.addSlide();
  ps.background = { color: style.themeColor };
  ps.addText(slide.title || '', {
    x: 0.5, y: 2.2, w: '90%', h: 1.5,
    fontSize: 36, fontFace: style.titleFont, bold: true,
    color: 'FFFFFF', align: 'center', valign: 'middle',
  });
  if (slide.content.length > 0) {
    ps.addText(slide.content.join('   |   '), {
      x: 0.5, y: 4.0, w: '90%', h: 0.6,
      fontSize: 14, fontFace: style.bodyFont,
      color: 'FFFFFF', align: 'center', transparency: 30,
    });
  }
  if (slide.notes) {
    ps.addNotes(slide.notes);
  }
}

function renderContentSlide(pptx: PptxGenJS, slide: SlideType, style: StyleConfig): void {
  const ps = pptx.addSlide();
  ps.background = { color: 'FFFFFF' };

  // 标题栏背景条
  ps.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 1.0,
    fill: { color: style.themeColor },
  });

  // 标题文字
  ps.addText(slide.title || '', {
    x: 0.6, y: 0.15, w: '88%', h: 0.7,
    fontSize: 22, fontFace: style.titleFont, bold: true,
    color: 'FFFFFF', valign: 'middle',
  });

  // 内容要点列表
  if (slide.content.length > 0) {
    const bulletPoints = slide.content.map((text) => ({
      text: `{${text}}`,
      options: { bullet: { type: 'bullet', color: style.accentColors[0] }, paraSpaceBefore: 8, paraSpaceAfter: 4 } as Record<string, unknown>,
    }));

    ps.addText(bulletPoints as PptxGenJS.TextProps[], {
      x: 0.8, y: 1.4, w: '82%', h: 4.0,
      fontSize: 15, fontFace: style.bodyFont,
      color: '374151', lineSpacingMultiple: 1.4,
    });
  }

  // 底部装饰线
  ps.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 6.8, w: 2.0, h: 0.05,
    fill: { color: style.accentColors[1] },
  });

  // 页码
  ps.addText(String(slide.page), {
    x: '92%', y: 6.85, w: 0.5, h: 0.3,
    fontSize: 10, fontFace: style.bodyFont, color: '9CA3AF', align: 'right',
  });

  if (slide.notes) ps.addNotes(slide.notes);
}

function renderTwoColumnSlide(pptx: PptxGenJS, slide: SlideType, style: StyleConfig): void {
  const ps = pptx.addSlide();
  ps.background = { color: 'FFFFFF' };

  // 标题栏
  ps.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 1.0,
    fill: { color: style.themeColor },
  });
  ps.addText(slide.title || '', {
    x: 0.6, y: 0.15, w: '88%', h: 0.7,
    fontSize: 22, fontFace: style.titleFont, bold: true,
    color: 'FFFFFF', valign: 'middle',
  });

  // 双栏分割线
  ps.addShape(pptx.ShapeType.line, {
    x: 5.0, y: 1.3, w: 0, h: 5.3,
    line: { color: 'E5E7EB', width: 1 },
  });

  // 左右分列内容
  const midPoint = Math.ceil(slide.content.length / 2);
  const leftContent = slide.content.slice(0, midPoint);
  const rightContent = slide.content.slice(midPoint);

  const makeColumnItems = (items: string[]) =>
    items.map((text) => ({
      text: `{${text}}`,
      options: { bullet: { type: 'bullet', color: style.accentColors[0] }, paraSpaceBefore: 8 } as Record<string, unknown>,
    }));

  if (leftContent.length > 0) {
    ps.addText(makeColumnItems(leftContent) as PptxGenJS.TextProps[], {
      x: 0.5, y: 1.4, w: 4.2, h: 5.0,
      fontSize: 13, fontFace: style.bodyFont, color: '374151', lineSpacingMultiple: 1.35,
    });
  }

  if (rightContent.length > 0) {
    ps.addText(makeColumnItems(rightContent) as PptxGenJS.TextProps[], {
      x: 5.3, y: 1.4, w: 4.2, h: 5.0,
      fontSize: 13, fontFace: style.bodyFont, color: '374151', lineSpacingMultiple: 1.35,
    });
  }

  ps.addText(String(slide.page), {
    x: '92%', y: 6.85, w: 0.5, h: 0.3,
    fontSize: 10, fontFace: style.bodyFont, color: '9CA3AF', align: 'right',
  });

  if (slide.notes) ps.addNotes(slide.notes);
}

function renderChartSlide(pptx: PptxGenJS, slide: SlideType, style: StyleConfig): void {
  const ps = pptx.addSlide();
  ps.background = { color: 'FFFFFF' };

  // 标题栏
  ps.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 1.0,
    fill: { color: style.themeColor },
  });
  ps.addText(slide.title || '', {
    x: 0.6, y: 0.15, w: '88%', h: 0.7,
    fontSize: 22, fontFace: style.titleFont, bold: true,
    color: 'FFFFFF', valign: 'middle',
  });

  // 图表占位区域（提示用户手动插入图表）
  ps.addShape(pptx.ShapeType.roundRect, {
    x: 1.0, y: 1.8, w: 8.0, h: 4.2,
    fill: { color: style.bgColor }, line: { color: style.accentColors[2], width: 1, dashType: 'dash' },
    rectRadius: 0.15,
  });
  ps.addText(`📊 ${slide.content.join('\\n') || '[在此处插入图表]'}`, {
    x: 1.3, y: 3.2, w: 7.4, h: 1.5,
    fontSize: 14, fontFace: style.bodyFont, color: '6B7280', align: 'center', valign: 'middle',
  });

  ps.addText(String(slide.page), {
    x: '92%', y: 6.85, w: 0.5, h: 0.3,
    fontSize: 10, fontFace: style.bodyFont, color: '9CA3AF', align: 'right',
  });

  if (slide.notes) ps.addNotes(slide.notes);
}

function renderClosingSlide(pptx: PptxGenJS, slide: SlideType, style: StyleConfig): void {
  const ps = pptx.addSlide();

  // 渐变效果模拟：用深色背景
  ps.background = { color: style.themeColor };

  ps.addText(slide.title || '谢谢', {
    x: 0.5, y: 2.3, w: '90%', h: 1.2,
    fontSize: 40, fontFace: style.titleFont, bold: true,
    color: 'FFFFFF', align: 'center', valign: 'middle',
  });

  if (slide.content.length > 0) {
    ps.addText(slide.content.join('\\n'), {
      x: 0.5, y: 3.8, w: '90%', h: 1.0,
      fontSize: 16, fontFace: style.bodyFont,
      color: 'FFFFFF', align: 'center', transparency: 25,
    });
  }

  if (slide.notes) ps.addNotes(slide.notes);
}

// ========== 布局分发 ==========
const RENDERERS: Record<SlideLayout, typeof renderContentSlide> = {
  title: renderTitleSlide,
  content: renderContentSlide,
  'two-column': renderTwoColumnSlide,
  chart: renderChartSlide,
  closing: renderClosingSlide,
};

// ========== 主入口：构建 PPTX ==========
export async function buildPptx(outline: PptOutline, style: PptStyle): Promise<Buffer> {
  const config = STYLE_CONFIGS[style] || STYLE_CONFIGS.academic;

  const pptx = new PptxGenJS();

  // 演示文稿级配置
  pptx.defineLayout({ name: 'CUSTOM_WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'CUSTOM_WIDE'; // 16:9 宽屏比例
  pptx.author = '智研助手';
  pptx.subject = outline.title || '演示文稿';

  // 逐页渲染
  for (const slide of outline.slides) {
    const renderer = RENDERERS[slide.layout] || renderContentSlide;
    renderer(pptx, slide, config);
  }

  return await pptx.write({ outputType: 'arraybuffer' }) as Buffer;
}

// 导出风格信息供前端使用
export { STYLE_CONFIGS, type StyleConfig };
