import { ApiOptions } from '../config/apiOptions.js';
import Assertions from '../tool/assertion.js';
import { callApi } from './core/apiCaller.js';
import { jsonRequestParams, oneRequestParams } from './core/headers.js';

function buildParsePayload(params = {}, method = 'GET') {
	const loginRes = params.loginRes || {};
	return Object.assign({}, params.body || {}, {
		_method: method,
		_SessionToken: loginRes.sessionToken,
	});
}

function buildParseEditPayload(params = {}) {
	return Object.assign({}, params.body || {}, {
		_method: params.method || 'PUT',
	});
}

function buildParseQueryPayload(params = {}) {
	return buildParsePayload({
		body: {
			where: params.where || {},
			limit: params.limit || 100,
			order: params.order || 'createdAt',
			keys: params.keys || 'name,key,objectId',
			_method: 'GET',
			_ApplicationId: ApiOptions.tenant,
			_context: { skipDisplayedItemType: true },
		},
		loginRes: params.loginRes,
	}, 'GET');
}

const commonRoutes = {
	apiqueryByParse: {
		description: 'Query Parse class objects.',
		method: 'POST',
		path: (params = {}) => `${ApiOptions.team}/parse/classes/${params.tablename}`,
		headers: (params) => jsonRequestParams(params, {
			addApplicationId: false,
			sessionHeaderName: 'X-Parse-Session-Token',
		}),
		buildPayload: buildParseQueryPayload,
		extraAssertions: ({ result, params }) => (
			params.params?.arrayLength
				? [Assertions.arrayLength(result || [], params.params.arrayLength[1], params.params.arrayLength[0])]
				: []
		),
	},
	apieditByParse: {
		description: 'Edit a Parse class object.',
		method: 'POST',
		path: (params = {}) => `${ApiOptions.team}/parse/classes/${params.tablename}/${params.id}`,
		headers: (params) => jsonRequestParams(params, {
			timeout: '300s',
			sessionHeaderName: 'X-Parse-Session-Token',
		}),
		buildPayload: buildParseEditPayload,
	},
	apiSubscribePlugin: {
		description: 'Subscribe plugin to workspace.',
		method: 'PUT',
		path: (params = {}) => `/apps/api/v1/${ApiOptions.tenant}/appsWorkspace/${params.appKey}`,
		headers: oneRequestParams,
		buildPayload: (params = {}) => ({
			insert: params.insert || [],
			remove: params.remove || [],
			global: params.global || true,
			environmentKey: params.environmentKey || 'production',
		}),
	},
	apiSetEnvironment: {
		description: 'Set plugin environment.',
		method: 'PUT',
		path: (params = {}) => `/apps/api/v1/environment/${params.pluginId}`,
		headers: oneRequestParams,
		buildPayload: (params = {}) => ({
			env: params.env || {},
		}),
	},
	apiQueryMarketList: {
		description: 'Query market list.',
		method: 'GET',
		path: (params = {}) => {
			const environmentKeys = params.environmentKeys || ['production'];
			const queryParams = environmentKeys.map((key) => `environmentKeys%5B%5D=${encodeURIComponent(key)}`).join('&');
			return `/apps/api/v1/market/list${queryParams ? `?${queryParams}` : ''}`;
		},
		headers: oneRequestParams,
	},
	apiGetPluginDetail: {
		description: 'Get plugin environment detail.',
		method: 'GET',
		path: (params = {}) => {
			const environmentKey = params.environmentKey || 'production';
			return `/apps/api/v1/environment/${params.pluginId}/${environmentKey}`;
		},
		headers: oneRequestParams,
	},
};

function apiqueryByParse(params = {}) {
	return callApi(commonRoutes.apiqueryByParse, params);
}

function apieditByParse(params = {}) {
	return callApi(commonRoutes.apieditByParse, params);
}

function apiSubscribePlugin(params = {}) {
	return callApi(commonRoutes.apiSubscribePlugin, params);
}

function apiSetEnvironment(params = {}) {
	return callApi(commonRoutes.apiSetEnvironment, params);
}

function apiQueryMarketList(params = {}) {
	return callApi(commonRoutes.apiQueryMarketList, params);
}

function apiGetPluginDetail(params = {}) {
	return callApi(commonRoutes.apiGetPluginDetail, params);
}

export const commonApi = {
	apiqueryByParse,
	apieditByParse,
	apiSubscribePlugin,
	apiSetEnvironment,
	apiQueryMarketList,
	apiGetPluginDetail,
};
