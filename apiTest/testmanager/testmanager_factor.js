import { ApiOptions } from '../../config/apiOptions.js';
import { generateUUID } from '../../tool/allTool.js';
import Assertions from '../../tool/assertion.js';
import { callApi } from '../core/apiCaller.js';
import { jsonRequestParams } from '../core/headers.js';

// 组合导入时忽略的用例字段清单（与前端 api-batch-copy-test-case-v4 请求一致）
const factorCaseIgnoreFields = [
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
	'r_test_manager_testTag',
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
	'r_test_manager_exclusiveActionFactors',
	'r_test_manager_automationScriptText',
	'r_test_manager_caseImportSourceId',
	'r_test_manager_pendingApplyUpdate',
	'r_test_manager_factorUpdatedTime',
	'r_test_manager_testEnvironment',
];

function buildBatchCopyCombinationImportPayload(params = {}) {
	const loginRes = params.loginRes || {};
	return {
		body: {
			sourceWorkspace: params.sourceWorkspace,
			caseIds: params.caseIds || [],
			repository: params.repository || 'root',
			isCrossWorkspace: params.isCrossWorkspace !== undefined ? params.isCrossWorkspace : true,
			isCopyRepo: params.isCopyRepo !== undefined ? params.isCopyRepo : true,
			enableCrossSpaceImportCaseDedupe: params.enableCrossSpaceImportCaseDedupe !== undefined ? params.enableCrossSpaceImportCaseDedupe : true,
			userId: params.userId,
			copyMode: params.copyMode || 'combinationImport',
			isBaseLineWorkspace: params.isBaseLineWorkspace !== undefined ? params.isBaseLineWorkspace : false,
			combinationImportParams: params.combinationImportParams || {
				needCombination: true,
				productIds: [],
				methodMap: {},
				selectedCombinationIdsMap: {},
			},
			caseIgnoreFields: params.caseIgnoreFields || factorCaseIgnoreFields,
			workspace: params.workspace,
			key: params.key || generateUUID(),
			applicationId: params.applicationId || ApiOptions.tenant,
			sessionToken: loginRes && loginRes.sessionToken,
		},
		applicationId: params.applicationId || ApiOptions.tenant,
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildCreateCaseUpdateLinkPayload(params = {}) {
	const loginRes = params.loginRes || {};
	return {
		body: {
			items: params.items || [],
			source: params.source,
			sourceKey: params.sourceKey,
			itemVersion: params.itemVersion,
			userId: params.userId,
			applicationId: params.applicationId || ApiOptions.tenant,
			sessionToken: loginRes && loginRes.sessionToken,
		},
		applicationId: params.applicationId || ApiOptions.tenant,
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildGetCaseUpdateLinksInItemsPayload(params = {}) {
	const loginRes = params.loginRes || {};
	return {
		body: {
			items: params.items || [],
			applicationId: params.applicationId || ApiOptions.tenant,
			sessionToken: loginRes && loginRes.sessionToken,
		},
		applicationId: params.applicationId || ApiOptions.tenant,
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

function buildUpdateCaseUpdateLinksAcceptedPayload(params = {}) {
	const loginRes = params.loginRes || {};
	return {
		body: {
			objectId: params.objectId,
			applicationId: params.applicationId || ApiOptions.tenant,
			sessionToken: loginRes && loginRes.sessionToken,
		},
		applicationId: params.applicationId || ApiOptions.tenant,
		sessionToken: loginRes && loginRes.sessionToken,
	};
}

const testManagerFactorRoutes = {
	apiBatchCopyTestCaseCombinationImport: {
		description: 'Import test cases with factor combination from source workspace.',
		method: 'POST',
		path: (params = {}) => `/apps/api/v1/${params.applicationId || ApiOptions.tenant}/apps/test_manager/environments/${params.environmentKey || 'production'}/webtriggers/api-batch-copy-test-case-v4`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: buildBatchCopyCombinationImportPayload,
		extraAssertions: [
			({ res }) => {
				const body = res.res.body ? res.res.json() : {};
				return [
					Assertions.equals(body.data?.status || 'status not found', 'ok'),
					Assertions.isString(body.data?.processBarKey, 'processBarKey'),
				];
			},
		],
	},
	apiCreateCaseUpdateLink: {
		description: 'Create case update link for imported cases.',
		method: 'POST',
		path: (params = {}) => `/apps/api/v1/${params.applicationId || ApiOptions.tenant}/apps/test_manager/environments/${params.environmentKey || 'production'}/webtriggers/api-create-case-update-link`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: buildCreateCaseUpdateLinkPayload,
		extraAssertions: [
			({ res }) => Assertions.equals(res.res.body ? (res.res.json() || {}).data?.status : 'status not found', 'ok'),
		],
	},
	apiGetCaseUpdateLinksInItems: {
		description: 'Get case update links for items.',
		method: 'POST',
		path: (params = {}) => `/apps/api/v1/${params.applicationId || ApiOptions.tenant}/apps/test_manager/environments/${params.environmentKey || 'production'}/webtriggers/api-get-case-update-links-in-items`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: buildGetCaseUpdateLinksInItemsPayload,
		extraAssertions: [
			({ result, params }) => [
				params.params?.subsetStr ? Assertions.isSubsetOf(params.params.subsetStr, result) : null,
				params.params?.isNotSubsetOf ? Assertions.isNotSubsetOf(params.params.isNotSubsetOf, result) : null,
				params.params?.arrayLength ? Assertions.arrayLength(result || [], params.params.arrayLength[1], params.params.arrayLength[0]) : null,
				params.params?.deepInclude ? Assertions.deepInclude(result, params.params.deepInclude) : null,
			],
		],
	},
	apiUpdateCaseUpdateLinksAccepted: {
		description: 'Mark case update links as accepted.',
		method: 'POST',
		path: (params = {}) => `/apps/api/v1/${params.applicationId || ApiOptions.tenant}/apps/test_manager/environments/${params.environmentKey || 'production'}/webtriggers/api-update-case-update-links-accepted`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: buildUpdateCaseUpdateLinksAcceptedPayload,
		extraAssertions: [
			({ res }) => Assertions.equals(res.res.body ? (res.res.json() || {}).data?.[0]?.status : 'status not found', 'ACCEPTED'),
		],
	},
};

function apiBatchCopyTestCaseCombinationImport(params = {}) {
	return callApi(testManagerFactorRoutes.apiBatchCopyTestCaseCombinationImport, params);
}

function apiCreateCaseUpdateLink(params = {}) {
	return callApi(testManagerFactorRoutes.apiCreateCaseUpdateLink, params);
}

function apiGetCaseUpdateLinksInItems(params = {}) {
	return callApi(testManagerFactorRoutes.apiGetCaseUpdateLinksInItems, params);
}

function apiUpdateCaseUpdateLinksAccepted(params = {}) {
	return callApi(testManagerFactorRoutes.apiUpdateCaseUpdateLinksAccepted, params);
}

export const testManagerFactorApi = {
	apiBatchCopyTestCaseCombinationImport,
	apiCreateCaseUpdateLink,
	apiGetCaseUpdateLinksInItems,
	apiUpdateCaseUpdateLinksAccepted,
};
