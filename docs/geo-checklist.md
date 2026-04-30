# CloudCreate.ai GEO 检查清单

本文用于 CloudCreate.ai web 站点的 GEO（Generative Engine Optimization）例行检查。

相关规范：
- 新增页面上线检查请同时执行 `docs/new-page-spec.md`。

## 1) P0：抓取与索引

- [x] `robots.txt` 可访问，规则不误伤核心页面
- [x] `sitemap.xml` 可访问并覆盖核心路由
- [x] canonical 指向当前页面标准 URL，避免跨语言串链
- [x] `hreflang` 成对声明（`en` / `zh-CN` / `x-default`）
- [x] 核心页面返回 200，且未误设 `noindex`

## 2) P1：页面可引用性

- [x] 每个工具页标题与描述可直接回答“这个页面解决什么问题”
- [x] 页面包含明确步骤、输入输出说明、边界条件
- [ ] 关键结论可验证（有事实、示例或官方来源）
- [ ] 避免同质化文案，保留产品真实差异点

## 3) P1：结构化与实体信号

- [x] Organization / WebSite 基础结构化数据存在
- [x] 重点页面补充 FAQ / HowTo / SoftwareApplication（按页面类型）
- [x] 品牌名、域名、产品名在页面与元数据保持一致
- [ ] 图片 alt 与正文语义一致，不为空堆砌

## 4) P2：AI 协同入口

- [x] `/{locale}/ai-spec` 内容与站内最新能力一致
- [x] `/{locale}/ai-spec/llm.txt` 可访问、无陈旧信息
- [x] 工具能力描述包含参数语义（便于 AI query fan-out 匹配）
- [x] 至少有一页“能力总览 + 场景映射”

## 5) P2：监测与反馈

- [ ] 接入 Bing Webmaster AI 报告并月度复盘引用份额
- [ ] 建立“被引用页面 -> 到站行为 -> 转化行为”漏斗
- [ ] 区分品牌词/非品牌词 GEO 表现并制定补齐计划

## 当前站点（2026-04-30）快速结论

- 已具备：基础 SEO Head（title/description/canonical/hreflang/robots），`sitemap.xml` 与 `robots.txt` 生成脚本，`ai-spec/llm.txt` 入口。
- 待加强：
  1. `sitemap.xml` 未含图片/视频等扩展（若后续媒体型页面增长可补）。
  2. `llm.txt` 缓存时间较短（`max-age=300`），可按发布策略调大并加版本化审计。
  3. 缺少 GEO 专项指标看板（引用份额、非品牌问题覆盖、引用后转化）。

## 结构化数据维护规范（新增）

当前实现说明：
- 全站基础 JSON-LD（`Organization` / `WebSite`）在 `src/lib/components/SeoHead.svelte` 输出。
- 路由级 `FAQPage` / `HowTo` 配置集中在 `src/lib/seoStructuredData.js`。

新增一个页面的 FAQ/HowTo：
1. 在 `src/lib/seoStructuredData.js` 新增一个工厂函数，返回 schema 数组。
2. 在 `ROUTE_SCHEMA_FACTORIES` 里注册目标逻辑路径（例如 `/image/resize`）。
3. 内容必须与页面真实能力一致，避免模板化空话。
4. 中英文都要覆盖（`lang === 'zh'` 与英文分支）。

最小示例：

```js
function imageResizeSchemas(lang) {
  const zh = lang === 'zh';
  const inLanguage = zh ? 'zh-CN' : 'en';
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: zh ? '如何调整图片尺寸' : 'How to resize an image',
      inLanguage,
      step: [
        { '@type': 'HowToStep', text: zh ? '上传图片。' : 'Upload an image.' },
        { '@type': 'HowToStep', text: zh ? '输入宽高或缩放方式。' : 'Set width/height or scale mode.' },
        { '@type': 'HowToStep', text: zh ? '导出处理结果。' : 'Export the result.' },
      ],
    },
  ];
}
```

发布前校验：
1. 运行 `npm run build`，确保静态构建与 sitemap/robots 生成成功。
2. 本地打开对应页面，检查 `<head>` 中是否输出预期 `application/ld+json`。
3. 用 Rich Results Test / Schema Validator 抽查关键页面。
