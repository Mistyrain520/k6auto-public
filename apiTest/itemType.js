import { ApiOptions } from '../config/apiOptions.js';
import { commonApi } from './common.js';
import { callApi } from './core/apiCaller.js';
import { jsonRequestParams, textRequestParams } from './core/headers.js';

function buildItemTypeSchemePayload(params = {}) {
	const itemtypeList = [{
		key: params.key,
		children: [{
			key: params.key,
			objectId: params.objectId,
		}],
		expanded: true,
		objectId: params.objectId,
	}];

	return {
		hierarchy: JSON.stringify(itemtypeList),
		name: params.name,
		_ApplicationId: ApiOptions.tenant,
		_SessionToken: params.loginRes.sessionToken,
	};
}

function buildUpdateItemTypeSchemeHierarchyPayload(params = {}) {
	const queryResult = commonApi.apiqueryByParse({
		params: {},
		where: {
			objectId: params.objectId,
		},
		tablename: 'ItemTypeScheme',
		loginRes: params.loginRes,
		isNotLog: false,
		keys: 'name,key,objectId,hierarchy',
		group: params.group,
		casename: params.casename + '-查询原层级方案',
	});

	let existingHierarchy = [];
	if (queryResult && queryResult.results && queryResult.results[0] && queryResult.results[0].hierarchy) {
		try {
			existingHierarchy = JSON.parse(queryResult.results[0].hierarchy);
		} catch (e) {
			existingHierarchy = [];
		}
	}

	const merged = [...existingHierarchy];
	for (const item of params.hierarchy || []) {
		const exists = merged.find((current) => current.key === item.key);
		if (!exists) {
			merged.push(item);
		}
	}

	return {
		hierarchy: JSON.stringify(merged),
		_method: 'PUT',
		_ApplicationId: ApiOptions.tenant,
		_SessionToken: params.loginRes.sessionToken,
	};
}

const itemTypeRoutes = {
	apicreateItemType: {
		description: 'Create an item type.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/classes/ItemType`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: (params = {}) => ({
			name: params.name,
			key: params.key,
			icon: '/icons/Issue_Plan.svg',
			_ApplicationId: ApiOptions.tenant,
			_SessionToken: params.loginRes.sessionToken,
		}),
	},
	apidelByParse: {
		description: 'Delete a Parse class object.',
		method: 'POST',
		path: (params = {}) => `${ApiOptions.team}/parse/classes/${params.tablename}/${params.objectId}`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: (params = {}) => ({
			_method: 'DELETE',
			_ApplicationId: params.tenant || ApiOptions.tenant,
			_SessionToken: params.loginRes && params.loginRes.sessionToken,
		}),
	},
	apicreateItemTypeScheme: {
		description: 'Create an item type scheme.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/classes/ItemTypeScheme`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: buildItemTypeSchemePayload,
	},
	apiUpdateItemTypeSchemeHierarchy: {
		description: 'Merge and update item type scheme hierarchy.',
		method: 'POST',
		path: (params = {}) => `${ApiOptions.team}/parse/classes/ItemTypeScheme/${params.objectId}`,
		headers: (params) => textRequestParams(params, { addApplicationId: false }),
		buildPayload: buildUpdateItemTypeSchemeHierarchyPayload,
	},
};

function apicreateItemType(params = {}) {
	return callApi(itemTypeRoutes.apicreateItemType, params);
}

function apidelByParse(params = {}) {
	return callApi(itemTypeRoutes.apidelByParse, params);
}

function apicreateItemTypeScheme(params = {}) {
	return callApi(itemTypeRoutes.apicreateItemTypeScheme, params);
}

function apiUpdateItemTypeSchemeHierarchy(params = {}) {
	return callApi(itemTypeRoutes.apiUpdateItemTypeSchemeHierarchy, params);
}

export const itemTypeApi = {
	apicreateItemType,
	apidelByParse,
	apicreateItemTypeScheme,
	apiUpdateItemTypeSchemeHierarchy,
};
