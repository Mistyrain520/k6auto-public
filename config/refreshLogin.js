// 小场景：调用登录接口，刷新当前环境的登录态，方便后续调试场景不需要走setup
// 运行：.\k6.exe run .\config\refreshLogin.js
// 效果：登录后把 Cookie / sessionToken 更新到 config/envs/<currentEnv>/data.json 的 loginRes 中
import { login } from '../apiTest/login.js';
import { ApiOptions } from './apiOptions.js';
import { readEnvData, writeEnvData } from '../tool/allTool.js';

export function refreshLogin() {
  // 1. 读取当前环境（config/current.js 的 currentEnv）的 data.json
  const data = readEnvData('data.json');

  // 2. 调用登录接口，获取 cookie 与 token（凭据来自当前环境的 ApiOptions.auth）
  const loginRes = login({
    username: ApiOptions.auth.username,
    password: ApiOptions.auth.password,
    group: '刷新登录态',
    casename: '登录获取cookie和token',
    isNotLog: true, // 只刷新登录态，不写报告日志
  });

  if (!loginRes.Cookie || !loginRes.sessionToken) {
    throw new Error('登录失败，未获取到 Cookie/sessionToken，请检查当前环境 auth 配置');
  }

  // 3. 更新对应环境 data.json 中的 cookie 与 token，其余数据保持不变
  if (!data.loginRes) {
    data.loginRes = {};
  }
  data.loginRes.Cookie = loginRes.Cookie;
  data.loginRes.sessionToken = loginRes.sessionToken;
  writeEnvData('data.json', data);

  console.log(
    `已刷新 ${ApiOptions.domainName} 的登录态：` +
    `Cookie=${loginRes.Cookie.slice(0, 40)}... ` +
    `token=${loginRes.sessionToken.slice(0, 40)}...`
  );
}

export default function () {
  refreshLogin();
}
