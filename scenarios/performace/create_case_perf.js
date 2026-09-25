import { group } from 'k6';
import { itemApi } from '../../apiTest/item.js';
import { testManagerApi } from '../../apiTest/testmanager/testmanager.js';
import { generateUUID, readEnvData } from '../../tool/allTool.js';
import k8sBaseScenario from '../basescenarios/k8sBaseScenario/baseScenario.js';

// ============ 性能压测：创建测试用例 ============
// 压测对象：创建测试用例完整动作
//   group1 创建用例事项（POST /api/team/parse/api/v2/items，复用 itemApi.apicreateItem）
//   group2 更新为测试用例类型（POST .../test_manager/webhooks/api-batch-update，复用 testManagerApi.apibatchUpdateTestManager）
// 压测模型：ramping-vus，VU 阶梯 1 → 10 → 20，各 10s
// 数据来源：
//   loginRes / myworkspace          <- data.json（当前环境）
//   itemTypes.test_manager_detail   <- dataTestmanager.json（当前环境）
//   压测分组：setup 阶段动态创建一次，所有迭代共用（不硬编码 ID）
// 用例名称用 generateUUID() 保证每次迭代唯一，避免并发冲突
const GROUP = '性能压测.创建用例';

// K8s 监控开关：冒烟验证时设 K8S_MONITOR_ENABLED=false 只跑压测场景
const K8S_MONITOR_ENABLED = __ENV.K8S_MONITOR_ENABLED !== 'false';

export const options = {
  setupTimeout: '10m',
  discardResponseBodies: false,
  scenarios: {
    create_case: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 1 },
        { duration: '10s', target: 10 },
        { duration: '10s', target: 20 },
      ],
      exec: 'scenarios_item',
      tags: { scene: '创建用例压测' },
    },
    ...(K8S_MONITOR_ENABLED ? {
      deployment_monitor: {
        executor: 'per-vu-iterations',
        vus: 1,
        iterations: 1,
        startTime: '0s',
        exec: 'monitor_deployment',
        tags: { scene: 'k8s监控' },
      },
    } : {}),
  },
};

// setup 只执行一次：读取当前环境登录态/业务数据，并动态创建压测分组
export function setup() {
  const data = readEnvData('data.json');
  const tmData = readEnvData('dataTestmanager.json');
  if (!data || !data.loginRes || !data.myworkspace) {
    throw new Error('data.json 缺少 loginRes/myworkspace，请先执行 config/refreshLogin.js');
  }
  const itemType = tmData && tmData.itemTypes && tmData.itemTypes.test_manager_detail;
  if (!itemType || !itemType.objectId) {
    throw new Error('dataTestmanager.json 缺少 itemTypes.test_manager_detail');
  }

  const repo = testManagerApi.apiCreateTestManagerRepository({
    loginRes: data.loginRes,
    workspaceKey: data.myworkspace.key,
    name: '压测分组' + (data.suffix || ''),
    returnBykey: ['objectId'],
    group: GROUP,
    casename: '创建压测分组',
  });

  return {
    loginRes: data.loginRes,
    workspaceId: data.myworkspace.objectId,
    itemTypeId: itemType.objectId,
    repositoryId: (repo && repo.objectId) || null,
  };
}

// 压测入口：每次迭代创建 1 个用例（创建事项 + 更新为测试用例类型）
export function scenarios_item(data) {
  const loginRes = data.loginRes;
  let itemId = null;

  group('创建用例事项', () => {
    const item = itemApi.apicreateItem({
      name: '压测用例' + generateUUID(),
      workspace: data.workspaceId,
      itemType: data.itemTypeId,
      loginRes,
      group: GROUP,
      casename: '创建测试用例事项',
      isNotLog: true,
    });
    itemId = (item && item.objectId) || null;
  });

  group('更新为测试用例类型', () => {
    if (!itemId) {
      return;
    }
    testManagerApi.apibatchUpdateTestManager({
      loginRes,
      data: [{
        objectId: itemId,
        repository: data.repositoryId,
        type: 'TestCase',
        detail: {
          productDimensionIds: [],
          steps: [{
            id: generateUUID(),
            data: [{ stringText: '压测步骤数据' }],
            result: [{ stringText: '压测预期结果' }],
            action: [{ stringText: '压测操作步骤' }],
            customFields: [],
          }],
        },
        sortIndex: new Date().getTime() * 1000,
      }],
      group: GROUP,
      casename: '更新为测试用例类型',
      isNotLog: true,
    });
  });
}

// deployment 监控：与压测场景并行执行，参数全部从 __ENV 读取（不硬编码）
export function monitor_deployment() {
  k8sBaseScenario.monitorK8sDeploymentsPeriodic({
    deploymentKeyword: __ENV.K8S_DEPLOYMENT_KEYWORD || 'runtime',
    samples: parseInt(__ENV.K8S_MONITOR_SAMPLES || '60', 10),
    intervalSeconds: parseInt(__ENV.K8S_MONITOR_INTERVAL || '2', 10),
    writeLog: true,
  });
}

export default scenarios_item;
