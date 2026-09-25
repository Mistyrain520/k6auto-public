import { group } from 'k6';
import { storymapApi } from '../../apiTest/sw/storymap.js';
import { readEnvData, consoleError } from '../../tool/allTool.js';

const STORYMAP_GROUP = 'SW场景.Storymap分页压测';
const DEFAULT_WORKSPACE_ID = 'ELEcLn3hbg';
const DEFAULT_PAGE_START = 1;
const DEFAULT_PAGE_END = 20;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_COLUMN_KEYS = 'type,title,key,planStart,planEnd,actualStart,actualEnd,status,progress,expirationReminder,assignee';

function envInt(name, fallback) {
  const value = __ENV[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} 必须是正整数，当前值: ${value}`);
  }
  return parsed;
}

export const options = {
  setupTimeout: '10m',
  teardownTimeout: '10m',
  discardResponseBodies: false,
  scenarios: {
    storymap_nodes_pagination: {
      executor: 'per-vu-iterations',
      vus: envInt('VUS', 10),
      iterations: envInt('ITERATIONS', 1),
      maxDuration: `${envInt('MAX_DURATION_MINUTES', 30)}m`,
      exec: 'scenarios_item',
      tags: { my_custom_tag: 'storymap分页查询压测' },
    },
  },
};

export function storymapNodesPagination(params = {}) {
  const data = readEnvData('data.json');
  const loginRes = params.loginRes || data.loginRes;
  if (!loginRes || !loginRes.Cookie || !loginRes.sessionToken) {
    consoleError({
      group: STORYMAP_GROUP,
      casename: '登录态检查',
      errorMessage: 'data.json 缺少 loginRes，请先执行 refreshLogin.js',
      description: '',
    });
    return null;
  }

  const workspaceId = params.workspaceId || data.syncWorkspace?.objectId || __ENV.WORKSPACE_ID || DEFAULT_WORKSPACE_ID;
  const pageStart = params.pageStart || envInt('PAGE_START', DEFAULT_PAGE_START);
  const pageEnd = params.pageEnd || envInt('PAGE_END', DEFAULT_PAGE_END);
  const pageSize = params.pageSize || envInt('PAGE_SIZE', DEFAULT_PAGE_SIZE);
  if (pageEnd < pageStart) {
    throw new Error(`PAGE_END=${pageEnd} 不能小于 PAGE_START=${pageStart}`);
  }

  for (let page = pageStart; page <= pageEnd; page += 1) {
    group(`storymap分页第${page}页`, () => {
      storymapApi.apiQueryStorymapNodes({
        loginRes,
        workspaceId,
        page,
        pageSize,
        dataScope: params.dataScope || 'merged',
        autoExpand: 0,
        columnKeys: params.columnKeys || DEFAULT_COLUMN_KEYS,
        group: STORYMAP_GROUP,
        casename: `查询storymap第${page}页`,
        isNotLog: false,
      });
    });
  }
}

export function scenarios_item() {
  storymapNodesPagination();
}

export default scenarios_item;
