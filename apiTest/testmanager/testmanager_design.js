import { ApiOptions } from '../../config/apiOptions.js';
import Assertions from '../../tool/assertion.js';
import { callApi } from '../core/apiCaller.js';
import { oneRequestParams } from '../core/headers.js';

function normalizeDesignResult(raw) {
	const tagList = raw && raw.data && raw.data.data && raw.data.data.tagList ? raw.data.data.tagList : [];
	return tagList.map((tag) => ({
		[tag.name]: {
			objectId: tag.objectId,
			key: tag.key,
			name: tag.name,
			type: tag.type,
		},
	}));
}

function parseDesignResponse(res, params = {}) {
	const raw = res.res.json();
	if (params.returnRaw) {
		return raw;
	}
	return normalizeDesignResult(raw);
}

function buildGetTestDesignByItemPayload(params = {}) {
	const loginRes = params.loginRes || {};
	const sessionToken = loginRes.sessionToken;
	return {
		body: {
			itemId: params.itemId,
			workspaceKey: params.workspaceKey,
			select: params.select || 'data',
			applicationId: params.applicationId || ApiOptions.tenant,
			sessionToken,
		},
		applicationId: params.applicationId || ApiOptions.tenant,
		sessionToken,
	};
}

function parseCombinationDimensionConfigResponse(res, params = {}) {
	const raw = res.res.json();
	if (params.returnRaw) {
		return raw;
	}

	const config = raw && raw.data && raw.data.data ? raw.data.data : raw && raw.data ? raw.data : raw;
	const dimensionData = config && config.dimensionData;

	if (!Array.isArray(dimensionData)) {
		return {};
	}

	return dimensionData.reduce((acc, item) => {
		if (item && item.name) {
			acc[item.name] = item.id || item.objectId || item.name;
		}
		return acc;
	}, {});
}

function buildGetCombinationDimensionConfigPayload(params = {}) {
	const loginRes = params.loginRes || {};
	const sessionToken = loginRes.sessionToken;
	return {
		body: {
			workspaceKey: params.workspaceKey,
			applicationId: params.applicationId || ApiOptions.tenant,
			sessionToken,
		},
		applicationId: params.applicationId || ApiOptions.tenant,
		sessionToken,
	};
}

function buildTestManagerWebtriggerPayload(params = {}) {
	const loginRes = params.loginRes || {};
	const sessionToken = loginRes.sessionToken;
	return {
		body: {
			...(params.body || {}),
			applicationId: params.applicationId || ApiOptions.tenant,
			sessionToken,
		},
		applicationId: params.applicationId || ApiOptions.tenant,
		sessionToken,
	};
}

function parseTestManagerWebtriggerResponse(res, params = {}) {
	let raw;
	try {
		raw = res.res.json();
	} catch (err) {
		// 兼容空 body 或非 JSON 响应（如 generateCombineCaseDraft 可能返回空）
		raw = null;
	}
	if (params.returnRaw) {
		return raw;
	}
	return raw && raw.data !== undefined ? raw.data : raw;
}

function testManagerWebtriggerHeaders(params = {}) {
	return oneRequestParams(params, {
		headers: {
			'X-Parse-Application-Id': params.applicationId || ApiOptions.tenant,
			'X-Parse-Session-Token': params.loginRes && params.loginRes.sessionToken,
		},
	});
}

function assertWebtriggerBusinessStatus({ result }) {
	if (!result || result.status === undefined) {
		return [];
	}
	return [Assertions.equals(result.status, 'ok')];
}

const testManagerDesignRoutes = {
	apiGetTestDesignByItem: {
		description: 'Get test design data by item.',
		method: 'POST',
		path: (params = {}) => `/apps/api/v1/${params.applicationId || ApiOptions.tenant}/apps/test_manager/environments/${params.environmentKey || 'production'}/webtriggers/api-get-test-design-by-item`,
		headers: (params) => oneRequestParams(params, {
			headers: {
				'X-Parse-Application-Id': params.applicationId || ApiOptions.tenant,
				'X-Parse-Session-Token': params.loginRes && params.loginRes.sessionToken,
			},
		}),
		buildPayload: buildGetTestDesignByItemPayload,
		parseResponse: parseDesignResponse,
	},
	apiGetCombinationDimensionConfig: {
		description: 'Get combination dimension config.',
		method: 'POST',
		path: (params = {}) => `/apps/api/v1/${params.applicationId || ApiOptions.tenant}/apps/test_manager/environments/${params.environmentKey || 'production'}/webtriggers/api-get-combination-dimension-config`,
		headers: (params) => oneRequestParams(params, {
			headers: {
				'X-Parse-Application-Id': params.applicationId || ApiOptions.tenant,
				'X-Parse-Session-Token': params.loginRes && params.loginRes.sessionToken,
			},
		}),
		buildPayload: buildGetCombinationDimensionConfigPayload,
		parseResponse: parseCombinationDimensionConfigResponse,
	},
	apiQueryTestTag: {
		description: 'Query test design tags.',
		method: 'POST',
		path: (params = {}) => `/apps/api/v1/${params.applicationId || ApiOptions.tenant}/apps/test_manager/environments/${params.environmentKey || 'production'}/webtriggers/api-query-test-tag`,
		headers: testManagerWebtriggerHeaders,
		buildPayload: buildTestManagerWebtriggerPayload,
		parseResponse: parseTestManagerWebtriggerResponse,
		extraAssertions: assertWebtriggerBusinessStatus,
	},
	apiUpdateTestDesign: {
		description: 'Update test design mind data.',
		method: 'POST',
		path: (params = {}) => `/apps/api/v1/${params.applicationId || ApiOptions.tenant}/apps/test_manager/environments/${params.environmentKey || 'production'}/webtriggers/api-update-test-design`,
		headers: testManagerWebtriggerHeaders,
		buildPayload: buildTestManagerWebtriggerPayload,
		parseResponse: parseTestManagerWebtriggerResponse,
		extraAssertions: assertWebtriggerBusinessStatus,
	},
	apiUpdateTestDesignNode: {
		description: 'Update test design node draft data.',
		method: 'POST',
		path: (params = {}) => `/apps/api/v1/${params.applicationId || ApiOptions.tenant}/apps/test_manager/environments/${params.environmentKey || 'production'}/webtriggers/api-update-test-design-node`,
		headers: testManagerWebtriggerHeaders,
		buildPayload: buildTestManagerWebtriggerPayload,
		parseResponse: parseTestManagerWebtriggerResponse,
		extraAssertions: assertWebtriggerBusinessStatus,
	},
	apiBatchCreateCaseFromDraft: {
		description: 'Batch create test cases from draft.',
		method: 'POST',
		path: (params = {}) => `/apps/api/v1/${params.applicationId || ApiOptions.tenant}/apps/test_manager/environments/${params.environmentKey || 'production'}/webtriggers/api-batch-create-case-from-draft`,
		headers: testManagerWebtriggerHeaders,
		buildPayload: buildTestManagerWebtriggerPayload,
		parseResponse: parseTestManagerWebtriggerResponse,
		extraAssertions: assertWebtriggerBusinessStatus,
	},
};

function apiGetTestDesignByItem(params = {}) {
	return callApi(testManagerDesignRoutes.apiGetTestDesignByItem, params);
}

function apiGetCombinationDimensionConfig(params = {}) {
	return callApi(testManagerDesignRoutes.apiGetCombinationDimensionConfig, params);
}

function apiQueryTestTag(params = {}) {
	return callApi(testManagerDesignRoutes.apiQueryTestTag, params);
}

function apiUpdateTestDesign(params = {}) {
	return callApi(testManagerDesignRoutes.apiUpdateTestDesign, params);
}

function apiUpdateTestDesignNode(params = {}) {
	return callApi(testManagerDesignRoutes.apiUpdateTestDesignNode, params);
}

function apiBatchCreateCaseFromDraft(params = {}) {
	return callApi(testManagerDesignRoutes.apiBatchCreateCaseFromDraft, params);
}

export const testManagerDesignApi = {
	apiGetTestDesignByItem,
	apiGetCombinationDimensionConfig,
	apiQueryTestTag,
	apiUpdateTestDesign,
	apiUpdateTestDesignNode,
	apiBatchCreateCaseFromDraft,
};