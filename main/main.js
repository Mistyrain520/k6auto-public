import { setupdata, setuptest } from '../scenarios/setupdata.js';
import { teardowndata, teardowntest } from '../scenarios/teardown.js';
import * as testmanagerScenarios from '../scenarios/testmanager_scenarios/index.js';
import { ENV } from '../config/current.js';

// ============ 环境入口注册表（新增环境入口时改这里） ============
// 需要独立入口的环境，在这里静态注册：环境名 -> 对应入口模块（main/ 目录下）。
// 入口文件是完整的 k6 入口（导出 options/setup/teardown/default）。
// 未注册的环境（ENV 不在表里）会执行本文件下面的默认行为。
import * as mainDev1 from './main_dev1.js';
import * as mainDevelop from './main_develop.js';
import * as mainSw from './main_sw.js';

const envEntries = {
  'dev1': mainDev1,
  'develop': mainDevelop,
  'sw': mainSw,
};

// ============ 默认行为：ENV 未匹配注册表时执行这里 ============
const defaultOptions = {
  setupTimeout: '10m',
  teardownTimeout: '10m',
  discardResponseBodies: false,
  scenarios: {
    contacts: {
        executor: 'per-vu-iterations',
        vus: 1,
        iterations: 1,
        maxDuration: '10m',
        exec: 'scenarios_item',
        tags: { my_custom_tag: '事项相关场景' },
        env: { MYVAR: 'contacts' },
      }
  },
};

function defaultSetup() {
  // setupdata()
  // setuptest()
  console.log('setup阶段开始执行');
}

function defaultTeardown(data) {
  // teardowndata()
  // teardowntest()
}

function defaultScenariosItem(data) {
  console.log(data, 'main@@@@@@@@@');
  // 基础配置
  // testmanagerScenarios.testmanager_basic();
  // // 主流程
  // testmanagerScenarios.testmanager_main_flow();
  // testmanagerScenarios.testmanager_excution();
  // // 导入场景
  // testmanagerScenarios.testmanager_importfile_flow();
  // testmanagerScenarios.testmanager_importjsonl_flow();
  // // 审批场景
  // testmanagerScenarios.testmanager_approve();
}

// ============ 按当前环境选择入口并透传 ============
const selected = envEntries[ENV];

export const options = selected ? selected.options : defaultOptions;
export const setup = selected ? selected.setup : defaultSetup;
export const teardown = selected ? selected.teardown : defaultTeardown;
// k6 的 scenarios.exec 会按名字在入口模块里找导出函数，
// 因此各环境入口用到的 exec 函数名（如 scenarios_item）都要在这里透传；
// 以后某环境新增其他 exec 函数名时，同步加一行转发即可。
export const scenarios_item = selected ? selected.scenarios_item : defaultScenariosItem;
export default selected ? selected.default : defaultScenariosItem;
