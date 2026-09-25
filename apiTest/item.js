import { ApiOptions } from '../config/apiOptions.js';
import Assertions from '../tool/assertion.js';
import { callApi } from './core/apiCaller.js';
import { jsonRequestParams, oneRequestParams, textRequestParams } from './core/headers.js';

function buildBatchUpdateItemsPayload(params = {}) {
	return {
		cluster: params.cluster !== undefined ? params.cluster : 4,
		items: params.items || [],
		asynchronous: params.asynchronous !== undefined ? params.asynchronous : false,
	};
}

const itemRoutes = {
	apicreateItem: {
		description: 'Create an item.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/api/v2/items`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: (params = {}) => ({
			name: params.name,
			ancestors: params.ancestors || [],
			workspace: {
				__type: 'Pointer',
				className: 'Workspace',
				objectId: params.workspace,
			},
			itemType: {
				__type: 'Pointer',
				className: 'ItemType',
				objectId: params.itemType,
			},
			values: {
				__screen_type: 'create',
				...(params.values || {}),
			},
			reporter: params.reporter === undefined ? null : params.reporter,
			...(params.itemContext ? { itemContext: params.itemContext } : {}),
			parseContext: params.parseContext || { eventExtraData: {} },
		}),
		extraAssertions: [
			({ res }) => Assertions.hasProperty(res.res.body ? res.res.json() : null, 'objectId'),
		],
	},
	apideleteItems: {
		description: 'Delete items.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/functions/deleteItems`,
		headers: (params) => textRequestParams(params, { addApplicationId: false }),
		buildPayload: (params = {}) => ({
			itemIds: params.itemIds || [],
			_ApplicationId: ApiOptions.tenant,
			_SessionToken: params.loginRes && params.loginRes.sessionToken,
		}),
	},
	apiclonetestManagerItem: {
		description: 'Clone one item.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/api/items/clone`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: (params = {}) => ({
			objectId: params.objectId,
			workspace: params.workspace,
			name: params.name,
			progressBarKey: params.progressBarKey || null,
			includeStatus: params.includeStatus || false,
			includeDescendant: params.includeDescendant || false,
			fields: params.fields || {},
		}),
	},
	apisimpleCloneItems: {
		description: 'Clone item runs with batch simplyClone.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/api/v2/items/batch/simplyClone`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: (params = {}) => ({
			iql: params.iql || '',
			fields: params.fields || {},
			ignoreFields: params.ignoreFields || [],
			context: params.context || { displayContext: 'test_manager' },
			copyItemLinks: params.copyItemLinks || [],
			asynchronous: params.asynchronous || false,
			postAction: params.postAction || [],
			extraParams: params.extraParams || {},
		}),
	},
	apiBatchUpdateItems: {
		description: 'Batch update item values.',
		method: 'POST',
		path: () => '/parse/api/items/batch/update',
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: buildBatchUpdateItemsPayload,
		extraAssertions: [
			({ result }) => [
				Assertions.equals(result.status || 'status not found', 'finished'),
				Assertions.equals(result.count, 1),
			],
		],
	},
	apiGetBaseLineItem: {
		description: 'Get a baseline item by id.',
		method: 'GET',
		path: (params = {}) => `/parse/api/baseLineItems/${params.objectId}`,
		headers: (params) => oneRequestParams(params, {
			headers: {
				'X-Parse-Application-Id': params.applicationId || ApiOptions.tenant,
				'X-Parse-Session-Token': params.loginRes && params.loginRes.sessionToken,
			},
		}),
		extraAssertions: [
			({ result, params }) => [
				params.params?.subsetStr ? Assertions.isSubsetOf(params.params.subsetStr, result) : null,
				params.params?.isNotSubsetOf ? Assertions.isNotSubsetOf(params.params.isNotSubsetOf, result) : null,
				params.params?.arrayLength ? Assertions.arrayLength(result || [], params.params.arrayLength[1], params.params.arrayLength[0]) : null,
				params.params?.deepInclude ? Assertions.deepInclude(result, params.params.deepInclude) : null,
			],
		],
	},
	apiGetItem: {
		description: 'Get an item by id with raw values.',
		method: 'GET',
		path: (params = {}) => `/parse/api/items/${params.objectId}`,
		headers: (params) => oneRequestParams(params, {
			headers: {
				'X-Parse-Application-Id': params.applicationId || ApiOptions.tenant,
				'X-Parse-Session-Token': params.loginRes && params.loginRes.sessionToken,
			},
		}),
		extraAssertions: [
			({ result, params }) => [
				params.params?.subsetStr ? Assertions.isSubsetOf(params.params.subsetStr, result) : null,
				params.params?.isNotSubsetOf ? Assertions.isNotSubsetOf(params.params.isNotSubsetOf, result) : null,
				params.params?.arrayLength ? Assertions.arrayLength(result || [], params.params.arrayLength[1], params.params.arrayLength[0]) : null,
				params.params?.deepInclude ? Assertions.deepInclude(result, params.params.deepInclude) : null,
			],
		],
	},
	search: {
		description: 'Search items by key.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/api/search`,
		headers: (params) => jsonRequestParams(params, {
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'x-proxima-in-settings': 'false',
			},
		}),
		// 真实返回：{ code: 0, payload: { count, items: [{ id, objectId, key, ... }] } }
		parseResponse: (res) => {
			let body = null;
			try {
				body = res.res.json();
			} catch (error) {
				body = null;
			}
			return (body && body.payload && body.payload.items) || [];
		},
		buildPayload: (params = {}) => ({
			iql: params.iql,
			size: params.size || 50,
			from: params.from || 0,
			extend: params.extend || {},
			fields: params.fields || ['ancestors', 'assignee', 'createdAt', 'createdBy', 'earlyWarning', 'id', 'itemType', 'key', 'r_test_manager_testDesign', 'r_test_manager_testDesignNode', 'rowId', 'status', 'view_project', 'workspace'],
		}),
	},
};

function apicreateItem(params = {}) {
	return callApi(itemRoutes.apicreateItem, params);
}

function apideleteItems(params = {}) {
	return callApi(itemRoutes.apideleteItems, params);
}

function apiclonetestManagerItem(params = {}) {
	return callApi(itemRoutes.apiclonetestManagerItem, params);
}

function apisimpleCloneItems(params = {}) {
	return callApi(itemRoutes.apisimpleCloneItems, params);
}

function apiBatchUpdateItems(params = {}) {
	return callApi(itemRoutes.apiBatchUpdateItems, params);
}

function apiGetBaseLineItem(params = {}) {
	return callApi(itemRoutes.apiGetBaseLineItem, params);
}

function apiGetItem(params = {}) {
	return callApi(itemRoutes.apiGetItem, params);
}

function search(params = {}) {
	return callApi(itemRoutes.search, params);
}

export const itemApi = {
	apicreateItem,
	apideleteItems,
	apiclonetestManagerItem,
	apisimpleCloneItems,
	apiBatchUpdateItems,
	apiGetBaseLineItem,
	apiGetItem,
	search,
};
