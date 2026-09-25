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
      iterations: 2,
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    // 按官方 Web Vitals 预算判定：LCP<=2500ms，INP<=200ms，FCP<=1800ms，TTFB<=800ms，FID<=100ms，CLS<=0.1（不再恒通过）。
    'browser_web_vital_cls{url:login}': ['p(95)<=0.1'],
    'browser_web_vital_fcp{url:login}': ['p(95)<=1800'],
    'browser_web_vital_fid{url:login}': ['p(95)<=100'],
    'browser_web_vital_lcp{url:login}': ['p(95)<=2500'],
    'browser_web_vital_inp{url:login}': ['p(95)<=200'],
    'browser_web_vital_ttfb{url:login}': ['p(95)<=800'],
    'browser_web_vital_cls{url:test_case_list}': ['p(95)<=0.1'],
    'browser_web_vital_fcp{url:test_case_list}': ['p(95)<=1800'],
    'browser_web_vital_fid{url:test_case_list}': ['p(95)<=100'],
    'browser_web_vital_lcp{url:test_case_list}': ['p(95)<=2500'],
    'browser_web_vital_inp{url:test_case_list}': ['p(95)<=200'],
    'browser_web_vital_ttfb{url:test_case_list}': ['p(95)<=800'],
    'browser_web_vital_cls{url:test_task_list}': ['p(95)<=0.1'],
    'browser_web_vital_fcp{url:test_task_list}': ['p(95)<=1800'],
    'browser_web_vital_fid{url:test_task_list}': ['p(95)<=100'],
    'browser_web_vital_lcp{url:test_task_list}': ['p(95)<=2500'],
    'browser_web_vital_inp{url:test_task_list}': ['p(95)<=200'],
    'browser_web_vital_ttfb{url:test_task_list}': ['p(95)<=800'],
  },
};

export default async function () {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // 在导航前注册 Web Vitals 页面标签：登录页 / 测试用例列表页
  bindWebVitalPageTags(page, [
    { name: 'login', urlPattern: /auth\/realms/ },
    { name: 'test_case_list', urlPattern: /test_manager_test-repository/ },
    { name: 'test_task_list', urlPattern: /test_manager_test-task/ }
  ]);

  await group("Login Keycloak", function () {
    return (async () => {
      await login_browser(page, `${ApiOptions.domainName}/auth/realms/${ApiOptions.tenant}/protocol/openid-connect/auth?response_type=code&client_id=one-sso&redirect_uri=/api/one/rest/v1/users/login/info/ret`);
    })();
  });

  await group("Browser Operation", function () {
    return (async () => {
      await browserOperation({
        targetUrl: `${ApiOptions.domainName}/${ApiOptions.tenant}/hello/proxima/plugin/test_manager_test-repository?plugin=test_manager_test-repository&tenant=${ApiOptions.tenant}&workspace=hello`,
        waitText: '新建测试用例',
        waitListData: true,
        screenshotName: 'test_case_list',
      }, page);
    })();
  });


    await group("Browser Operation", function () {
    return (async () => {
      await browserOperation({
        targetUrl: `${ApiOptions.domainName}/${ApiOptions.tenant}/hello/proxima/plugin/test_manager_test-task?plugin=test_manager_test-task&tenant=${ApiOptions.tenant}&workspace=hello`,
        waitText: '测试执行任务名称',
        waitListData: true,
        screenshotName: 'test_task_list',
      }, page);
    })();
  });

  await page.close();
  await context.close();
}
