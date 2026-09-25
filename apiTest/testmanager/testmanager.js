import { ApiOptions } from '../../config/apiOptions.js';
import { generateUUID } from '../../tool/allTool.js';
import Assertions from '../../tool/assertion.js';
import { callApi } from '../core/apiCaller.js';
import { jsonRequestParams } from '../core/headers.js';

const testmanagerFields = [
	'r_test_manager_linkType',
	'r_test_manager_linkItems',
	'r_test_manager_status',
	'r_test_manager_referenceCase',
	'r_test_manager_referenceCaseSnapshot',
	'r_test_manager_runReferenceConfiguration',
	'r_test_manager_caseStatus',
	'r_test_manager_caseExecutor',
	'r_test_manager_designee',
	'r_test_manager_executor',
	'r_test_manager_executeCount',
	'r_test_manager_executeTime',
	'r_test_manager_executeRecord',
	'r_test_manager_reviewRecord',
	'r_test_manager_reviewStatus',
	'r_test_manager_caseRun',
	'r_test_manager_reportOverviewData',
	'r_test_manager_reportChartGroup',
	'r_test_manager_reportTemplate',
	'r_test_manager_plan',
	'r_test_manager_executionCases',
	'r_test_manager_testCases',
	'r_test_manager_testPlans',
	'r_test_manager_testExecutions',
	'r_test_manager_testDefects',
	'r_test_manager_testDefectsDJI',
	'r_test_manager_executionDefects',
	'r_test_manager_runDetail',
	'r_test_manager_comment',
	'r_test_manager_referenceSet',
	'r_test_manager_isCaseUpdate',
	'r_test_manager_testDesign',
	'r_test_manager_testDesignNode',
	'r_test_manager_repositoryTime',
	'r_test_manager_storagedAt',
	'r_test_manager_data_level',
	'r_test_manager_productValues',
	'r_test_manager_productDimensionIds',
	'r_test_manager_testApproval',
	'r_test_manager_testApprovalSource',
	'r_test_manager_testApprovalCaseExecution',
	'r_test_manager_testConfigurationImage',
	'r_test_manager_configurationCase',
	'r_test_manager_runFactorRecord',
	'r_test_manager_automationScriptIdentifier',
	'r_test_manager_factorLevelCombinationId',
	'r_test_manager_combinationHash',
	'r_test_manager_testConfigurationVersion',
	'r_test_manager_automationKeyCase',
];

function buildQueryPayload(params = {}) {
	const { loginRes } = params;
	return {
		applicationId: ApiOptions.tenant,
		sessionToken: loginRes && loginRes.sessionToken,
		...(params.body || {}),
	};
}

function buildRepositoryPayload(params = {}) {
	const { loginRes } = params;
	return {
		parent: {
			__type: 'Pointer',
			className: 'test_manager_Repository',
			objectId: params.parentId || 'root',
		},
		workspaceKey: params.workspaceKey,
		name: params.name,
		sortIndex: params.sortIndex || new Date().getTime() * 1000,
		type: params.type || 'case',
		_ApplicationId: ApiOptions.tenant,
		_SessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildBatchCopyTestCaseV4Payload(params = {}) {
	const { loginRes, workspaceKey, workspaceId, itemIdList } = params;
	return {
		queryParams: {
			query: {
				workspaceKey,
				id: {
					operator: 'in',
					value: [...(itemIdList || [])],
				},
				type: 'TestCase',
			},
			selector: null,
			notNeedQuery: false,
			selectedRowKeys: [],
			selectAll: false,
			breadcrumbs: ['全部用例'],
		},
		isCrossWorkspace: params.isCrossWorkspace || false,
		sourceWorkspace: {
			key: workspaceKey,
			objectId: workspaceId,
		},
		workspace: {
			key: workspaceKey,
			objectId: workspaceId,
		},
		needSuffix: params.needSuffix || true,
		caseIgnoreFields: testmanagerFields,
		factorIgnoreFields: testmanagerFields,
		key: params.key || generateUUID(),
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildBatchCopyTestCaseV2Payload(params = {}) {
	const { loginRes, workspaceKey, workspace, itemIdList } = params;
	return {
		itemType: params.itemType || 'test_manager_detail',
		queryParams: {
			query: {
				workspaceKey,
				id: {
					operator: 'in',
					value: itemIdList || [],
				},
				type: 'TestCase',
			},
			selector: params.selector || '',
			notNeedQuery: params.notNeedQuery || false,
			selectedRowKeys: params.selectedRowKeys || [],
			selectAll: params.selectAll || false,
			breadcrumbs: params.breadcrumbs || ['全部用例'],
		},
		workspace,
		needSuffix: params.needSuffix !== undefined ? params.needSuffix : true,
		key: params.key || '',
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildBatchDeleteV2Payload(params = {}) {
	const { loginRes, workspaceKey, itemIdList } = params;
	return {
		queryParams: {
			query: {
				workspaceKey,
				id: {
					operator: 'in',
					value: itemIdList || [],
				},
				type: 'TestCase',
			},
			selector: params.selector || '',
			notNeedQuery: params.notNeedQuery || false,
			selectedRowKeys: params.selectedRowKeys || [],
			selectAll: params.selectAll || false,
		},
		key: params.key || generateUUID(),
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildBatchCreateTestRunV2Payload(params = {}) {
	const { loginRes, planId, executionId, workspaceId, workspaceKey } = params;
	const caseIds = params.caseIds || [];
	return {
		execution: {
			linkType: 'ExecutionLinkPlan',
			linkItems: [planId],
			type: 'TestExecution',
			sortIndex: new Date().getTime() * 1000,
			testPlans: [planId],
			testDefects: [],
			id: executionId,
			objectId: executionId,
			source: [planId],
			...(params.executionName ? { name: params.executionName } : {}),
			...(caseIds.length ? { executionCases: caseIds.length } : {}),
		},
		caseIds,
		caseVersion: params.caseVersion || {},
		cases: params.cases || [],
		workspace: {
			objectId: workspaceId,
			key: workspaceKey,
			...(params.workspaceName ? { name: params.workspaceName } : {}),
			isArchived: false,
		},
		planId,
		...(params.caseRunMap ? { caseRunMap: params.caseRunMap } : {}),
		key: params.key || generateUUID(),
		withProcess: params.withProcess || false,
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildQueryLinkedTestEntityPayload(params = {}) {
	const { loginRes, workspaceKey, sourceIds, selector } = params;
	return {
		descending: params.descending || [],
		onlySelectId: params.onlySelectId || false,
		query: {
			workspaceKey,
			...(params.query || {}),
		},
		linkType: params?.linkType || null,
		sourceIds: sourceIds || [],
		limit: params.limit || 99999,
		destinationType: params.destinationType || null,
		select: params.select || [
			'id',
			'referenceCase',
			'referenceCaseSnapshot',
			'designee',
			'executor',
			'sortIndex',
			'executeCount',
			'executeRecord',
			'executeTime',
			'status',
			'runDetail',
		],
		selector: selector || null,
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildBatchUpdateItemsV2Payload(params = {}) {
	const { loginRes, items, fields, update } = params;
	return {
		items: items || [],
		fields: fields || {},
		update: update || {},
		key: params.key || generateUUID(),
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildDeleteRepositoryPayload(params = {}) {
	const { loginRes, repositoryId } = params;
	return {
		requests: [{
			method: 'DELETE',
			path: `${ApiOptions.team}/parse/classes/test_manager_Repository/${repositoryId || 'error'}`,
			body: {},
		}],
		_ApplicationId: ApiOptions.tenant,
		_SessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildBatchUpdateWebtriggerPayload(params = {}) {
	const loginRes = params.loginRes || {};
	return {
		body: {
			data: params.data || [],
			onlyValues: params.onlyValues !== undefined ? params.onlyValues : true,
			isChangeStatus: params.isChangeStatus !== undefined ? params.isChangeStatus : false,
			returnRunStepHtml: params.returnRunStepHtml !== undefined ? params.returnRunStepHtml : false,
			skipCaseReviewStatusTransition: params.skipCaseReviewStatusTransition !== undefined ? params.skipCaseReviewStatusTransition : true,
			applicationId: params.applicationId || ApiOptions.tenant,
			sessionToken: loginRes && loginRes.sessionToken,
		},
		applicationId: params.applicationId || ApiOptions.tenant,
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildBindFactorsToTestEntityPayload(params = {}) {
	const loginRes = params.loginRes || {};
	return {
		body: {
			itemId: params.itemId,
			factorIds: params.factorIds || [],
			userId: params.userId,
			applicationId: params.applicationId || ApiOptions.tenant,
			sessionToken: loginRes && loginRes.sessionToken,
		},
		applicationId: params.applicationId || ApiOptions.tenant,
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

const testManagerRoutes = {
	apiqueryTestManager: {
		description: 'Query test manager entities.',
		method: 'POST',
		path: () => `/api/project/app/${ApiOptions.tenant}/test_manager/webhooks/api-query-test-entity`,
		headers: jsonRequestParams,
		buildPayload: buildQueryPayload,
		extraAssertions: [
			({ res }) => Assertions.equals(res.res.body ? (res.res.json() || {}).status : 'status not found', 'ok'),
			({ result, params }) => [
				params.params?.subsetStr ? Assertions.isSubsetOf(params.params.subsetStr, result) : null,
				params.params?.isNotSubsetOf ? Assertions.isNotSubsetOf(params.params.isNotSubsetOf, result) : null,
				params.params?.arrayLength ? Assertions.arrayLength(result || [], params.params.arrayLength[1], params.params.arrayLength[0]) : null,
				params.params?.deepInclude ? Assertions.deepInclude(result, params.params.deepInclude) : null,
			],
		],
	},
	apibatchUpdateTestManager: {
		description: 'Batch update test manager entities.',
		method: 'POST',
		path: () => `/api/project/app/${ApiOptions.tenant}/test_manager/webhooks/api-batch-update`,
		headers: jsonRequestParams,
		buildPayload: (params = {}) => ({
			sessionToken: params.loginRes && params.loginRes.sessionToken,
			data: params.data,
		}),
		extraAssertions: [
			({ res }) => Assertions.equals(res.res.body ? (res.res.json() || {}).status : 'status not found', 'ok'),
			({ result, params }) => params.params?.arrayLength
				? Assertions.arrayLength(result || [], params.params.arrayLength[1], params.params.arrayLength[0])
				: null,
		],
	},
	apibatchUpdate: {
		description: 'Batch update test manager entities via app webtrigger.',
		method: 'POST',
		path: (params = {}) => `/apps/api/v1/${params.applicationId || ApiOptions.tenant}/apps/test_manager/environments/${params.environmentKey || 'production'}/webtriggers/api-batch-update`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: buildBatchUpdateWebtriggerPayload,
		extraAssertions: [
			({ res }) => Assertions.equals(res.res.body ? (res.res.json() || {}).data?.status : 'status not found', 'ok'),
			({ result, params }) => params.params?.arrayLength
				? Assertions.arrayLength(result || [], params.params.arrayLength[1], params.params.arrayLength[0])
				: null,
		],
	},
	apiBindFactorsToTestEntity: {
		description: 'Bind test factors to a test entity (e.g. plan or case).',
		method: 'POST',
		path: (params = {}) => `/apps/api/v1/${params.applicationId || ApiOptions.tenant}/apps/test_manager/environments/${params.environmentKey || 'production'}/webtriggers/api-bind-factors-to-test-entity`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: buildBindFactorsToTestEntityPayload,
		extraAssertions: [
			({ res }) => {
				const body = res.res.body ? res.res.json() : {};
				return [
					Assertions.equals(body.data?.status || 'status not found', 'ok'),
					Assertions.hasProperty(body.data?.data, 'newFactorImageId'),
				];
			},
		],
	},
	apibatchDelete: {
		description: 'Batch delete test manager entities.',
		method: 'POST',
		path: () => `/apps/api/v1/${ApiOptions.tenant}/apps/test_manager/environments/production/webtriggers/api-batch-delete`,
		headers: jsonRequestParams,
		buildPayload: (params = {}) => {
			const { loginRes } = params;
			return {
				body: {
					ids: params.ids || [],
					applicationId: ApiOptions.tenant,
					sessionToken: loginRes && loginRes.sessionToken,
				},
				applicationId: ApiOptions.tenant,
				sessionToken: loginRes && loginRes.sessionToken,
			};
		},
		extraAssertions: [
			({ res }) => {
				const batch = res.res.body ? ((res.res.json() || {}).data?.data || {}) : {};
				return [
					Assertions.gte(batch.success, 1),
					Assertions.equals(batch.fail, 0),
				];
			},
		],
	},
	apiCreateTestManagerRepository: {
		description: 'Create a test manager repository.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/classes/test_manager_Repository`,
		headers: (params) => jsonRequestParams(params, { contentType: 'text/plain', addApplicationId: false }),
		buildPayload: buildRepositoryPayload,
	},
	apiBatchCopyTestCaseV4TestManager: {
		description: 'Batch copy test cases with v4 test manager webhook.',
		method: 'POST',
		path: () => `/api/project/app/${ApiOptions.tenant}/test_manager/webhooks/api-batch-copy-test-case-v4`,
		headers: jsonRequestParams,
		buildPayload: buildBatchCopyTestCaseV4Payload,
	},
	apiBatchCopyTestCaseV2: {
		description: 'Batch copy test cases with v2 test manager webhook.',
		method: 'POST',
		path: () => `/api/project/app/${ApiOptions.tenant}/test_manager/webhooks/api-batch-copy-test-case-v2`,
		headers: jsonRequestParams,
		buildPayload: buildBatchCopyTestCaseV2Payload,
	},
	apibatchDeletev2: {
		description: 'Batch delete test cases with query params.',
		method: 'POST',
		path: () => `/api/project/app/${ApiOptions.tenant}/test_manager/webhooks/api-batch-delete-v2`,
		headers: jsonRequestParams,
		buildPayload: buildBatchDeleteV2Payload,
		extraAssertions: [
			({ res }) => Assertions.equals(res.res.body ? (res.res.json() || {}).status : 'status not found', 'ok'),
		],
	},
	apiBatchCreateTestRunV2: {
		description: 'Batch create test runs linked to a plan and execution.',
		method: 'POST',
		path: () => `/api/project/app/${ApiOptions.tenant}/test_manager/webhooks/api-batch-create-test-run-v2`,
		headers: jsonRequestParams,
		buildPayload: buildBatchCreateTestRunV2Payload,
		extraAssertions: [
			({ result }) => Assertions.equals(result.status || 'status not found', 'ok'),
		],
	},
	apiQueryLinkedTestEntity: {
		description: 'Query linked test manager entities.',
		method: 'POST',
		path: () => `/api/project/app/${ApiOptions.tenant}/test_manager/webhooks/api-query-linked-test-entity`,
		headers: jsonRequestParams,
		buildPayload: buildQueryLinkedTestEntityPayload,
		extraAssertions: [
			({ result, params }) => [
				params.params?.subsetStr ? Assertions.isSubsetOf(params.params.subsetStr, result) : null,
				params.params?.arrayLength ? Assertions.arrayLength(result || [], params.params.arrayLength[1], params.params.arrayLength[0]) : null,
			],
		],
	},
	apibatchDeleteRun: {
		description: 'Batch delete test runs.',
		method: 'POST',
		path: () => `/api/project/app/${ApiOptions.tenant}/test_manager/webhooks/api-batch-delete-run`,
		headers: jsonRequestParams,
		buildPayload: (params = {}) => ({
			ids: params.ids || [],
			key: params.key || generateUUID(),
			sessionToken: params.loginRes && params.loginRes.sessionToken,
		}),
		extraAssertions: [
			({ result }) => Assertions.equals(result.status || 'status not found', 'ok'),
		],
	},
	apiBatchUpdateItemsV2: {
		description: 'Batch update test manager items.',
		method: 'POST',
		path: () => `/api/project/app/${ApiOptions.tenant}/test_manager/webhooks/api-batch-update-items-v2`,
		headers: jsonRequestParams,
		buildPayload: buildBatchUpdateItemsV2Payload,
		extraAssertions: [
			({ result }) => Assertions.equals(result.status || 'status not found', 'ok'),
		],
	},
	apiDeleteRepository: {
		description: 'Delete a test manager repository.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/batch`,
		headers: (params) => jsonRequestParams(params, { contentType: 'text/plain', addApplicationId: false }),
		buildPayload: buildDeleteRepositoryPayload,
		extraAssertions: [
			
		],
	},
};

function apiqueryTestManager(params = {}) {
	return callApi(testManagerRoutes.apiqueryTestManager, params);
}

function apibatchUpdateTestManager(params = {}) {
	return callApi(testManagerRoutes.apibatchUpdateTestManager, params);
}

function apibatchUpdate(params = {}) {
	return callApi(testManagerRoutes.apibatchUpdate, params);
}

function apiBindFactorsToTestEntity(params = {}) {
	return callApi(testManagerRoutes.apiBindFactorsToTestEntity, params);
}

function apibatchDelete(params = {}) {
	return callApi(testManagerRoutes.apibatchDelete, params);
}

function apiCreateTestManagerRepository(params = {}) {
	return callApi(testManagerRoutes.apiCreateTestManagerRepository, params);
}

function apiBatchCopyTestCaseV4TestManager(params = {}) {
	return callApi(testManagerRoutes.apiBatchCopyTestCaseV4TestManager, params);
}

function apiBatchCopyTestCaseV2(params = {}) {
	return callApi(testManagerRoutes.apiBatchCopyTestCaseV2, params);
}

function apibatchDeletev2(params = {}) {
	return callApi(testManagerRoutes.apibatchDeletev2, params);
}

function apiBatchCreateTestRunV2(params = {}) {
	return callApi(testManagerRoutes.apiBatchCreateTestRunV2, params);
}

function apiQueryLinkedTestEntity(params = {}) {
	return callApi(testManagerRoutes.apiQueryLinkedTestEntity, params);
}

function apibatchDeleteRun(params = {}) {
	return callApi(testManagerRoutes.apibatchDeleteRun, params);
}

function apiBatchUpdateItemsV2(params = {}) {
	return callApi(testManagerRoutes.apiBatchUpdateItemsV2, params);
}

function apiDeleteRepository(params = {}) {
	return callApi(testManagerRoutes.apiDeleteRepository, params);
}

export const testManagerApi = {
	apiqueryTestManager,
	apibatchUpdateTestManager,
	apibatchUpdate,
	apiBindFactorsToTestEntity,
	apibatchDelete,
	apiCreateTestManagerRepository,
	apiBatchCopyTestCaseV4TestManager,
	apiBatchCopyTestCaseV2,
	apibatchDeletev2,
	apiBatchCreateTestRunV2,
	apiQueryLinkedTestEntity,
	apibatchDeleteRun,
	apiBatchUpdateItemsV2,
	apiDeleteRepository,
};