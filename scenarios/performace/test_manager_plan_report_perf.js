import { group } from 'k6';
import { browser } from 'k6/browser';
import { login_browser } from '../../capabilities/browser/login_browser.js';
import { browserOperation, ensureScreenshotDir } from '../../capabilities/browser/browser.js';
import { bindWebVitalPageTags } from '../../capabilities/browser/web_vital.js';
import { ApiOptions } from '../../config/apiOptions.js';

export function setup() {
  ensureScreenshotDir();
}

export const options = {
  scenarios: {
    ui: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    // 按官方 Web Vitals 预算判定：LCP<=2500ms，INP<=200ms，FCP<=1800ms，TTFB<=800ms，FID<=100ms，CLS<=0.1
    'browser_web_vital_cls{url:login}': ['p(95)<=0.1'],
    'browser_web_vital_fcp{url:login}': ['p(95)<=1800'],
    'browser_web_vital_fid{url:login}': ['p(95)<=100'],
    'browser_web_vital_lcp{url:login}': ['p(95)<=2500'],
    'browser_web_vital_inp{url:login}': ['p(95)<=200'],
    'browser_web_vital_ttfb{url:login}': ['p(95)<=800'],
    'browser_web_vital_cls{url:test_plan}': ['p(95)<=0.1'],
    'browser_web_vital_fcp{url:test_plan}': ['p(95)<=1800'],
    'browser_web_vital_fid{url:test_plan}': ['p(95)<=100'],
    'browser_web_vital_lcp{url:test_plan}': ['p(95)<=2500'],
    'browser_web_vital_inp{url:test_plan}': ['p(95)<=200'],
    'browser_web_vital_ttfb{url:test_plan}': ['p(95)<=800'],
    'browser_web_vital_cls{url:test_report}': ['p(95)<=0.1'],
    'browser_web_vital_fcp{url:test_report}': ['p(95)<=1800'],
    'browser_web_vital_fid{url:test_report}': ['p(95)<=100'],
    'browser_web_vital_lcp{url:test_report}': ['p(95)<=2500'],
    'browser_web_vital_inp{url:test_report}': ['p(95)<=200'],
    'browser_web_vital_ttfb{url:test_report}': ['p(95)<=800'],
  },
};

export default async function () {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // 在导航前注册 Web Vitals 页面标签：登录页 / 测试计划列表页 / 测试报告列表页
  bindWebVitalPageTags(page, [
    { name: 'login', urlPattern: /auth\/realms/ },
    { name: 'test_plan', urlPattern: /test_manager_test-plan/ },
    { name: 'test_report', urlPattern: /test_manager_test-report/ },
  ]);

  await group("Login Keycloak", function () {
    return (async () => {
      await login_browser(page, `${ApiOptions.domainName}/auth/realms/${ApiOptions.tenant}/protocol/openid-connect/auth?response_type=code&client_id=one-sso&redirect_uri=/api/one/rest/v1/users/login/info/ret`);
    })();
  });

  // 页面路径中的 sfdsgg 为用户提供的 workspace 路径，原样保留；域名/租户来自 ApiOptions
  await group("Browser Operation: test_plan", function () {
    return (async () => {
      await browserOperation({
        targetUrl: `${ApiOptions.domainName}/${ApiOptions.tenant}/sfdsgg/proxima/plugin/test_manager_test-plan`,
        waitListData: true,
        screenshotName: 'test_plan',
      }, page);
    })();
  });

  await group("Browser Operation: test_report", function () {
    return (async () => {
      await browserOperation({
        targetUrl: `${ApiOptions.domainName}/${ApiOptions.tenant}/sfdsgg/proxima/plugin/test_manager_test-report`,
        waitListData: true,
        screenshotName: 'test_report',
      }, page);
    })();
  });

  await page.close();
  await context.close();
}
