import { ApiOptions } from '../../config/apiOptions.js';
import { callApi } from '../core/apiCaller.js';
import { oneRequestParams } from '../core/headers.js';

function workspaceQuery(params = {}) {
  return `tenant=${encodeURIComponent(ApiOptions.tenant)}&workspaceId=${encodeURIComponent(params.workspaceId || '')}`;
}

function storymapHeaders(params = {}) {
  return oneRequestParams(params, {
    headers: {
      'X-Parse-Application-Id': ApiOptions.tenant,
      'X-Parse-Session-Token': params.loginRes && params.loginRes.sessionToken,
      'X-Storymap-Browse-Items': '1',
      'X-Storymap-Embed': 'proxima',
      'X-Storymap-Proxima-Origin': ApiOptions.domainName,
    },
  });
}

const storymapRoutes = {
  apiQueryWorkspaceScope: {
    description: 'Query OA synchronized workspaces for storymap.',
    method: 'GET',
    path: () => '/storymap/api/storymap/workspace-scope',
    headers: storymapHeaders,
  },
  apiGetSyncMeta: {
    description: 'Get storymap synchronization mapping config.',
    method: 'GET',
    path: (params = {}) => `/storymap/api/storymap/meta?${workspaceQuery(params)}`,
    headers: storymapHeaders,
  },
  apiGetSyncFilters: {
    description: 'Get synchronized versions/filters for storymap.',
    method: 'GET',
    path: (params = {}) => `/storymap/api/storymap/meta/filters?${workspaceQuery(params)}`,
    headers: storymapHeaders,
  },
  apiQueryStorymapNodes: {
    description: 'Query storymap nodes with pagination.',
    method: 'GET',
    path: (params = {}) => {
      const columnKeys = params.columnKeys || 'type,title,key,planStart,planEnd,actualStart,actualEnd,status,progress,expirationReminder,assignee';
      const page = params.page || 1;
      const pageSize = params.pageSize || 20;
      const dataScope = params.dataScope || 'single';
      return `/storymap/api/storymap/nodes?${workspaceQuery(params)}&dataScope=${dataScope}&page=${page}&pageSize=${pageSize}&columnKeys=${encodeURIComponent(columnKeys)}&autoExpand=${params.autoExpand === undefined ? 1 : params.autoExpand}`;
    },
    headers: storymapHeaders,
  },
  apiQueryStorymapChildren: {
    description: 'Query storymap child rows by parent item id.',
    method: 'GET',
    path: (params = {}) => {
      const columnKeys = params.columnKeys || 'type,title,key,planStart,planEnd,actualStart,actualEnd,status,progress,expirationReminder,product,version';
      const page = params.page || 1;
      const pageSize = params.pageSize || 100;
      const skipCount = params.skipCount === undefined ? 1 : params.skipCount;
      const displayTypes = params.displayTypes || 'productRequirement';
      return `/storymap/api/storymap/children?${workspaceQuery(params)}&dataScope=${params.dataScope || 'merged'}&parentItemId=${encodeURIComponent(params.parentItemId || '')}&page=${page}&pageSize=${pageSize}&columnKeys=${encodeURIComponent(columnKeys)}&skipCount=${skipCount}&displayTypes=${encodeURIComponent(displayTypes)}`;
    },
    headers: storymapHeaders,
  },
};

function apiQueryWorkspaceScope(params = {}) {
  return callApi(storymapRoutes.apiQueryWorkspaceScope, params);
}

function apiGetSyncMeta(params = {}) {
  return callApi(storymapRoutes.apiGetSyncMeta, params);
}

function apiGetSyncFilters(params = {}) {
  return callApi(storymapRoutes.apiGetSyncFilters, params);
}

function apiQueryStorymapNodes(params = {}) {
  return callApi(storymapRoutes.apiQueryStorymapNodes, params);
}

function apiQueryStorymapChildren(params = {}) {
  return callApi(storymapRoutes.apiQueryStorymapChildren, params);
}

export const storymapApi = {
  apiQueryWorkspaceScope,
  apiGetSyncMeta,
  apiGetSyncFilters,
  apiQueryStorymapNodes,
  apiQueryStorymapChildren,
};
