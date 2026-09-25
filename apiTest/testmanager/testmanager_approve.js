import { ApiOptions } from '../../config/apiOptions.js';
import { generateUUID } from '../../tool/allTool.js';
import Assertions from '../../tool/assertion.js';
import { callApi } from '../core/apiCaller.js';
import { jsonRequestParams } from '../core/headers.js';

function buildBatchCreateTestApprovalItemsPayload(params = {}) {
	const { loginRes } = params;
	return {
		body: {
			sourceIds: params.sourceIds || [],
			type: params.type || 'TestApprovalCase',
			approvalId: params.approvalId,
			workspace: {
				objectId: params.workspace && params.workspace.objectId,
				key: params.workspace && params.workspace.key,
				name: params.workspace && params.workspace.name,
				isArchived: params.workspace && params.workspace.isArchived || false,
			},
			caseExecutionMap: params.caseExecutionMap || {},
			withProcess: params.withProcess !== undefined ? params.withProcess : true,
			...(params.sourceItemTypeKeyMap ? { sourceItemTypeKeyMap: params.sourceItemTypeKeyMap } : {}),
			key: params.key || generateUUID(),
			applicationId: ApiOptions.tenant,
			sessionToken: loginRes && loginRes.sessionToken,
		},
		applicationId: ApiOptions.tenant,
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildStatsTestApprovalPayload(params = {}) {
	const { loginRes } = params;
	return {
		body: {
			approvalIds: params.approvalIds || [],
			applicationId: ApiOptions.tenant,
			sessionToken: loginRes && loginRes.sessionToken,
		},
		applicationId: ApiOptions.tenant,
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildSubmitTestApprovalPayload(params = {}) {
	const { loginRes } = params;
	return {
		body: {
			approvalId: params.approvalId,
			workspace: params.workspace,
			applicationId: ApiOptions.tenant,
			sessionToken: loginRes && loginRes.sessionToken,
		},
		applicationId: ApiOptions.tenant,
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildBatchDeleteTestApprovalItemsPayload(params = {}) {
	const { loginRes } = params;
	return {
		body: {
			ids: params.ids || [],
			type: params.type,
			approvalId: params.approvalId,
			workspace: {
				objectId: params.workspace && params.workspace.objectId,
				key: params.workspace && params.workspace.key,
				name: params.workspace && params.workspace.name,
				isArchived: params.workspace && params.workspace.isArchived || false,
			},
			applicationId: ApiOptions.tenant,
			sessionToken: loginRes && loginRes.sessionToken,
		},
		applicationId: ApiOptions.tenant,
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

const testManagerApproveRoutes = {
	apiBatchCreateTestApprovalItems: {
		description: 'Batch create test approval items.',
		method: 'POST',
		path: () => `/apps/api/v1/${ApiOptions.tenant}/apps/test_manager/environments/production/webtriggers/api-batch-create-test-approval-items`,
		headers: jsonRequestParams,
		buildPayload: buildBatchCreateTestApprovalItemsPayload,
		extraAssertions: [
			({ result }) => Assertions.equals(result?.data?.status || result?.status || 'status not found', 'ok'),
		],
	},
	apiStatsTestApproval: {
		description: 'Query test approval statistics.',
		method: 'POST',
		path: () => `/apps/api/v1/${ApiOptions.tenant}/apps/test_manager/environments/production/webtriggers/api-stats-test-approval`,
		headers: jsonRequestParams,
		buildPayload: buildStatsTestApprovalPayload,
		parseResponse: (res) => res.res.json()?.data?.data || [],
		extraAssertions: [
			({ res, result, params }) => [
				params.params?.deepInclude ? Assertions.deepInclude(result, params.params.deepInclude) : null,
			],
		],
	},
	apiSubmitTestApproval: {
		description: 'Submit test approval.',
		method: 'POST',
		path: () => `/apps/api/v1/${ApiOptions.tenant}/apps/test_manager/environments/production/webtriggers/api-submit-test-approval`,
		headers: jsonRequestParams,
		buildPayload: buildSubmitTestApprovalPayload,
		extraAssertions: [
			({ result }) => Assertions.equals(result?.data?.status || result?.status || 'status not found', 'ok'),
		],
	},
	apiBatchDeleteTestApprovalItems: {
		description: 'Batch delete test approval items.',
		method: 'POST',
		path: () => `/apps/api/v1/${ApiOptions.tenant}/apps/test_manager/environments/production/webtriggers/api-batch-delete-test-approval-items`,
		headers: jsonRequestParams,
		buildPayload: buildBatchDeleteTestApprovalItemsPayload,
		extraAssertions: [
			({ result }) => Assertions.equals(result?.data?.status || result?.status || 'status not found', 'ok'),
		],
	},
};

function apiBatchCreateTestApprovalItems(params = {}) {
	return callApi(testManagerApproveRoutes.apiBatchCreateTestApprovalItems, params);
}

function apiStatsTestApproval(params = {}) {
	return callApi(testManagerApproveRoutes.apiStatsTestApproval, params);
}

function apiSubmitTestApproval(params = {}) {
	return callApi(testManagerApproveRoutes.apiSubmitTestApproval, params);
}

function apiBatchDeleteTestApprovalItems(params = {}) {
	return callApi(testManagerApproveRoutes.apiBatchDeleteTestApprovalItems, params);
}

export const testManagerApproveApi = {
	apiBatchCreateTestApprovalItems,
	apiStatsTestApproval,
	apiSubmitTestApproval,
	apiBatchDeleteTestApprovalItems,
};
