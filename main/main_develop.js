// 环境入口：develop（主线环境）
// 完整 k6 入口（options/setup/teardown/default），按需在此调整 develop 专属场景组合。
import { setupdata, setuptest } from '../scenarios/setupdata.js';
import { teardowndata, teardowntest } from '../scenarios/teardown.js';
import * as testmanagerScenarios from '../scenarios/testmanager_scenarios/index.js';

export const options = {
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

export function setup() {
  // setupdata()
  // setuptest()
  console.log('setup阶段开始执行');
}

export function teardown(data) {
  // teardowndata()
  // teardowntest()
}

export function scenarios_item(data) {
  console.log(data, '@@@@@@@@@');
  // 基础配置
  testmanagerScenarios.testmanager_basic();
  // 主流程
  testmanagerScenarios.testmanager_main_flow();
  testmanagerScenarios.testmanager_excution();
  // 导入场景
  testmanagerScenarios.testmanager_importfile_flow();
  testmanagerScenarios.testmanager_importjsonl_flow();
  // 审批场景
  testmanagerScenarios.testmanager_approve();
}

export default scenarios_item;
