/**
 * 政策文件定向数据源 v4 — 精确内容提取引擎
 *
 * 核心改进（解决"只返回主页链接"问题）：
 *   ① 为每个源配置 urlFilter 正则 — 只保留真正的政策文档/文章链接
 *   ② 内容区域定位 — 先找到列表容器再从中提取，不扫全页面导航
 *   ③ 三层过滤链：URL特征 → 标题质量 → 关键词相关度
 *
 * 数据源分类：
 *   ┌─ national (全国性) ── 国务院 / 工信部 / 财政部 / 发改委 ...
 *   ├─ shanghai (上海市) ── 市府 / 委办局 / 16区 / 科创园区
 *   └─ industry (行业研究) ── 券商研报 / 智库机构 / 行业协会 / 专业媒体
 */

import type { SearchResultItem, SearchResponse } from './ai-client';

// ════════════════════════════════════════════════════
//  类型定义
// ════════════════════════════════════════════════════

export type PolicyRegion = 'national' | 'shanghai' | 'industry';

export interface PolicySource {
  name: string;
  url: string;
  domain: string;
  authLevel: number;
  region: PolicyRegion;
  /** URL 必须匹配此模式才算有效条目（政策文档/文章链接） */
  urlFilter?: string | null;
  /** URL 必须排除此模式（如 index.html 首页、导航链接） */
  urlExclude?: string;
}

export interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  source: string;
  authLevel: number;
  region: PolicyRegion;
}

// ════════════════════════════════════════════════════
//  全国性数据源
// ════════════════════════════════════════════════════

const NATIONAL_SOURCES: PolicySource[] = [
  {
    name: '国务院政策文件库',
    url: 'https://www.gov.cn/zhengce/zuixin/index.htm',
    domain: 'www.gov.cn',
    authLevel: 4,
    region: 'national',
    // 国务院的政策文件链接格式：/zhengce/content/2024-12/xx/xxxx.htm
    urlFilter: '/zhengce/content/',
    urlExclude: '/zhengce/(zuixin|fabu|index)',
  },
  {
    name: '工业和信息化部',
    url: 'https://www.miit.gov.cn/xwdt/gxdt/sjdt/index.html',
    domain: 'www.miit.gov.cn',
    authLevel: 4,
    region: 'national',
    urlFilter: '/(art|jgs|zt)/\\d{4}/t',
  },
  {
    name: '财政部',
    url: 'https://www.mof.gov.cn/zhengwuxinxi/caizhengwengao/gaikuang/index.htm',
    domain: 'www.mof.gov.cn',
    authLevel: 4,
    region: 'national',
    urlFilter: '/zhengwuxinxi/caizhengwengao/',
  },
  {
    name: '国家发展改革委',
    url: 'https://www.ndrc.gov.cn/xwdt/tzgg/index.html',
    domain: 'www.ndrc.gov.cn',
    authLevel: 4,
    region: 'national',
    urlFilter: '/xwdt/tzgg/|/fggz/zcfb/|/xxgk/zcfb/',
  },
  {
    name: '中国人民银行',
    url: 'http://www.pbc.gov.cn/goutongjiaoliu/113456/113469/index.html',
    domain: 'www.pbc.gov.cn',
    authLevel: 4,
    region: 'national',
    urlFilter: '/goutongjiaoliu/113456/\\d+/',
  },
  {
    name: '国家网信办',
    url: 'https://www.cac.gov.cn/',
    domain: 'www.cac.gov.cn',
    authLevel: 4,
    region: 'national',
    urlFilter: '/\\d{4}-\\d{2}/\\d{2}/c_\\d+\\.htm',
  },
  {
    name: '科学技术部',
    url: 'https://www.most.gov.cn/kjbgz/index.html',
    domain: 'www.most.gov.cn',
    authLevel: 4,
    region: 'national',
    urlFilter: '/kjbgz/\\d{4}/|/xxgk/xinxifenlei/fdzdgknr/fgzc/gfxwj/',
  },
  {
    name: '人力资源社会保障部',
    url: 'http://www.mohrss.gov.cn/Syrlzyhshbzb/dongtaixinwen/shizhengyaowen/',
    domain: 'www.mohrss.gov.cn',
    authLevel: 4,
    region: 'national',
    urlFilter: '/Syrlzyhshbzb/dongtaixinwen/',
  },
];

// ════════════════════════════════════════════════════
//  上海地区数据源
// ════════════════════════════════════════════════════

const SHANGHAI_SOURCES: PolicySource[] = [
  // ── 上海市府 & 综合门户 ──
  {
    name: '上海市人民政府',
    url: 'https://www.shanghai.gov.cn/nw2/nw2314/nw2315/nw4426/u21aw19898.html', // 最新文件
    domain: 'www.shanghai.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '\\.gov\\.cn/nw\\d+/nw\\d+/nw\\d+/u\\d+aw\\d+\\.html',
    urlExclude: 'index\\.html$',
  },
  {
    name: '上海市人民政府公报',
    url: 'https://www.shanghai.gov.cn/nw2/nw2314/nw2315/nw4427/u21aw19900.html',
    domain: 'www.shanghai.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/u21aw1990\\d+\\.html',
  },

  // ── 市委办局（每个都指向具体的政策发布列表页） ──
  {
    name: '上海市发改委',
    url: 'https://fgw.sh.gov.cn/zcwj_50300/index.html',
    domain: 'fgw.sh.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/zcwj_50300/\\d{8}/t\\d+_\\d+\\.html',
  },
  {
    name: '上海市经信委',
    url: 'https://sheitc.sh.gov.cn/xwdt_67303/tzgg_67304/index.html', // 通知公告
    domain: 'sheitc.sh.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/tzgg_67304/\\d{8}/t\\d+_\\d+\\.html|/xwdt_67303/\\d{8}/t\\d+_\\d+\\.html',
  },
  {
    name: '上海市科委',
    url: 'https://stcsm.sh.gov.cn/zwgk/kxjjh/tzgg/index.html',
    domain: 'stcsm.sh.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/kxjjh/tzgg/|/zwgk/tzgg/',
  },
  {
    name: '上海市财政局',
    url: 'https://czj.sh.gov.cn/cmsres/cz_zcfg/index.html', // 政策法规
    domain: 'czj.sh.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/cz_zcfg/\\d+/\\d+/t\\d+_[^/]+\\.html',
  },
  {
    name: '上海市人社局',
    url: 'https://rsj.sh.gov.cn/tzxx_17338/tzgg_17339/index.html',
    domain: 'rsj.sh.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/tzgg_17339/\\d{8}/t\\d+_[^/]+\\.html',
  },
  {
    name: '上海市市场监管局',
    url: 'https://scjgj.sh.gov.cn/govt_portal/article/list?siteId=7&nodeCode=100001',
    domain: 'scjgj.sh.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: 'articleId=\\d+',
  },
  {
    name: '上海市税务局',
    url: 'https://shanghai.chinatax.gov.cn/zcfg/index.html',
    domain: 'shanghai.chinatax.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/zcfg/\\d+/\\d+_[^/]+\\.html',
  },
  {
    name: '上海市地方金融监管局',
    url: 'https://jrjg.sh.gov.cn/govt_portal/article/list?siteId=9&nodeCode=100001',
    domain: 'jrjg.sh.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: 'articleId=\\d+',
  },
  {
    name: '上海市数据局',
    url: 'https://szj.sh.gov.cn/jgcz/jgcsz/szzc/index.html',
    domain: 'szj.sh.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/szzc/\\d{8}/t\\d+_[^/]+\\.html|/jgcz/[^/]+/\\d{8}/t\\d+',
  },

  // ── 区级政府（16个区 — 指向政务公开/通知公告列表页） ──
  {
    name: '浦东新区政府',
    url: 'https://www.pudong.gov.cn/sygk_20101/qzfc_20106/index.html',
    domain: 'www.pudong.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/qzfc_20106/\\d{4}\\d{2}\\d{2}/[a-z]\\d{8}_\\d+\\.html',
  },
  {
    name: '黄浦区政府',
    url: 'https://www.huangpu.gov.cn/zwgk/zfxxgkml/zcjd/index.html',
    domain: 'www.huangpu.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/zfxxgkml/\\d{8}/t\\d+_[^/]+\\.html',
  },
  {
    name: '徐汇区政府',
    url: 'https://www.xuhui.gov.cn/xhqzf_gk/zcjd/index.html',
    domain: 'www.xuhui.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/zcjd/\\d{8}/t\\d+_[^/]+\\.html',
  },
  {
    name: '长宁区政府',
    url: 'https://www.shcn.gov.cn/gov_zfxxgk/zfxxgkzn_jg_zn_jg_zc/index.html',
    domain: 'www.shcn.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/cn_gov_info/\\d+/\\d+/',
  },
  {
    name: '静安区政府',
    url: 'https://www.jingan.gov.cn/channel/002001?category=100001',
    domain: 'www.jingan.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/channel/002001/detail\\?articleId=\\d+',
  },
  {
    name: '普陀区政府',
    url: 'https://www.shpt.gov.cn/gongkai/zcjd/index.html',
    domain: 'www.shpt.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/gongkai/zcjd/\\d{4}\\d{2}\\d{2}/\\w+_[^/]+\\.html',
  },
  {
    name: '虹口区政府',
    url: 'https://www.hongkou.gov.cn/zwgk/zcjd/index.html',
    domain: 'www.hongkou.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/zwgk/zcjd/\\d{4}\\d{2}\\d{2}/\\w+_[^/]+\\.html',
  },
  {
    name: '杨浦区政府',
    url: 'https://www.yp.gov.cn/zwgk/Tzgg/index.html',
    domain: 'www.yp.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/Tzgg/\\d{4}\\d{2}\\d{2}/[a-z]\\d+_[^/]+\\.html',
  },
  {
    name: '闵行区政府',
    url: 'https://www.minhang.gov.cn/mhqywzxgk/tzgg/index.html',
    domain: 'www.minhang.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/tzgg/\\d{4}\\d{2}\\d{2}/[a-z]\\d+_[^/]+\\.html',
  },
  {
    name: '宝山区政府',
    url: 'https://www.bs.sh.gov.cn/shbs/gkml/zcjd/index.html',
    domain: 'www.bs.sh.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/gkml/zcjd/\\d{4}\\d{2}\\d{2}/\\w+_[^/]+\\.html',
  },
  {
    name: '嘉定区政府',
    url: 'https://www.jiading.gov.cn/public_info/zcjd/index.html',
    domain: 'www.jiading.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/public_info/zcjd/\\d{4}\\d{2}\\d{2}/[a-z]\\d+_[^/]+\\.html',
  },
  {
    name: '松江区政府',
    url: 'https://www.songjiang.gov.cn/zjsongjiang/zcjd/index.html',
    domain: 'www.songjiang.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/zcjd/\\d{4}\\d{2}\\d{2}/\\w+_[^/]+\\.html',
  },
  {
    name: '青浦区政府',
    url: 'https://www.shqp.gov.cn/gov_info/zcjd/index.html',
    domain: 'www.shqp.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/gov_info/zcjd/\\d{4}\\d{2}\\d{2}/[a-z]\\d+_[^/]+\\.html',
  },
  {
    name: '奉贤区政府',
    url: 'https://www.fengxian.gov.cn/fxqxrmzf/gkfx/zcjd/index.html',
    domain: 'www.fengxian.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/gkfx/zcjd/\\d{4}\\d{2}\\d{2}/[a-z]\\d+_[^/]+\\.html',
  },
  {
    name: '金山区政府',
    url: 'https://www.jinshan.gov.cn/jsqrmzf_jszfwj_20240/channel/202101',
    domain: 'www.jinshan.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/jsqrmzf_jszfwj_20240/channel/\\d+/detail/\\d+',
  },
  {
    name: '崇明区政府',
    url: 'https://www.shcm.gov.cn/cm_qzfmzx_gkzl/zcjd/index.html',
    domain: 'www.shcm.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '_gkzl/zcjd/\\d{4}\\d{2}\\d{2}/[a-z]\\d+_[^/]+\\.html',
  },

  // ── 科创园区 & 功能区 ──
  {
    name: '上海自贸试验区',
    url: 'https://ftz.sh.gov.cn/wzgf_16194/wzgg_16195/index.html',
    domain: 'ftz.sh.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/wzgg_16195/\\d{8}/t\\d+_[^/]+\\.html',
  },
  {
    name: '临港新片区管委会',
    url: 'https://lgxcq.sh.gov.cn/lgzc_16198/lgzcgg_16199/index.html',
    domain: 'lgxcq.sh.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/lgzcgg_16199/\\d{8}/t\\d+_[^/]+\\.html',
  },
  {
    name: '张江高科技园区',
    url: 'https://www.zjpark.com.cn/news/zcfg/index.html', // 政策法规
    domain: 'www.zjpark.com.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/news/zcfg/\\d{4}/\\d+\\.html',
  },
  {
    name: '虹桥国际中央商务区',
    url: 'https://www.shmh.gov.cn/shmh/hqswq_16208/hqswqgg_16209/index.html',
    domain: 'www.shmh.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/hqswqgg_16209/\\d{8}/t\\d+_[^/]+\\.html',
  },
  {
    name: '长三角生态绿色一体化发展示范区',
    url: 'https://www.shhuadong.com/sfq/zcfg/index.html',
    domain: 'www.shhuadong.com',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/sfq/zcfg/\\d+/\\d+\\.html',
  },
  {
    name: '紫竹高新区',
    url: 'https://www.zizhupark.com/news/policy/index.html',
    domain: 'www.zizhupark.com',
    authLevel: 3,
    region: 'shanghai',
    urlFilter: '/news/policy/\\d+\\.html',
  },
  {
    name: '漕河泾开发区',
    url: 'https://www.caohejing.com/news/policy/index.html',
    domain: 'www.caohejing.com',
    authLevel: 3,
    region: 'shanghai',
    urlFilter: '/news/policy/\\d+\\.html',
  },

  // ── 专业交易所 ──
  {
    name: '上海证券交易所 (监管动态)',
    url: 'https://www.sse.com.cn/aboutus/mediacenter/hotandd/',
    domain: 'www.sse.com.cn',
    authLevel: 4,
    region: 'shanghai',
    urlFilter: '/aboutus/mediacenter/hotandd/c/c_\\d+\\.shtml',
  },
  {
    name: '上海数据交易所',
    url: 'https://www.data-shanghai.gov.cn/data/home.html',
    domain: 'www.data-shanghai.gov.cn',
    authLevel: 4,
    region: 'shanghai',
    // 数据交易所结构不确定，不做严格过滤
    urlFilter: null,
  },
];

// ════════════════════════════════════════════════════
//  行业研究与专业咨询数据源
//
//  解决"只有政府政策文件，缺少行业专业信息"的问题：
//    - 券商研报平台（东方财富/同花顺/慧博等）
//    - 专业智库/研究机构（中科院/社科院/高校研究院）
//    - 行业协会（各行业官方协会）
//    - 财经专业媒体（研究报告板块）
// ════════════════════════════════════════════════════

const INDUSTRY_SOURCES: PolicySource[] = [
  // ════════════════════════════════════════════════════
  //  行业研究与专业咨询数据源 v2
  //
  //  设计原则：
  //    ① 只保留服务端 fetch 能获取到静态 HTML 内容的站点
  //    ② 移除 SPA/登录墙/动态渲染网站（搜索引擎可以索引它们）
  //    ③ 以政府研究机构 + 权威行业协会为主
  //
  //  券商/媒体/咨询类专业内容 → 通过搜索引擎增强查询获取
  // ════════════════════════════════════════════════════

  // ── 国家级研究智库（静态 HTML，权威高）──
  {
    name: '国务院发展研究中心·研究报告',
    url: 'http://www.drc.gov.cn/xsyzc/index.htm',
    domain: 'drc.gov.cn',
    authLevel: 4,
    region: 'industry',
    urlFilter: '/xsyzc/\\d{4}/|/xshd/',
  },
  {
    name: '中国社会科学院·研究成果',
    url: 'https://www.cass.org.cn/xsyj1/yjbg/index.shtml',
    domain: 'cass.org.cn',
    authLevel: 4,
    region: 'industry',
    urlFilter: '/xsyj1/yjbg/|/docs/',
  },
  {
    name: '中国科学院·科研成果',
    url: 'https://www.cas.cn/ky/kycc/',
    domain: 'cas.cn',
    authLevel: 4,
    region: 'industry',
    urlFilter: '/ky/kycc/|/sym/',
  },
  {
    name: '中国信通院（CAICT）·白皮书',
    url: 'https://www.caict.ac.cn/kxyj/qwfb/bps/',
    domain: 'caict.ac.cn',
    authLevel: 4,
    region: 'industry',
    urlFilter: '/kxyj/qwfb/bps/|/kxyj/qwfb/ztgz/',
  },
  {
    name: '国家信息中心·信息化研究',
    url: 'https://www.sic.gov.cn/News/83/',
    domain: 'sic.gov.cn',
    authLevel: 4,
    region: 'industry',
    urlFilter: '/News/83/|/News/82/',
  },
  {
    name: '中国宏观经济研究院·学术成果',
    url: 'http://www.amr.org.cn/xszz/index.htm',
    domain: 'amr.gov.cn',
    authLevel: 4,
    region: 'industry',
    urlFilter: '/xszz/|/kycg/',
  },

  // ── 部委下属研究机构 ──
  {
    name: '赛迪研究院（工信部）·产业研究',
    url: 'https://www.ccidgroup.com/news/',
    domain: 'ccidgroup.com',
    authLevel: 3,
    region: 'industry',
    urlFilter: '/news/\\d{4}/|/reports/|/bg/',
  },

  // ── 行业协会（官方，静态 HTML）──
  {
    name: '中国互联网协会·行业动态',
    url: 'https://www.isc.org.cn/hyfw/xhdt/',
    domain: 'isc.org.cn',
    authLevel: 3,
    region: 'industry',
    urlFilter: '/hyfw/xhdt/|/hyfw/qg/',
  },
  {
    name: '中国软件行业协会·行业资讯',
    url: 'https://www.csia.org.cn/hydt/index.html',
    domain: 'csia.org.cn',
    authLevel: 3,
    region: 'industry',
    urlFilter: '/hydt/|/hyxw/',
  },
  {
    name: '中国半导体行业协会·新闻',
    url: 'https://www.csia.net.cn/News/',
    domain: 'csia.net.cn',
    authLevel: 3,
    region: 'industry',
    urlFilter: '/News/\\d{4}/',
  },
  {
    name: '中国银行业协会·动态',
    url: 'https://banking.org.cn/xhdt/',
    domain: 'banking.org.cn',
    authLevel: 3,
    region: 'industry',
    urlFilter: '/xhdt/|/hyxw/',
  },
  {
    name: '中国证券业协会·信息',
    url: 'https://www.sac.net.cn/hyfw/hyxw/',
    domain: 'sac.net.cn',
    authLevel: 3,
    region: 'industry',
    urlFilter: '/hyfw/hyxw/|/lgzn/',
  },
  {
    name: '中国证券投资基金业协会·动态',
    url: 'https://www.amac.org.cn/businessstatistics/xhdt/',
    domain: 'amac.org.cn',
    authLevel: 3,
    region: 'industry',
    urlFilter: '/businessstatistics/|/informationpublic/',
  },
  {
    name: '中国物流与采购联合会·物流资讯',
    url: 'https://www.chinawuliu.com.cn/zyf/wlzxw/',
    domain: 'chinawuliu.com.cn',
    authLevel: 3,
    region: 'industry',
    urlFilter: '/zyf/wlzxw/|/zfgg/',
  },
];

const POLICY_SOURCES: PolicySource[] = [...NATIONAL_SOURCES, ...SHANGHAI_SOURCES, ...INDUSTRY_SOURCES];

// ════════════════════════════════════════════════════
//  精确内容解析引擎 v3
//
//  三层过滤链：
//    第1层：内容区域定位（从 HTML 中找到列表容器）
//    第2层：URL 特征过滤（只保留政策文档类 URL）
//    第3层：标题质量过滤（排除导航/按钮/垃圾文本）
// ════════════════════════════════════════════════════

/** 无效标题词表（导航、功能按钮等） */
const JUNK_TITLE_RE = /^(首页|返回|下载|更多|上一页|下一页|登录|注册|搜索|English|关于我们|联系方式|网站地图|无障碍|隐私权|法律声明|版权所有|加入收藏|设为首页|友情链接|点击进入|查看更多|立即申请|请输入|点击查看|了解更多|详情咨询|咨询电话|x)$/;

/** 无效 URL 前缀（JS/mailto/anchor 等） */
const JUNK_URL_PREFIX = /^javascript:|^mailto:|^#|^tel:/;

/**
 * 判断一个 URL 是否像真实的政策文档/文章链接（而非导航/首页）
 */
function isValidPolicyUrl(url: string, source: PolicySource): boolean {
  if (!url || JUNK_URL_PREFIX.test(url)) return false;

  // 应用源的 urlFilter（如果配置了的话）
  if (source.urlFilter) {
    try {
      const filterRe = new RegExp(source.urlFilter);
      if (!filterRe.test(url)) return false;
    } catch { /* 正则无效则跳过此过滤器 */ }
  }

  // 应用源的 urlExclude（排除首页/列表页本身）
  if (source.urlExclude) {
    try {
      const excludeRe = new RegExp(source.urlExclude);
      if (excludeRe.test(url)) return false;
    } catch { /* ignore */ }
  }

  // 通用排除规则：
  // 1. 排除纯 index 页面（除非是子目录下的）
  if (/^(\/index\.html?|\/$|[a-z\-\/]*\/index\.html?)$/i.test(url)) return false;
  // 2. 排除无扩展名的路径（通常是目录/栏目页）
  if (!/\.(html?|aspx?|php|jsp|shtml)$/.test(url) && !/articleId=\d+/.test(url)) {
    // 如果没有标准扩展名且不是动态参数链接，大概率是目录页
    // 但允许包含日期的 URL（如 /2024/05/01/xxx.html 或带日期参数的）
    const hasDateLike = /\d{4}[/\-]\d{2}[/\-]\d{2}|\/\d{8}\//.test(url);
    if (!hasDateLike && !/\/[a-f\d]{10,}\./.test(url)) return false;
  }
  // 3. 排除 CSS/JS/图片资源
  if(/\.(css|js|png|jpg|gif|ico|svg|woff|ttf|pdf)$/i.test(url)) return false;

  return true;
}

/**
 * 从 HTML 中精确定位并提取内容列表项
 *
 * 解析策略（按优先级）：
 *   1. 找到主内容区域的 <ul> / <div class="list"> 容器，在内部提取 <a> 标签
 *   2. 如果找不到容器，回退到全页面的 <li><a> 结构化列表项
 *   3. 最后兜底：全页面 <a> 标签（但做严格 URL + 标题过滤）
 */
function parseGovPage(html: string, source: PolicySource): RssItem[] {
  const items: RssItem[] = [];
  const seen = new Set<string>();

  /**
   * 提取一条候选结果并验证
   */
  function tryAddItem(link: string, rawTitle: string): void {
    if (!link || !rawTitle) return;
    const cleanTitle = rawTitle.replace(/<[^>]+>/g, '').trim();
    if (!cleanTitle) return;
    // URL 去重
    if (seen.has(link)) return;
    // URL 特征过滤（关键！）
    if (!isValidPolicyUrl(link, source)) return;
    // 标题质量检查
    if (
      cleanTitle.length < 4 ||
      cleanTitle.length > 120 ||
      JUNK_TITLE_RE.test(cleanTitle) ||
      /^[\s\d\-|]+$/.test(cleanTitle)
    ) return;

    seen.add(link);
    items.push({
      title: cleanTitle,
      link: resolveUrl(link, source.domain),
      description: '',
      source: source.name,
      authLevel: source.authLevel,
      region: source.region,
    });
  }

  // ═══ 策略1：定位内容列表容器后提取 ═══
  // 政府网站常见的内容列表容器模式
  const containerPatterns = [
    // <ul class="xxx-list">
    /<ul[^>]*class="[^"]*(?:list|news|info|content|article)[^"]*"[^>]*>([\s\S]*?)<\/ul>/gi,
    // <div class="xxx-list">...</div>
    /<div[^>]*class="[^"]*(?:list|news-list|info-list|article-list|content-list|dataList|result)[^"]*"[^>]*>([\s\S]*?<\/div>\s*<\/div>)/gi,
    // <dl class="dt_list">...
    /<dl[^>]*class="[^"]*dt_list[^"]*"[^>]*>([\s\S]*?)<\/dl>/gi,
  ];

  let extractedFromContainer = false;
  for (const containerRe of containerPatterns) {
    if (items.length >= 15) break; // 已够数量就停止

    containerRe.lastIndex = 0;
    let cMatch;
    while ((cMatch = containerRe.exec(html)) !== null) {
      if (items.length >= 15) break;
      const containerHtml = cMatch[1] || '';

      // 在容器内查找 <a href="..." title="...">text</a>
      const linkPatterns = [
        // 带 title 属性的 a 标签（最精确）
        /<a[^>]+href="([^"]*)"[^>]*title="([^"]*)"[^>]*(?:>|>)([\s\S]*?)<\/a>/gi,
        // <li><a>text</a><span>date</span></li>（列表项结构）
        /<li[^>]*>[\s\S]*?<a[^>]+href="([^"]*)"[^>]*>((?:(?!<\/(?:a|li)>).){4,80})<\/a>/gi,
        // 普通 a 标签（有足够长度的文本内容）
        /<a[^>]+href="([^"]*)"[^>]*>((?:(?!<\/a>).){6,90})<\/a>/gi,
      ];

      for (const re of linkPatterns) {
        if (items.length >= 15) break;
        re.lastIndex = 0;
        let match;
        while ((match = re.exec(containerHtml)) !== null) {
          if (items.length >= 15) break;
          tryAddItem(match[1], match[2] || '');
        }
      }
    }

    if (items.length > 0) {
      extractedFromContainer = true;
      break; // 成功从容器提取到内容，不需要尝试其他策略
    }
  }

  // ═══ 策略2：如果容器策略失败或结果太少，用结构化列表项匹配 ═══
  if (items.length < 3 && !extractedFromContainer) {
    // 匹配 <li> 包裹的结构化链接（通常在内容区域）
    const liPattern = /<li[^>]*[\s\S]{0,200}?<a[^>]+href="([^"]*)"(?:[^>]*)?(?:title="([^"]*)")?(?:[^>]*)?>((?:(?!<\/li>).){5,100})/gi;
    liPattern.lastIndex = 0;
    let match;
    while ((match = liPattern.exec(html)) !== null) {
      if (items.length >= 20) break;
      tryAddItem(match[1], match[2] || match[3] || '');
    }
  }

  // ═══ 策略3：最终兜底 — 全页面 a 标签（仅当以上都几乎没结果时） ═══
  // 这一步会非常谨慎地使用，因为全页面扫描噪声极大
  if (items.length < 2 && !extractedFromContainer) {
    const loosePattern = /<a[^>]+href="([^"]*)"(?:[^>]*)?(?:title="([^"]*)")?(?:[^>]*)?>((?:(?!<\/a>).){6,90})<\/a>/gi;
    loosePattern.lastIndex = 0;
    let match;
    while ((match = loosePattern.exec(html)) !== null) {
      if (items.length >= 30) break;
      tryAddItem(match[1], match[2] || match[3] || '');
    }
  }

  return items;
}

function resolveUrl(url: string, baseDomain: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `https://${baseDomain}${url.startsWith('/') ? url : '/' + url}`;
}

// ════════════════════════════════════════════════════
//  相关度评分
// ════════════════════════════════════════════════════

function scoreRelevance(item: RssItem, keywords: string[]): number {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const lowerKeywords = keywords.map(k => k.toLowerCase());

  let score = 0;
  for (const kw of lowerKeywords) {
    if (kw.length < 2) continue;
    if (item.title.toLowerCase().includes(kw)) {
      score += 10;
    } else if (item.description.toLowerCase().includes(kw)) {
      score += 3;
    }
  }
  // 标题长度适中加分（太短可能是导航，太长可能是废话）
  if (item.title.length > 8 && item.title.length <= 50) score += 2;

  // 政策文件类词汇加分
  const policyWords = ['政策', '办法', '规定', '通知', '意见', '方案', '指南', '细则', '措施', '补贴', '申报', '扶持'];
  for (const pw of policyWords) {
    if (item.title.includes(pw)) { score += 3; break; }
  }

  // 行业研究/研报类专业词汇加分（解决"缺少专业咨询信息"问题）
  if (item.region === 'industry') {
    const researchWords = [
      '研究', '报告', '分析', '调研', '深度', '白皮书', '蓝皮书',
      '研报', '投资策略', '市场分析', '趋势', '展望', '预测',
      '行业', '赛道', '产业链', '竞争格局', '市场规模',
      '估值', '财报', '业绩', '营收', '增长', '渗透率',
      '案例', '最佳实践', '洞察', '解读', '点评',
    ];
    let hasResearchWord = false;
    for (const rw of researchWords) {
      if (item.title.includes(rw)) { score += 4; hasResearchWord = true; }
    }
    // 行业源本身自带一定基础分
    if (!hasResearchWord) score += 1;
  }

  return score;
}

// ════════════════════════════════════════════════════
//  数据抓取
// ════════════════════════════════════════════════════

async function fetchPolicySource(source: PolicySource, timeout = 8000): Promise<RssItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(source.url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.log(`[policy-source] ${source.name} (${source.region}): HTTP ${res.status}`);
      return [];
    }

    const html = await res.text();
    if (!html || html.length < 500) {
      console.log(`[policy-source] ${source.name}: 内容为空或过短 (${html?.length || 0} bytes)`);
      return [];
    }

    const items = parseGovPage(html, source);
    console.log(`[policy-source] ✅ ${source.name} (${source.region}): ${items.length} 条有效条目`);
    return items;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[policy-source] ❌ ${source.name}: ${msg}`);
    return [];
  }
}

// ════════════════════════════════════════════════════
//  公开接口
// ════════════════════════════════════════════════════

export async function searchPolicySources(
  query: string,
  options?: { maxResults?: number; timeout?: number; region?: PolicyRegion },
): Promise<SearchResponse> {
  const maxResults = options?.maxResults || 12;
  const defaultTimeout = options?.timeout || 8000;
  const targetRegion = options?.region;
  const keywords = query.split(/[\s,，、+]/).filter(k => k.length >= 2);

  // 行业源使用较短超时（商业网站可能反爬或响应慢），政府源用默认超时
  const getTimeout = (source: PolicySource): number => {
    if (source.region === 'industry') return Math.min(defaultTimeout, 5000);
    return defaultTimeout;
  };

  const sourcesToFetch = targetRegion
    ? POLICY_SOURCES.filter(s => s.region === targetRegion)
    : POLICY_SOURCES;

  console.log(`[policy-search] 🔍 抓取 ${sourcesToFetch.length} 个源 (region=${targetRegion || 'all'}) query="${query}"`);

  const results = await Promise.allSettled(
    sourcesToFetch.map(s => fetchPolicySource(s, getTimeout(s)))
  );

  const allItems: RssItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') allItems.push(...r.value);
  }

  console.log(`[policy-search] 📊 原始抓取: ${allItems.length} 条`);

  // 相关度排序
  let scoredItems: Array<{ item: RssItem; score: number }>;
  if (keywords.length > 0) {
    scoredItems = allItems
      .map(item => ({ item, score: scoreRelevance(item, keywords) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
  } else {
    scoredItems = allItems.map(item => ({ item, score: 1 }));
  }

  const topItems = scoredItems.slice(0, maxResults);
  console.log(`[policy-search] ✅ 过滤后: ${topItems.length} 条相关结果`);

  const webItems: SearchResultItem[] = topItems.map(({ item }) => ({
    title: item.title,
    url: item.link,
    site_name: extractDomain(item.link) || item.source,
    snippet: item.description || `${item.source}`,
    publish_time: item.pubDate || '',
    auth_info_level: item.authLevel,
    auth_info_des: item.region === 'shanghai' ? '上海地区' : item.region === 'industry' ? '行业研究' : '',
  }));

  const regionLabel = targetRegion === 'shanghai'
    ? '[上海地区]' : targetRegion === 'national' ? '[全国]' : targetRegion === 'industry' ? '[行业研究]' : '';

  return {
    summary: webItems.length > 0
      ? `${regionLabel} 从 ${new Set(webItems.map(i => i.site_name)).size} 个${targetRegion === 'industry' ? '专业研究' : '权威'}来源找到 ${webItems.length} 条相关${targetRegion === 'industry' ? '研报/报告/分析' : '政策'}文件`
      : `未在${targetRegion === 'shanghai' ? '上海地区' : targetRegion === 'industry' ? '行业专业研究渠道' : '政府公开渠道'}找到匹配的结果`,
    web_items: webItems,
  };
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export function getRegisteredPolicySources(): PolicySource[] {
  return POLICY_SOURCES.map(s => ({ ...s }));
}

export function getPolicySourceStats(): {
  total: number;
  nationalCount: number;
  shanghaiCount: number;
  industryCount: number;
  shanghaiCategories: { municipal: string[]; departments: string[]; districts: string[]; parks: string[]; exchanges: string[] };
  industryCategories: { research: string[]; broker: string[]; association: string[]; media: string[]; consulting: string[] };
} {
  const stats = {
    total: SHANGHAI_SOURCES.length + NATIONAL_SOURCES.length + INDUSTRY_SOURCES.length,
    nationalCount: NATIONAL_SOURCES.length,
    shanghaiCount: SHANGHAI_SOURCES.length,
    industryCount: INDUSTRY_SOURCES.length,
    shanghaiCategories: {
      municipal: [] as string[], departments: [] as string[],
      districts: [] as string[], parks: [] as string[], exchanges: [] as string[],
    },
    industryCategories: {
      research: [] as string[], broker: [] as string[],
      association: [] as string[], media: [] as string[], consulting: [] as string[],
    },
  };

  for (const s of SHANGHAI_SOURCES) {
    if (/市政府/.test(s.name)) stats.shanghaiCategories.municipal.push(s.name);
    else if (/委|局|监|办/.test(s.name)) stats.shanghaiCategories.departments.push(s.name);
    else if (/区政府$/.test(s.name)) stats.shanghaiCategories.districts.push(s.name);
    else if (/园|区$|开发|示范区/.test(s.name)) stats.shanghaiCategories.parks.push(s.name);
    else stats.shanghaiCategories.exchanges.push(s.name);
  }

  for (const s of INDUSTRY_SOURCES) {
    // 当前行业源只有两类：研究智库 + 行业协会
    if (/研究院|研究社|信通院|信息中心|赛迪|宏观|发展研究中心|科学院|中科院/.test(s.name))
      stats.industryCategories.research.push(s.name);
    else
      stats.industryCategories.association.push(s.name);
  }

  return stats;
}
