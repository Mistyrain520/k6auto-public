// Web Vitals 指标按页面归一化：
// 将内置 browser_web_vital_* 指标自带的 url 标签替换为固定页面名，
// 配合统计型阈值子指标，让 k6 summary 按页面分行展示指标。
// 仅做标签归一化，不定义自定义指标、不在页面内重复采集。

/**
 * 为 page 注册 Web Vitals 指标标签归一化规则。
 * @param {object} page k6 browser 的 page 对象
 * @param {Array<{name: string, urlPattern: RegExp}>} rules 页面规则：
 *   name 为固定页面名（summary 中显示为 { url:<name> }）；
 *   urlPattern 匹配该页面指标自带的 url 标签。
 */
export function bindWebVitalPageTags(page, rules = []) {
  for (const rule of rules) {
    page.on('metric', (metric) => {
      metric.tag({
        name: rule.name,
        matches: [{ url: rule.urlPattern }],
      });
    });
  }
}

/**
 * 主动派发 pagehide，让 Web Vitals（LCP/CLS/INP）在页面仍存活时完成定稿上报。
 * k6 在 page.goto 离页时由浏览器自然触发的 pagehide 上报存在丢失问题，
 * 与 k6 内部 page.close() 强制派发 pagehide 的机制一致。
 * 必须在 fullPage 截图等会触发额外绘制的操作之前执行，避免污染 LCP。
 * @param {object} page k6 browser 的 page 对象
 */
export async function flushWebVitals(page) {
  await page.evaluate(() => {
    window.dispatchEvent(new Event('pagehide'));
  });
}
