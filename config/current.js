// ============ 环境配置注册表 ============
// 新增环境步骤：
//   1) 复制 config/envs/dev1/ 为 config/envs/<新环境名>/，修改里面的 apiOptions.js、data.json、dataTestmanager.json；
//   2) 在下方 import 一行并注册到 envs 里（参照示例）。
import * as dev1 from './envs/dev1/apiOptions.js';
import * as develop from './envs/develop/apiOptions.js';
import * as sw from './envs/sw/apiOptions.js';
// 示例（目录存在后才能取消注释）：
// import * as prod from './envs/prod/apiOptions.js';

const envs = {
  'dev1': dev1,
  'develop': develop,
  'sw': sw,
  // 'prod': prod,
};

// ============ 切换环境 ============
// 只需要改这一行：把 currentEnv 改成 envs 里的环境名。
export const currentEnv = 'dev1';

const selected = envs[currentEnv];
if (!selected) {
  throw new Error(`未知环境: ${currentEnv}，请检查 config/current.js 中 envs 是否已注册该环境`);
}

export const ENV = currentEnv;
export const ApiOptions = selected.ApiOptions;
export const K8sOptions = selected.K8sOptions;
export const testmanagerOptions = selected.testmanagerOptions;
