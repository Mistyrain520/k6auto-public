import { browser } from 'k6/browser';
import { check, sleep } from 'k6';
import file from 'k6/x/file';
import { flushWebVitals } from './web_vital.js';
import { outputDir, outputPath, timeText } from '../../tool/outputPath.js';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
};

export async function browserOperation(options = {}, page = null) {
  const {
    targetUrl,
    waitText = null,
    waitListData = false,
    timeout = 60000,
    screenshotName = 'page',
  } = options;

  if (!targetUrl) {
    throw new Error('browserOperation: options.targetUrl 不能为空');
  }

  const activePage = page || await browser.newPage();

  console.log(`⏳ 正在访问: ${targetUrl}`);
  activePage.goto(targetUrl, {
    waitUntil: 'domcontentloaded',
    timeout: '60s',
  }).catch(e => {
    console.log(`⚠️ 导航异常（忽略）: ${e.message}`);
  });

  console.log('⏳ 强制等待页面加载...');
  await activePage.waitForTimeout(5000);
  await activePage.waitForTimeout(3000);

  if (waitText) {
    console.log('🔍 尝试查找按钮...');
    await pollingWaitForText(activePage, waitText, timeout);
  }

  const listData = waitListData ? await pollingWaitForListData(activePage, timeout) : null;

  if (listData) {
    console.log("📋列表数据:", JSON.stringify(listData, null, 2));
  }

  // 必须在 fullPage 截图之前执行：截图会把视口外内容强制绘制，晚于截图的绘制会污染 LCP。
  await flushWebVitals(activePage);

  await activePage.waitForTimeout(2000);
  // 唯一文件名：时间戳 + VU 号 + 迭代号 + 页面名，多页面/多迭代/多 VU 互不覆盖
  // __VU / __ITER 为 k6 内置全局变量，浏览器场景下可用（k6/execution 的 exec.vu 不可用）
  const screenshotPath = outputPath(
    'screenshot',
    `${timeText()}-vu${__VU}-iter${__ITER}-${String(screenshotName).replace(/[^A-Za-z0-9_-]+/g, '-')}.png`
  );
  try {
    await activePage.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 最终截图已保存: ${screenshotPath}`);
  } catch (e) {
    console.error(`❌ 最终截图失败: ${e.message}`);
  }

  console.log('⏳ 等待 5 秒后关闭浏览器...');
  await activePage.waitForTimeout(5000);

  console.log('🏁 测试执行完毕');

  if (!page) {
    await activePage.close();
  }
}

// 截图统一收敛到 report/screenshot/<日期>/；在 setup() 中整轮调用一次即可
export function ensureScreenshotDir() {
  const dir = outputDir('screenshot');
  try {
    file.createDirectory(dir);
    console.log(`📁 截图目录已就绪: ${dir}`);
  } catch (e) {
    console.log(`⚠️ 创建截图目录失败: ${e.message}`);
  }
  return dir;
}

export default async function () {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  //不想走登录可以用此方式
  // await context.addCookies([
  //   {
  //     name: 'X-Parse-Session-Token',
  //     value: 'eyJhZG1pbiI6dHJ1ZSwiY29tcGFueSI6Im9zYyIsImNvbXBhbnlJZGVudGl0eSI6IkNPTVBBTllfT1dORVIiLCJjb21wYW55UGF0aCI6Im9zYyIsImRpc3BsYXlOYW1lIjoib3NjLWFkbWluIiwiZW1haWwiOiJhZG1pbkBhZG1pbi5jb20iLCJpZCI6IjEiLCJzQU1BY2NvdW50TmFtZSI6Im9zYy1hZG1pbiIsInN0YXR1cyI6IlNVQ0NFU1MiLCJ1U05DcmVhdGVkIjoiMSIsInVzZXJQcmluY2lwYWxOYW1lIjoiYWRtaW5AYWRtaW4uY29tIiwidXNlcm5hbWUiOiJvc2MtYWRtaW4ifQ==',
  //     domain: 'dji-dev.gitee.work',
  //     path: '/',
  //   },
  //   {
  //     name: 'x-parse-application-id',
  //     value: 'osc',
  //     domain: 'dji-dev.gitee.work',
  //     path: '/',
  //   },
  //   {
  //     name: 'PRE-GW-LOAD',
  //     value: 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEiLCJ1U05DcmVhdGVkIjoiMSIsImRpc3BsYXlOYW1lIjoib3NjLWFkbWluIiwic0FNQWNjb3VudE5hbWUiOiJvc2MtYWRtaW4iLCJjb21wYW55Ijoib3NjIiwiY29tcGFueUlkZW50aXR5IjoiQ09NUEFOWV9PV05FUiIsInVzZXJQcmluY2lwYWxOYW1lIjoiYWRtaW5AYWRtaW4uY29tIiwiY29tcGFueVBhdGgiOiJvc2MiLCJqdGkiOiJDT09LSUU6U1dJVENIX1RFTkFOVDo1ZmEyNjU2NzM2YmE0MDU4YTZkZDYyMWE3YWFhNDY5OCIsImlhdCI6MTc4NzEwOTk1Niwic3ViIjoiMSIsImV4cCI6MTc4NzY5MTYwMH0.LxfxUTUhb8ZxG2Ea8bKNznyr9MHGDg0cwf56D1GT1F4',
  //     domain: 'dji-dev.gitee.work',
  //     path: '/',
  //   },
  //   {
  //     name: 'PRE-GW-SESSION',
  //     value: 'COOKIE:SWITCH_TENANT:5fa2656736ba4058a6dd621a7aaa4698',
  //     domain: 'dji-dev.gitee.work',
  //     path: '/',
  //   },
  //   {
  //     name: 'USER_REALM_KEY',
  //     value: 'eyJyZWFsbVV1aWQiOiJvc2MiLCJjbGllbnRJZCI6Im9uZS1zc28iLCJyZWRpcmVjdFVyaSI6bnVsbH0=',
  //     domain: 'dji-dev.gitee.work',
  //     path: '/',
  //   }
  // ]);

  ensureScreenshotDir();
  await browserOperation({
    targetUrl: 'http://<YOUR-DOMAIN>/<YOUR-TENANT>/hello/proxima/plugin/test_manager_test-repository?plugin=test_manager_test-repository&tenant=<YOUR-TENANT>&workspace=hello',
    waitListData: true,
  }, page);

  await page.close();
  await context.close();
}

async function pollingWaitForText(page, text, timeout = 60000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const found = await page.evaluate((searchText) => {
      const candidates = document.querySelectorAll(
        "button, a, [role='button'], span, div, [class*='btn'], [class*='button']"
      );
      for (const el of candidates) {
        const textContent = el.textContent?.trim() || "";
        if (textContent.includes(searchText)) {
          return {
            found: true,
            tagName: el.tagName,
            outerHTML: el.outerHTML.substring(0, 300),
            text: textContent,
          };
        }
      }
      return { found: false };
    }, text);

    if (found.found) {
      console.log("✅ 找到包含「" + text + "」的元素:", JSON.stringify(found));
      return;
    }

    console.log("⏳ 等待「" + text + "」出现... 已过", Date.now() - start, "ms");
    await page.waitForTimeout(1000);
  }

  console.log("⚠️ 超时 " + timeout + "ms，未找到包含「" + text + "」的元素");
}

async function pollingWaitForListData(page, timeout = 60000) {
  const start = Date.now();

  const EMPTY_MARKERS = ["暂无数据", "没有数据", "无数据", "no data", "加载中", "loading"];
  const isPlaceholder = (cells) => {
    const joined = cells.join(" ").trim().toLowerCase();
    return cells.every((c) => !c.trim()) || EMPTY_MARKERS.some((m) => joined.includes(m));
  };

  while (Date.now() - start < timeout) {
    const result = await page.evaluate(() => {
      const extractors = [
        // 1. Element Plus 表格（本页面实际使用的组件）优先
        () => {
          const rows = [];
          document.querySelectorAll(".el-table__body-wrapper tr.el-table__row").forEach((tr) => {
            const cells = [];
            tr.querySelectorAll("td .cell").forEach((cell) => {
              cells.push(cell.textContent?.trim() || "");
            });
            if (cells.length > 0) rows.push(cells);
          });
          return rows.length > 0 ? { type: "el-table", data: rows } : null;
        },

        // 2. Ant Design 表格
        () => {
          const rows = [];
          document.querySelectorAll(".ant-table-tbody tr.ant-table-row").forEach((tr) => {
            const cells = [];
            tr.querySelectorAll("td").forEach((td) => {
              cells.push(td.textContent?.trim() || "");
            });
            if (cells.length > 0) rows.push(cells);
          });
          return rows.length > 0 ? { type: "ant-table", data: rows } : null;
        },

        // 3. 通用 table 兜底：跳过空状态表格
        () => {
          const tables = document.querySelectorAll("table");
          const rows = [];
          tables.forEach((table) => {
            if (table.querySelector(".el-table__empty-block, .ant-empty")) return;
            const trs = table.querySelectorAll("tbody tr");
            trs.forEach((tr) => {
              const cells = [];
              tr.querySelectorAll("td, th").forEach((td) => {
                cells.push(td.textContent?.trim() || "");
              });
              if (cells.length > 0) rows.push(cells);
            });
          });
          return rows.length > 0 ? { type: "table", data: rows } : null;
        },
      ];

      for (const extract of extractors) {
        const result = extract();
        if (result) return result;
      }
      return null;
    });

    if (result) {
      const realRows = result.data.filter((row) => !isPlaceholder(row));
      if (realRows.length > 0) {
        console.log("✅ 列表数据已加载, 类型:", result.type, ", 行数:", realRows.length);
        return { type: result.type, data: realRows };
      }
      console.log("⏳ 当前只有空状态/占位数据，继续等待... 已过", Date.now() - start, "ms");
    } else {
      console.log("⏳ 等待列表数据加载... 已过", Date.now() - start, "ms");
    }

    await page.waitForTimeout(1000);
  }

  const fallback = await page.evaluate(() => {
    return {
      title: document.title,
      bodyText: document.body?.textContent?.substring(0, 2000) || "",
      buttons: Array.from(document.querySelectorAll("button")).map((b) => b.textContent?.trim()),
    };
  });
  console.log("⚠️ 超时，页面内容摘要:", JSON.stringify(fallback, null, 2));
  return null;
}
