import { group } from 'k6';
import { itemApi } from '../../apiTest/item.js';
import { readEnvData } from '../../tool/allTool.js';
import { subscribeLiveQuery } from '../../apiTest/livequery.js';

// ============ 性能压测：克隆任务及执行 ============
// 压测流程：
//   group1 复制测试执行任务（POST /parse/api/items/clone，复用 itemApi.apiclonetestManagerItem）
//   group2 复制任务下的执行（POST /parse/api/v2/items/batch/simplyClone，复用 itemApi.apisimpleCloneItems）
//   group3 订阅 LiveQuery 进度到 100%（复用 apiTest/livequery.js 的 subscribeLiveQuery）
// 压测模型：per-vu-iterations
// 数据来源：loginRes <- data.json（当前环境）
// 任务 ID / 计划 ID / 空间 ID 等均为写死值（来自 curl）
const GROUP = '性能压测.克隆任务';

export const options = {
  setupTimeout: '10m',
  discardResponseBodies: false,
  scenarios: {
    clone_task: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 5,
      maxDuration: '10m',
      exec: 'scenarios_item',
      tags: { scene: '克隆任务压测' },
    },
  },
};

export function setup() {
  const data = readEnvData('data.json');
  if (!data || !data.loginRes) {
    throw new Error('data.json 缺少 loginRes，请先执行 config/refreshLogin.js');
  }
  return { loginRes: data.loginRes };
}

export function scenarios_item(data) {
  const loginRes = data.loginRes;
  const EXECUTION_ID = 'Hol9ZOdZzR';
  const WORKSPACE_ID = 'ZqXUJtFCgB';
  const WORKSPACE_KEY = 'sfdsgg';
  const PLAN_ID = 'lyuCM7wown';

  let clonedExecutionId = null;

  group('复制测试执行任务', () => {
    const cloneTaskRes = itemApi.apiclonetestManagerItem({
      loginRes,
      objectId: EXECUTION_ID,
      workspace: WORKSPACE_ID,
      name: '并发_副本',
      progressBarKey: null,
      includeStatus: false,
      includeDescendant: false,
      fields: {
        'r_test_manager_plan': PLAN_ID,
        'r_test_manager_linkItems': [PLAN_ID],
        'r_test_manager_testPlans': [PLAN_ID],
      },
      group: GROUP,
      casename: '复制任务',
      isNotLog: false,
    });
    clonedExecutionId = cloneTaskRes?.objectId || 'error';
  });

  let processBarKey = null;
  group('复制任务中的测试执行', () => {
    const cloneRunRes = itemApi.apisimpleCloneItems({
      loginRes,
      iql: `('workspaceKey' = '${WORKSPACE_KEY}' and 'test_manager_type' = 'TestRun' and 'test_manager_linkItems' = '${EXECUTION_ID}') and 'test_manager_status' in ['TODO']`,
      fields: {
        'r_test_manager_plan': PLAN_ID,
        'r_test_manager_linkItems': [clonedExecutionId],
        'r_test_manager_testExecutions': [clonedExecutionId],
        'r_test_manager_status': 'TODO',
      },
      ignoreFields: ['r_test_manager_executeCount', 'r_test_manager_executeRecord', 'r_test_manager_executeTime', 'r_test_manager_executor', 'r_test_manager_testDefectsDJI'],
      context: { displayContext: 'test_manager', skipConsistencyCheck: true },
      asynchronous: true,
      postAction: ['planTestCase', 'resetRunStep'],
      extraParams: { testManagerPlan: PLAN_ID },
      group: GROUP,
      casename: '复制任务中的测试执行',
      isNotLog: false,
    });
    processBarKey = cloneRunRes?.processBarKey;
  });

  group('订阅LiveQuery进度', () => {
    if (!processBarKey) {
      console.log('⚠️ processBarKey 为空，跳过 LiveQuery 订阅');
      return;
    }
    subscribeLiveQuery({
      cookie: loginRes.Cookie,
      sessionToken: loginRes.sessionToken,
      className: 'ProcessBar',
      where: { key: processBarKey },
    });
  });
}

export default scenarios_item;
