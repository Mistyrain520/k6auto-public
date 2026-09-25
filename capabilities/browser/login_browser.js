import { browser } from "k6/browser";
import { flushWebVitals } from "./web_vital.js";

export async function login_browser(newPage, loginUrl) {
  const page = newPage || await browser.newPage();

  console.log("🌐 打开登录页面...");
  await page.goto(
    loginUrl,
    { waitUntil: "networkidle" }
  );

  await page.waitForSelector("#username", { timeout: 15000 });
  console.log("✅ 登录表单已加载");

  await page.locator("#username").fill("<YOUR-USERNAME>");
  await page.locator("#password").fill("<YOUR-PASSWORD>");
  console.log("✅ 已输入账号密码");

  // 补一次真实键盘交互（Tab 移到登录按钮），让登录页有可计入 INP 的交互样本
  await page.keyboard.press("Tab");

  // 主动派发 pagehide 定稿 Web Vitals（CLS/INP），
  // 避免点击登录后跳转瞬间的自然 pagehide 上报丢失
  await flushWebVitals(page);

  await page.locator("#kc-login").click();
  console.log("✅ 已点击登录按钮，等待登录完成...");

  let currentUrl = page.url();
  while (currentUrl.includes("auth/realms")) {
    await page.waitForTimeout(1000);
    currentUrl = page.url();
  }
  console.log("✅ 登录成功，当前 URL:", currentUrl);

  await page.waitForTimeout(2000);

  if (!newPage) {
    await page.close();
  }
}
