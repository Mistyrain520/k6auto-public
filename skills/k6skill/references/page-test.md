# 前端页面性能测试

把“压测一个页面”“写前端页面性能测试场景”等浏览器页面级需求改写成 k6 浏览器场景，规范参考 `scenarios/performace/testcase_browser.js`。落代码前先看该参考文件的最新实现，模板与仓库实现不一致时以仓库实现为准。

## 必做流程

1. 先报告当前环境：`当前环境：<currentEnv>（<domainName>）`。
2. 收集三个必填项，缺一不可：
   - 页面具体 URL：用户给出的是页面地址；落地代码里域名/租户必须用 `ApiOptions.domainName` / `ApiOptions.tenant` 拼接，禁止硬编码域名、租户。
   - 压测模型：VU 数与迭代次数。默认用 `per-vu-iterations`；用户只给 VU 没给迭代数（或相反）时必须补问。
   - 落地文件：`scenarios/performace/` 下的具体文件名；用户未指定时必须先问。
3. 搜索 `scenarios/performace/` 是否已有同类页面测试文件（如 `testcase_browser.js`），避免重复新建。
4. 用户未提供 `waitText` 时，不要为了确认页面文本去操作浏览器（Playwright、应用内浏览器等都不需要）；先询问用户是否采用“默认等待校验”：直接复用 `capabilities/browser/browser.js` 中 `browserOperation` 现有的两个校验——`waitText`（内部 `pollingWaitForText`，轮询检查页面文本是否出现）与 `waitListData: true`（内部 `pollingWaitForListData`，忽略“暂无数据/加载中”等占位并等待列表真实数据行）。`waitText` 校验的文本必须由用户给出，禁止用页面名等默认文本代替；用户未给出文本时必须补问。用户拒绝或页面非列表页时，再向用户确认具体文本与是否启用列表校验。
5. 按下面的模板落代码，复用 `capabilities/browser/` 已有封装，不修改它们。
6. 校验用 `k6 inspect`；`k6 run` 会真实打开浏览器访问页面，未明确要求测试前不执行。

## 完整模板

```js
import { group } from 'k6';
import { browser } from 'k6/browser';
import { login_browser } from '../../capabilities/browser/login_browser.js';
import { browserOperation } from '../../capabilities/browser/browser.js';
import { bindWebVitalPageTags } from '../../capabilities/browser/web_vital.js';
import { ApiOptions } from '../../config/apiOptions.js';

export const options = {
  scenarios: {
    ui: {
      executor: 'per-vu-iterations',
      vus: 1,        // ← 用户给的 VU 数
      iterations: 5, // ← 用户给的迭代次数
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    // 每个被测页面一组，{url:xxx} 必须与 bindWebVitalPageTags 的 name 一致
    'browser_web_vital_cls{url:<页面名>}': ['p(95)<=0.1'],
    'browser_web_vital_fcp{url:<页面名>}': ['p(95)<=1800'],
    'browser_web_vital_fid{url:<页面名>}': ['p(95)<=100'],
    'browser_web_vital_lcp{url:<页面名>}': ['p(95)<=2500'],
    'browser_web_vital_inp{url:<页面名>}': ['p(95)<=200'],
    'browser_web_vital_ttfb{url:<页面名>}': ['p(95)<=800'],
  },
};

export default async function () {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // 导航前注册 Web Vitals 页面标签；urlPattern 匹配页面指标自带的 url 标签
  bindWebVitalPageTags(page, [
    { name: '<页面名>', urlPattern: /<页面路径特征正则>/ },
  ]);

  // 需要登录的页面：复用 Keycloak 登录流程
  await group('Login Keycloak', async () => {
    await login_browser(page, `${ApiOptions.domainName}/auth/realms/${ApiOptions.tenant}/protocol/openid-connect/auth?response_type=code&client_id=one-sso&redirect_uri=/api/one/rest/v1/users/login/info/ret`);
  });

  await group('Browser Operation', async () => {
    await browserOperation({
      targetUrl: `${ApiOptions.domainName}/${ApiOptions.tenant}/<页面路径>?tenant=${ApiOptions.tenant}`,
      waitText: '<页面加载完成的关键文本>',
      waitListData: true, // 列表页才需要；非列表页删除或置 false
    }, page);
  });

  await page.close();
  await context.close();
}
```

## 逐段说明

### options.scenarios

- 默认 `per-vu-iterations`（每 VU 固定迭代次数），`vus` / `iterations` 来自用户。
- 用户指定其他压测模型时按对应 executor 改写：`shared-iterations`（总迭代数共享）、`constant-vus`（固定 VU 持续时长）、`ramping-vus`（阶梯 VU）等，参数随模型变化。
- 浏览器场景必须有 `options.browser.type: 'chromium'`。

### options.thresholds

- Web Vitals 预算固定：LCP≤2500ms、INP≤200ms、FCP≤1800ms、TTFB≤800ms、FID≤100ms、CLS≤0.1。
- 每个被测页面一组，统计口径 `p(95)`；标签 `{url:<页面名>}` 必须与 `bindWebVitalPageTags` 里的 `name` 完全一致，否则阈值不会命中该页面指标。

### default 函数

- 需要登录时先走 `group('Login Keycloak', ...)` 调用 `login_browser`；登录页本身也会产生 Web Vitals，可为登录页单独命名一个页面并加阈值。
- 免登录页面：删除 Login 组，直接 `browserOperation` 目标页面。
- 多页面测试：`bindWebVitalPageTags` 注册多条规则（如登录页 / 列表页 / 任务页），thresholds 每页一组，每页一个 `group('Browser Operation', ...)`。
- `browserOperation` 的 `waitText` 是页面加载完成标志文本（会轮询查找按钮/链接/文本），该文本必须由用户给出，禁止自行用页面名等默认文本代替；`waitListData: true` 只用于列表页，会忽略“暂无数据/加载中”等占位并等待真实数据行。用户未提供 waitText 时，按“必做流程”第 4 步询问是否采用默认等待校验（`waitText` 文本出现 + `waitListData` 列表数据出现）并补问具体文本，不要为确认文本去操作浏览器。
- `bindWebVitalPageTags` 必须在导航前注册；`flushWebVitals` 与 fullPage 截图顺序由 `browserOperation` 内部处理，场景里不要重复调用或自行截图。
- 结束前必须 `page.close()` 与 `context.close()`。

## 会话 Cookie 场景

页面依赖登录态但不能走 Keycloak 时，用 `context.addCookies`，Cookie 必须来自当前环境 `config/envs/<currentEnv>/` 的 `data*.json` 或用户提供，禁止在场景里写死。参考 `capabilities/browser/browser.js` 默认函数中被注释的 `addCookies` 写法。

## 运行与验证

- 代码校验：`.\k6.exe inspect .\scenarios\performace\<文件名>.js`
- 真实执行（需用户明确要求，会真实打开浏览器访问页面）：`.\k6.exe run --env K6_BROWSER_HEADLESS=true .\scenarios\performace\<文件名>.js`
  - `K6_BROWSER_HEADLESS=true` 表示启用无头模式（headless，不弹出浏览器窗口）；不带该参数时默认有头模式，会弹出浏览器窗口。
  - 无头模式下同样会真实启动浏览器并访问目标页面、采集 Web Vitals 指标。
- 需要保存指标时追加 `--out json=results.json`，或按 `references/performance-scene.md` 的约定对接 Prometheus。
