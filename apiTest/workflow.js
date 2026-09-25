import { ApiOptions } from '../config/apiOptions.js';
import { generateUUID } from '../tool/allTool.js';
import { callApi } from './core/apiCaller.js';
import { jsonRequestParams, textRequestParams } from './core/headers.js';

function buildCreateFlowPayload(params = {}) {
	return {
		name: params.name,
		nodes: [{
			left: 100,
			top: 80,
			id: 'start_node',
			key: 'Start',
			name: 'Start',
			statusId: 'start_node',
			type: 'Start',
			elementType: 'Node',
			anyTag: false,
		}, {
			left: 376,
			top: 257,
			id: params.statusKey2,
			key: 'InProgress',
			name: params.statusName2,
			statusId: params.statusKey2,
			type: 'Task',
			elementType: 'Node',
			anyTag: false,
		}, {
			left: 253,
			top: 133,
			id: params.statusKey1,
			key: 'InProgress',
			name: params.statusName1,
			statusId: params.statusKey1,
			type: 'Task',
			elementType: 'Node',
			anyTag: false,
		}],
		transitions: [{
			id: generateUUID(),
			name: '新建',
			source: {
				id: 'start_node',
				key: 'start_node',
				anchor: 'Right',
				name: 'Start',
			},
			target: {
				id: params.statusKey1,
				key: params.statusKey1,
				anchor: 'Left',
				name: params.statusName1,
			},
			sourceId: 'start_node',
			targetId: params.statusKey1,
			parameters: {},
			properties: [],
			anyTag: false,
		}, {
			id: generateUUID(),
			name: 'A到B',
			source: {
				id: params.statusKey1,
				key: params.statusKey1,
				anchor: 'Right',
				name: params.statusName1,
			},
			target: {
				id: params.statusKey2,
				key: params.statusKey2,
				anchor: 'Left',
				name: params.statusName2,
			},
			sourceId: params.statusKey1,
			targetId: params.statusKey2,
			parameters: {},
			properties: [],
			anyTag: false,
		}],
		step: 2,
		initial: {
			__type: 'Pointer',
			className: 'Status',
			objectId: params.statusKey1,
		},
		releaseStatus: true,
	};
}

function buildApprovalDecisionPayload(params = {}) {
	return {
		comment: params.comment || '',
		status: params.status || 'approved',
		isDelegateApprover: params.isDelegateApprover || false,
		isAppendApprover: params.isAppendApprover || false,
		isApprover: params.isApprover !== undefined ? params.isApprover : true,
	};
}

const workflowRoutes = {
	apicreateStatus: {
		description: 'Create a workflow status.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/classes/Status`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: (params = {}) => ({
			name: params.name,
			type: params.type,
			_context: {
				untranslatedName: params.name,
			},
			_ApplicationId: ApiOptions.tenant,
			_SessionToken: params.loginRes && params.loginRes.sessionToken,
		}),
	},
	apicreatFlow: {
		description: 'Create a workflow.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/api/workflows`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: buildCreateFlowPayload,
	},
	apiWorkflowScheme: {
		description: 'Create a workflow scheme.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/classes/WorkflowScheme`,
		headers: textRequestParams,
		buildPayload: (params = {}) => ({
			name: params.name,
			_ApplicationId: ApiOptions.tenant,
			_SessionToken: params.loginRes && params.loginRes.sessionToken,
		}),
	},
	apiWorkflowSchemeConfig: {
		description: 'Configure a workflow scheme.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/api/workflowSchemeConfig`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: (params = {}) => ({
			query: {
				workflowSchemeId: params.workflowSchemeId,
				itemTypeIds: params.itemTypeIds,
				workflowId: params.workflowId,
			},
		}),
	},
	apiGetApprovalStatus: {
		description: 'Get approval status by item and status.',
		method: 'GET',
		path: (params = {}) => `${ApiOptions.team}/parse/api/approvals/item/${params.itemId || 'error'}/status/${params.statusId || 'error'}`,
		headers: jsonRequestParams,
		buildPayload: () => undefined,
		parseResponse: (res) => {
			const body = res.res.json();
			return body?.approvalId || body?.data?.approvalId || null;
		},
	},
	apiGetItemWorkflow: {
		description: 'Get workflow for an item.',
		method: 'GET',
		path: (params = {}) => `${ApiOptions.team}/parse/api/workflows/item/${params.itemId || 'error'}`,
		headers: (params) => jsonRequestParams(params, {
			sessionHeaderName: 'X-Parse-Session-Token',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'X-PROXIMA-IN-SETTINGS': 'false',
			},
		}),
	},
	apiApprovalDecision: {
		description: 'Create approval decision.',
		method: 'POST',
		path: (params = {}) => `${ApiOptions.team}/parse/api/approvals/${params.approvalDecisionId || 'error'}/decisions`,
		headers: (params) => jsonRequestParams(params, {
			headers: {
				'X-PROXIMA-IN-SETTINGS': 'false',
			},
		}),
		buildPayload: buildApprovalDecisionPayload,
	},
};

function apicreateStatus(params = {}) {
	return callApi(workflowRoutes.apicreateStatus, params);
}

function apicreatFlow(params = {}) {
	return callApi(workflowRoutes.apicreatFlow, params);
}

function apiWorkflowScheme(params = {}) {
	return callApi(workflowRoutes.apiWorkflowScheme, params);
}

function apiWorkflowSchemeConfig(params = {}) {
	return callApi(workflowRoutes.apiWorkflowSchemeConfig, params);
}

function apiGetApprovalStatus(params = {}) {
	return callApi(workflowRoutes.apiGetApprovalStatus, params);
}

function apiGetItemWorkflow(params = {}) {
	return callApi(workflowRoutes.apiGetItemWorkflow, params);
}

function apiApprovalDecision(params = {}) {
	return callApi(workflowRoutes.apiApprovalDecision, params);
}

export const workflowApi = {
	apicreateStatus,
	apicreatFlow,
	apiWorkflowScheme,
	apiWorkflowSchemeConfig,
	apiGetApprovalStatus,
	apiGetItemWorkflow,
	apiApprovalDecision,
};
