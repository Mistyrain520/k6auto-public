import { storymapApi } from '../../apiTest/sw/storymap.js';
import { itemApi } from '../../apiTest/item.js';
import { workflowApi } from '../../apiTest/workflow.js';
import { readEnvData, writeEnvData, consoleError, consoleLog } from '../../tool/allTool.js';

// 可修改的对比规则：左边是 storymap columns 字段，右边是 search 返回 values 字段。
const SYNC_FIELD_MAPPING = {
  planStart: 'kfyjksrq',
  planEnd: 'psyjsxfrq',
  actualStart: 'xqkfrq',
  actualEnd: 'Date11',
};

// 需要对比的业务类型，对应 storymap columns.type。
const SYNC_TYPE_LABEL = '业务意向';

// 进度校验适用类型；命中后校验进度，其余类型继续向下查询子节点。
const PROGRESS_VALIDATE_TYPES = ['业务意向', '业务需求', '产品需求'];

// 进度校验规则：查询父事项等于当前 key 的子事项，Finished / 总数 得到期望进度。
const PROGRESS_PARENT_FIELD = '父事项';
const PROGRESS_CHILD_SEARCH_SIZE = 1000;

// 分页查询配置。
const STORYMAP_PAGE_SIZE = 20;
const STORYMAP_PAGE_COUNT = 200;
const STORYMAP_PAGE_START = 40;

// 子节点查询配置，与 storymap children 接口 curl 对齐。
const STORYMAP_CHILDREN_PAGE_SIZE = 100;
const STORYMAP_CHILDREN_PAGE_START = 1;
const STORYMAP_CHILDREN_DISPLAY_TYPES = 'productRequirement';

// 是否递归查询子节点；false 时只处理当前页 rows，不再向下查询 children。
const ENABLE_STORYMAP_CHILDREN_QUERY = false;

const SEARCH_FIELDS = ['objectId', 'id', 'rowId', 'key', 'itemType', ...Object.values(SYNC_FIELD_MAPPING)];

function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '-' || trimmed === '' ? '' : trimmed;
  }
  if (Array.isArray(value)) return value.map(normalizeValue).filter((item) => item !== '').join(',');
  if (typeof value === 'object') {
    if (value.value !== undefined) return normalizeValue(value.value);
    if (value.label !== undefined) return normalizeValue(value.label);
    if (value.iso !== undefined) return normalizeValue(value.iso);
    return '';
  }
  return String(value);
}

function normalizeDateValue(value) {
  if (typeof value === 'number' && value > 100000000000) {
    const local = new Date(value + 8 * 60 * 60 * 1000);
    const y = local.getUTCFullYear();
    const month = local.getUTCMonth() + 1;
    const day = local.getUTCDate();
    const m = month < 10 ? '0' + month : String(month);
    const d = day < 10 ? '0' + day : String(day);
    return `${y}-${m}-${d}`;
  }
  return normalizeValue(value);
}
function extractSearchField(item, fieldKey) {
  if (!item) return null;
  if (item.values && Object.prototype.hasOwnProperty.call(item.values, fieldKey)) return item.values[fieldKey];
  if (Object.prototype.hasOwnProperty.call(item, fieldKey)) return item[fieldKey];
  return null;
}

function collectItemKeys(rows) {
  const keys = [];
  const seen = {};
  for (const row of rows || []) {
    if (!row || row.rowType !== 'item') continue;
    const key = row.key || (row.columns && row.columns.key);
    if (!key || key === '-' || seen[key]) continue;
    seen[key] = true;
    keys.push(key);
  }
  return keys;
}

function shouldValidateProgress(row) {
  if (!row) return false;
  const label = row.displayTypeLabel || (row.columns && row.columns.type);
  return PROGRESS_VALIDATE_TYPES.includes(label);
}

function searchItemsByKey(loginRes, keys, group) {
  const map = {};
  if (!keys || keys.length === 0) return map;
  const keyList = keys.map((key) => `'${key}'`).join(',');
  const items = itemApi.search({
    loginRes,
    iql: `key in [${keyList}]`,
    size: Math.max(keys.length, 50),
    fields: SEARCH_FIELDS,
    group,
    casename: `search批量查询${keys.length}个key`,
  });
  for (const item of items || []) {
    const key = item && (item.key || (item.values && item.values.key));
    if (!key) continue;
    map[key] = item;
  }
  return map;
}

function compareBusinessIntentRows(rows, searchMap) {
  const steps = [];
  const summary = [];
  for (const row of rows || []) {
    if (!row || (row.columns && row.columns.type) !== SYNC_TYPE_LABEL) continue;
    const key = row.key || (row.columns && row.columns.key);
    if (!key) continue;
    const searchItem = searchMap[key];
    if (!searchItem) {
      const step = {
        name: `${key} 未在 search 结果中找到`,
        status: 'broken',
        parameters: [{ name: 'search结果', value: '未找到' }],
      };
      steps.push(step);
      summary.push({ key, status: 'not found' });
      continue;
    }
    for (const leftField of Object.keys(SYNC_FIELD_MAPPING)) {
      const rightField = SYNC_FIELD_MAPPING[leftField];
      const leftValue = normalizeDateValue(row.columns && row.columns[leftField]);
      const rightValue = normalizeDateValue(extractSearchField(searchItem, rightField));
      const passed = leftValue === rightValue;
      steps.push({
        name: `${key}.${leftField} 对比`,
        status: passed ? 'passed' : 'broken',
        parameters: [
          { name: 'storymap左边', value: leftValue || '-' },
          { name: 'search右边', value: rightValue || '-' },
        ],
      });
      summary.push({
        key,
        field: leftField,
        left: leftValue,
        right: rightValue,
        status: passed ? 'passed' : 'broken',
      });
    }
  }
  return { steps, summary };
}

function getWorkflowProgressNodes(loginRes, itemId, data, group) {
  if (!data.workflowProgressCache) data.workflowProgressCache = {};
  if (data.workflowProgressCache[itemId]) return data.workflowProgressCache[itemId];

  const workflow = workflowApi.apiGetItemWorkflow({
    loginRes,
    itemId,
    group,
    casename: `获取工作流${itemId}`,
  });
  if (!workflow || !Array.isArray(workflow.nodes)) return [];

  const cachedNodes = workflow.nodes
    .filter((node) => node && node.name !== undefined && node.progress !== undefined)
    .map((node) => ({ name: node.name, progress: node.progress }));
  data.workflowProgressCache[itemId] = cachedNodes;
  writeEnvData('data.json', data);
  return cachedNodes;
}

function validateProgress(rows, searchMap, loginRes, data, group) {
  const steps = [];
  const summary = [];
  for (const row of rows || []) {
    if (!shouldValidateProgress(row)) continue;
    const key = row.key || (row.columns && row.columns.key);
    if (!key) continue;

    const items = itemApi.search({
      loginRes,
      iql: `${PROGRESS_PARENT_FIELD} = '${key}'`,
      size: PROGRESS_CHILD_SEARCH_SIZE,
      fields: ['key', 'status'],
      group,
      casename: `search子事项${key}`,
    });
    const children = items || [];

    if (children.length > 0) {
      const finishedCount = children.filter((item) => item && item.status && item.status.type === 'Finished').length;
      const total = children.length;
      const expectedPercent = Math.round((finishedCount / total) * 100);
      const expectedLabel = `${expectedPercent}%`;
      const actualLabel = normalizeValue(row.columns && row.columns.progress);
      const passed = actualLabel === expectedLabel;
      steps.push({
        name: `${key}.progress 校验`,
        status: passed ? 'passed' : 'broken',
        parameters: [
          { name: 'storymap进度', value: actualLabel || '-' },
          { name: '期望进度', value: expectedLabel },
          { name: 'Finished子项数', value: `${finishedCount}` },
          { name: '子项总数', value: `${total}` },
        ],
      });
      summary.push({
        key,
        finishedCount,
        total,
        expected: expectedLabel,
        actual: actualLabel,
        status: passed ? 'passed' : 'broken',
      });
      continue;
    }

    const searchItem = searchMap[key];
    const itemId = row.itemObjectId || row.rowId || (searchItem && (searchItem.objectId || searchItem.id || searchItem.rowId));
    if (!itemId) {
      const step = {
        name: `${key}.progress 校验（无子事项）`,
        status: 'broken',
        parameters: [{ name: '事项id', value: '未找到' }],
      };
      steps.push(step);
      summary.push({ key, status: 'item id not found' });
      continue;
    }

    const workflowNodes = getWorkflowProgressNodes(loginRes, itemId, data, group);
    const statusName = (row.columns && row.columns.status) || (row.status && row.status.name) || '';
    const node = workflowNodes.find((item) => item.name === statusName);
    const actualLabel = normalizeValue(row.columns && row.columns.progress);

    if (!node) {
      const step = {
        name: `${key}.progress 校验（无子事项）`,
        status: 'broken',
        parameters: [
          { name: '工作流状态', value: statusName || '-' },
          { name: 'storymap进度', value: actualLabel || '-' },
        ],
      };
      steps.push(step);
      summary.push({ key, statusName, status: 'workflow node not found' });
      continue;
    }

    const expectedLabel = `${node.progress}%`;
    const passed = actualLabel === expectedLabel;
    steps.push({
      name: `${key}.progress 校验（无子事项）`,
      status: passed ? 'passed' : 'broken',
      parameters: [
        { name: 'storymap进度', value: actualLabel || '-' },
        { name: '期望进度', value: expectedLabel },
        { name: '工作流状态', value: statusName || '-' },
      ],
    });
    summary.push({
      key,
      statusName,
      expected: expectedLabel,
      actual: actualLabel,
      status: passed ? 'passed' : 'broken',
    });
  }
  return { steps, summary };
}

function queryStorymapChildrenPages(loginRes, workspaceId, parentItemId, group, params, stats) {
  // children 返回结构尚未实测，按 nodes 行结构（rows[].itemObjectId/displayTypeLabel/columns）解析，待验证。
  const rows = [];
  let page = STORYMAP_CHILDREN_PAGE_START;
  while (true) {
    stats.childApiCalls += 1;
    const nodes = storymapApi.apiQueryStorymapChildren({
      loginRes,
      workspaceId,
      parentItemId,
      page,
      pageSize: params.pageSize || STORYMAP_CHILDREN_PAGE_SIZE,
      dataScope: params.dataScope,
      skipCount: params.skipCount,
      columnKeys: params.columnKeys,
      displayTypes: params.displayTypes || STORYMAP_CHILDREN_DISPLAY_TYPES,
      group,
      casename: `查询子节点${parentItemId}第${page}页`,
    });
    const pageRows = (nodes && nodes.rows) || [];
    rows.push(...pageRows);
    if (pageRows.length === 0 || pageRows.length < STORYMAP_CHILDREN_PAGE_SIZE) {
      break;
    }
    page += 1;
  }
  return rows;
}

function collectStorymapProgress({ rows, searchMap, loginRes, workspaceId, data, group, progress, stats, params = {}, enableChildrenQuery = ENABLE_STORYMAP_CHILDREN_QUERY, depth = 0 }) {
  const pageProgress = { steps: [], summary: [] };
  const walk = (currentRows, currentSearchMap, currentDepth) => {
    for (const row of currentRows || []) {
      if (!row || row.rowType !== 'item') continue;
      stats.rows += 1;
      stats.maxDepth = Math.max(stats.maxDepth, currentDepth + 1);

      if (shouldValidateProgress(row)) {
        const rowResult = validateProgress([row], currentSearchMap, loginRes, data, group);
        pageProgress.steps.push(...rowResult.steps);
        pageProgress.summary.push(...rowResult.summary);
      }

      const itemObjectId = row.itemObjectId || row.rowId;
      if (!itemObjectId || !enableChildrenQuery) continue;

      const childRows = queryStorymapChildrenPages(loginRes, workspaceId, itemObjectId, group, params, stats);
      stats.childRows += childRows.length;
      if (childRows.length > 0) {
        walk(childRows, currentSearchMap, currentDepth + 1);
      }
    }
  };
  walk(rows, searchMap, depth);
  progress.steps.push(...pageProgress.steps);
  progress.summary.push(...pageProgress.summary);
  return pageProgress;
}

// search 返回结构尚未在 sw 环境实测；网络可达后按真实返回调整提取逻辑。
export function storymapOaSync(params = {}) {
  const group = 'SW场景.OA同步空间';
  const data = readEnvData('data.json');
  const loginRes = params.loginRes || data.loginRes;

  if (!loginRes || !loginRes.Cookie || !loginRes.sessionToken) {
    consoleError({
      group,
      casename: '登录态检查',
      errorMessage: 'data.json 缺少 loginRes，请先执行 refreshLogin.js',
      description: JSON.stringify(data.loginRes || null),
    });
    return null;
  }

  const workspaceId = params.workspaceId || data.syncWorkspace?.objectId || __ENV.WORKSPACE_ID;
  if (!workspaceId) {
    consoleError({
      group,
      casename: 'workspaceId检查',
      errorMessage: '缺少 workspaceId，请在 data.json 配置 syncWorkspace.objectId 或传入参数',
      description: '',
    });
    return null;
  }

  const workspaceScope = storymapApi.apiQueryWorkspaceScope({
    loginRes,
    group,
    casename: '查询OA同步空间',
  });
  const syncMeta = storymapApi.apiGetSyncMeta({
    loginRes,
    workspaceId,
    group,
    casename: '获取同步映射配置',
  });
  const syncFilters = storymapApi.apiGetSyncFilters({
    loginRes,
    workspaceId,
    group,
    casename: '获取同步后可用版本',
  });

  const pageSize = params.pageSize || STORYMAP_PAGE_SIZE;
  const pageCount = STORYMAP_PAGE_COUNT;
  const enableChildrenQuery = params.enableStorymapChildrenQuery === undefined ? ENABLE_STORYMAP_CHILDREN_QUERY : params.enableStorymapChildrenQuery;
  const childrenParams = {
    displayTypes: params.storymapChildrenDisplayTypes || STORYMAP_CHILDREN_DISPLAY_TYPES,
    pageSize: params.storymapChildrenPageSize,
    dataScope: params.storymapChildrenDataScope,
    skipCount: params.storymapChildrenSkipCount,
    columnKeys: params.storymapChildrenColumnKeys,
  };
  const comparison = { steps: [], summary: [] };
  const progress = { steps: [], summary: [] };
  const treeStats = { rows: 0, childApiCalls: 0, childRows: 0, maxDepth: 0 };
  const pageStats = [];
  let nodes = null;
  let searchMap = {};
  let totalRows = 0;
  let collectedKeys = 0;
  let foundKeys = 0;
  for (let page = STORYMAP_PAGE_START; page <= pageCount; page += 1) {
    console.log(`STORYMAP_PAGE_START page=${page}/${pageCount}`);
    nodes = storymapApi.apiQueryStorymapNodes({
      loginRes,
      workspaceId,
      page,
      pageSize,
      group,
      casename: `查询第${page}页数据`,
    });
    const pageRows = (nodes && nodes.rows) || [];
    console.log(`STORYMAP_PAGE_DONE page=${page} pageRows=${pageRows.length} totalRows=${totalRows + pageRows.length}`);
    if (pageRows.length === 0) {
      break;
    }

    const pageStart = new Date().getTime();
    const keys = collectItemKeys(pageRows);
    searchMap = searchItemsByKey(loginRes, keys, group);
    const pageComparison = compareBusinessIntentRows(pageRows, searchMap);
    const pageProgress = collectStorymapProgress({
      rows: pageRows,
      searchMap,
      loginRes,
      workspaceId,
      data,
      group,
      progress,
      stats: treeStats,
      params: childrenParams,
      enableChildrenQuery,
    });
    const pageStop = new Date().getTime();

    if (pageComparison.steps.length > 0) {
      consoleLog({
        group,
        casename: `业务意向字段一致性对比-第${page}页`,
        start: pageStart,
        stop: pageStop,
        description: JSON.stringify({
          page,
          rows: pageRows.length,
          keys: keys.length,
          compareCount: pageComparison.summary.length,
          failedCount: pageComparison.summary.filter((item) => item.status !== 'passed').length,
        }),
        steps: pageComparison.steps,
      });
    }
    if (pageProgress.steps.length > 0) {
      consoleLog({
        group,
        casename: `业务意向/业务需求/产品需求进度校验-第${page}页`,
        start: pageStart,
        stop: pageStop,
        description: JSON.stringify({
          page,
          total: pageProgress.summary.length,
          passed: pageProgress.summary.filter((item) => item.status === 'passed').length,
          failed: pageProgress.summary.filter((item) => item.status !== 'passed').length,
          treeRows: treeStats.rows,
          childApiCalls: treeStats.childApiCalls,
          childRows: treeStats.childRows,
          maxDepth: treeStats.maxDepth,
        }),
        steps: pageProgress.steps,
      });
    }

    comparison.steps.push(...pageComparison.steps);
    comparison.summary.push(...pageComparison.summary);

    totalRows += pageRows.length;
    collectedKeys += keys.length;
    foundKeys += Object.keys(searchMap).length;
    pageStats.push({ page, rows: pageRows.length, keys: keys.length });
  }

  return {
    workspaceScope,
    syncMeta,
    syncFilters,
    nodes,
    searchMap,
    comparison: comparison.summary,
    progress: progress.summary,
    childStats: treeStats,
  };
}

export default function () {
  storymapOaSync();
}
