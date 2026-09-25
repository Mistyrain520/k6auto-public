import { commonApi } from '../../apiTest/common.js';
import { consoleError, readEnvData } from '../../tool/allTool.js';
import { workflowApi } from '../../apiTest/workflow.js';
import { testManagerApi } from '../../apiTest/testmanager/testmanager.js';
import { testManagerApproveApi } from '../../apiTest/testmanager/testmanager_approve.js';
import testmanager_basicItem from '../basescenarios/testmanager_basicItem.js';
import { sleep } from 'k6';

const APPROVAL_STATUS_KEYS = {
	pending: '[评审]评审中',
	approved: '[评审]评审通过',
	rejected: '[评审]评审不通过',
};
const APPROVAL_WORKFLOW_KEYS = {
	approved: '测试评审项目工作流',
	approval: '测试评审工作流',
}
const APPROVAL_ITEM_TYPE_NAMES = [
	'测试评审动作因子（内置）',
	'测试评审设计（内置）',
	'测试评审用例（内置）',
	'测试评审执行任务（内置）',
	'测试评审数据因子（内置）',
];

function buildApprovalStatusMap(approvalStatuses) {
	const results = approvalStatuses && approvalStatuses.results;
	const statusMap = {};
	const missing = [];

	for (const [key, name] of Object.entries(APPROVAL_STATUS_KEYS)) {
		const status = Array.isArray(results)
			? results.find((item) => item.name === name)
			: undefined;

		if (status && status.objectId) {
			statusMap[key] = status.objectId;
		} else {
			missing.push(name);
		}
	}
	return { statusMap, missing };
}

function buildApprovalConfig(statusMap) {
	const approvalStatusConfig = {
		pending: statusMap.pending,
		approved: statusMap.approved,
		rejected: statusMap.rejected,
	};
	return {
		disabledStatusList: [],
		planningLimitStatusList: [],
		statusConfig: {
			TestCase: approvalStatusConfig,
			TestDesign: approvalStatusConfig,
			TestApproval: approvalStatusConfig,
			TestExecution: approvalStatusConfig,
			TestDataFactor: approvalStatusConfig,
			TestActionFactor: approvalStatusConfig,
		},
		reviewConfig: {
			mode: 1,
		},
	};
}

/*
    本场景流程：
        读取测试管理全局配置
        查询内置评审状态：[评审]评审中、[评审]评审通过、[评审]评审不通过
        查询测试评审相关工作流
        查询测试评审相关内置事项类型
        将评审相关内置事项类型绑定到测试评审项目工作流
        将测试评审事项类型绑定到测试评审工作流
        配置测试管理全局评审状态
        创建测试评审事项
        创建测试用例事项，并规划进入测试评审中
        创建测试执行、测试设计、测试数据因子事项
        将测试设计、测试执行、测试数据因子分别规划进入测试评审中
        查询测试评审统计状态，校验用例、设计、任务、数据因子数量
        发起测试评审
        通过评审事项 objectId 和 [评审]评审中状态 objectId 查询评审审批流 ID
        查询评审事项、用例评审、设计评审、任务评审、因子评审状态，校验均为[评审]评审中
        调用工作流评审决策接口执行评审通过
        再次查询评审事项、用例评审、设计评审、任务评审、因子评审状态，校验均为[评审]评审通过

*/
export function testmanager_approve() {
	const data = readEnvData('data.json');
	const testmanagerData = readEnvData('dataTestmanager.json');

	const loginRes = data.loginRes;
	const group = '测试管理.审批场景';
	let sceneData = {};
	const testConfig = commonApi.apiqueryByParse({
		loginRes,
		tablename: 'test_manager_TestConfig',
		where: {
			global: true,
		},
		limit: 1,
		group,
		casename: '查询测试管理全局配置',
	});

	const approvalStatuses = commonApi.apiqueryByParse({
		loginRes,
		tablename: 'Status',
		where: {
			name: {
				$in: Object.values(APPROVAL_STATUS_KEYS),
			},
		},
		limit: Object.values(APPROVAL_STATUS_KEYS).length,
		group,
		casename: '查询审批状态',
	});
	const { statusMap, missing } = buildApprovalStatusMap(approvalStatuses);

	if (missing.length > 0) {
		consoleError({
			group,
			casename: '内置审批状态不齐全',
			errorMessage: `缺少审批状态: ${missing.join(', ')} 无法完成整体配置，不再继续执行`,
			description: JSON.stringify(approvalStatuses),
		});
		return;
	}
	const approvalWorkflows = commonApi.apiqueryByParse({
		loginRes,
		tablename: 'Workflow',
		where: {
			name: {
				$in: Object.values(APPROVAL_WORKFLOW_KEYS),
			},
		},
		keys: 'name,objectId',
		limit: Object.values(APPROVAL_WORKFLOW_KEYS).length,
		group,
		casename: '查询审批相关工作流',
	});
	if (approvalWorkflows.results.length !== Object.values(APPROVAL_WORKFLOW_KEYS).length){
		consoleError({
			group,
			casename: '内置审批工作流不齐全',
			errorMessage: `缺少审批工作流: ${Object.values(APPROVAL_WORKFLOW_KEYS).join(', ')} 无法完成整体配置，不再继续执行`,
			description: JSON.stringify(approvalWorkflows),
		})
	}
	const approvalItemTypes = commonApi.apiqueryByParse({
		loginRes,
		tablename: 'ItemType',
		where: {
			name: {
				$in: APPROVAL_ITEM_TYPE_NAMES,
			},
		},
		keys: 'key,objectId,name',
		limit: APPROVAL_ITEM_TYPE_NAMES.length,
		group,
		casename: '查询评审相关内置类型',
	});
	if (approvalItemTypes.results.length !== APPROVAL_ITEM_TYPE_NAMES.length){
		consoleError({
			group,
			casename: '评审相关内置类型不齐全',
			errorMessage: `缺少审批类型: ${APPROVAL_ITEM_TYPE_NAMES.join(', ')} 无法完成整体配置，不再继续执行`,
			description: JSON.stringify(approvalItemTypes),
		});
		return
	}
	const approvalWorkflowId = approvalWorkflows.results.find(
		(workflow) => workflow.name === APPROVAL_WORKFLOW_KEYS.approved
	)?.objectId || 'error';
	const reviewWorkflowId = approvalWorkflows.results.find(
		(workflow) => workflow.name === APPROVAL_WORKFLOW_KEYS.approval
	)?.objectId || 'error';
	workflowApi.apiWorkflowSchemeConfig({
		loginRes,
		workflowSchemeId: data.myFlowScheme.objectId,
		itemTypeIds: approvalItemTypes.results.map((item) => item.objectId),
		workflowId: approvalWorkflowId,
		group,
		casename: '配置评审对应工作流方案1',
	});
	workflowApi.apiWorkflowSchemeConfig({
		loginRes,
		workflowSchemeId: data.myFlowScheme.objectId,
		itemTypeIds: [
			testmanagerData.itemTypes?.test_manager_approval?.objectId || 'error',
		],
		workflowId: reviewWorkflowId,
		group,
		casename: '配置评审对应工作流方案2',
	});




	commonApi.apieditByParse({
		loginRes,
		tablename: 'test_manager_TestConfig',
		id: testConfig.results[0].objectId || 'error',
		body: {
			approvalConfig: buildApprovalConfig(statusMap),
			global: true,
		},
		group,
		casename: '配置评审相关状态',
	});
	const approveId = testmanager_basicItem.createTestApprove(group);
	const testcasesId = testmanager_basicItem.createTestcases(group);
	testManagerApproveApi.apiBatchCreateTestApprovalItems({
		loginRes,
		sourceIds: [testcasesId.objectId],
		type: 'TestApprovalCase',
		approvalId: approveId.objectId,
		workspace: {
			objectId: data.myworkspace.objectId,
			key: data.myworkspace.key,
			name: data.myworkspace.name,
			isArchived: false,
		},
		caseExecutionMap: {},
		withProcess: true,
		group,
		casename: '用例规划进入测试评审中',
	});
	const testExecutions = testmanager_basicItem.createTestExecutions(group);
	const testdesign = testmanager_basicItem.createTestdesign(group);
	const testDataFactor = testmanager_basicItem.createTestDataFactor(group);
	testManagerApproveApi.apiBatchCreateTestApprovalItems({
		loginRes,
		sourceIds: [testdesign.objectId],
		type: 'TestApprovalDesign',
		approvalId: approveId.objectId,
		workspace: {
			objectId: data.myworkspace.objectId,
			key: data.myworkspace.key,
			name: data.myworkspace.name,
			isArchived: false,
		},
		caseExecutionMap: {},
		withProcess: true,
		group,
		casename: '规划设计进入测试评审中',
	});
	testManagerApproveApi.apiBatchCreateTestApprovalItems({
		loginRes,
		sourceIds: [testExecutions.objectId],
		type: 'TestApprovalExecution',
		approvalId: approveId.objectId,
		workspace: {
			objectId: data.myworkspace.objectId,
			key: data.myworkspace.key,
			name: data.myworkspace.name,
			isArchived: false,
		},
		caseExecutionMap: {},
		withProcess: true,
		group,
		casename: '规划任务进入测试评审中',
	});
	testManagerApproveApi.apiBatchCreateTestApprovalItems({
		loginRes,
		sourceIds: [testDataFactor.objectId],
		type: 'TestFactor',
		approvalId: approveId.objectId,
		workspace: {
			objectId: data.myworkspace.objectId,
			key: data.myworkspace.key,
			name: data.myworkspace.name,
		},
		sourceItemTypeKeyMap: {
			[testDataFactor.objectId]: 'TestApprovalDataFactor',
		},
		withProcess: true,
		group,
		casename: '规划数据因子进入测试评审中',
	});
	sleep(2);


	let approvalStatsCheck = {};
	approvalStatsCheck[approveId.objectId] = {
                "TestApprovalCase": 1,
                "TestApprovalDesign": 1,
                "TestApprovalExecution": 1,
                "TestApprovalActionFactor": 0,
                "TestApprovalDataFactor": 1
            }
	const approvalStats = testManagerApproveApi.apiStatsTestApproval({
		params: {
			deepInclude: approvalStatsCheck,
		},
		loginRes,
		approvalIds: [approveId.objectId],
		group,
		casename: '查询测试评审统计状态',
	});
	console.log('测试评审统计状态', JSON.stringify(approvalStats));

	testManagerApproveApi.apiSubmitTestApproval({
		loginRes,
		approvalId: approveId.objectId,
		workspace: {
			objectId: data.myworkspace.objectId,
			key: data.myworkspace.key,
			name: data.myworkspace.name,
			isArchived: false,
		},
		group,
		casename: '发起测试评审',
	});

	sleep(2);

	const approvalDecisionId = workflowApi.apiGetApprovalStatus({
		loginRes,
		itemId: approveId.objectId,
		statusId: statusMap.pending,
		group,
		casename: '查询评审审批流ID',
	});
	if (!approvalDecisionId) {
		consoleError({
			group,
			casename: '未找到评审审批流ID',
			errorMessage: '查询评审审批流ID接口没有返回 approvalId，无法执行评审通过',
			description: JSON.stringify({ itemId: approveId.objectId, statusId: statusMap.pending }),
		});
		return;
	}

	testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApproval',
			},
			fields: [
				'id',
				'itemType',
				'key',
				'name',
				'status',
			],
			selector: `('id' = '${approveId.objectId || 'error'}')`,
			notConcatField: true,
			offset: 0,
			limit: 10,
		},
		params: {
			jsonpath: '$.data.list[*].workflowStatus.name',
			subsetStr: [APPROVAL_STATUS_KEYS.pending],
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询评审事项状态',
	});

	testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApprovalCase',
			},
			selector: `('测试评审' = '${approveId.objectId || 'error'}')`,
			fields: [
				'id',
				'status',
				'name',
			],
			notConcatField: true,
			offset: 0,
			limit: 10,
		},
		params: {
			jsonpath: '$.data.list[*].workflowStatus.name',
			subsetStr: [APPROVAL_STATUS_KEYS.pending],
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询用例评审状态',
	});
	testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApprovalDesign',
			},
			selector: `('测试评审' = '${approveId.objectId || 'error'}')`,
			fields: [
				'id',
				'status',
				'name',
			],
			notConcatField: true,
			offset: 0,
			limit: 10,
		},
		params: {
			jsonpath: '$.data.list[*].workflowStatus.name',
			subsetStr: [APPROVAL_STATUS_KEYS.pending],
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询设计评审状态',
	});
	testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApprovalExecution',
			},
			selector: `('测试评审' = '${approveId.objectId || 'error'}')`,
			fields: [
				'id',
				'status',
				'name',
			],
			notConcatField: true,
			offset: 0,
			limit: 10,
		},
		params: {
			jsonpath: '$.data.list[*].workflowStatus.name',
			subsetStr: [APPROVAL_STATUS_KEYS.pending],
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询任务评审状态',
	});
	testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApprovalFactor',
			},
			selector: `('测试评审' = '${approveId.objectId || 'error'}')`,
			fields: [
				'id',
				'status',
				'name',
			],
			notConcatField: true,
			offset: 0,
			limit: 10,
		},
		params: {
			jsonpath: '$.data.list[*].workflowStatus.name',
			subsetStr: [APPROVAL_STATUS_KEYS.pending],
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询数据因子评审状态',
	});
	workflowApi.apiApprovalDecision({
		loginRes,
		approvalDecisionId,
		comment: '111',
		status: 'approved',
		isDelegateApprover: false,
		isAppendApprover: false,
		isApprover: true,
		group,
		casename: '评审通过',
	});

	sleep(2);

	testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApproval',
			},
			fields: [
				'id',
				'itemType',
				'key',
				'name',
				'status',
			],
			selector: `('id' = '${approveId.objectId || 'error'}')`,
			notConcatField: true,
			offset: 0,
			limit: 10,
		},
		params: {
			jsonpath: '$.data.list[*].workflowStatus.name',
			subsetStr: [APPROVAL_STATUS_KEYS.approved],
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询评审事项通过状态',
	});
	testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApprovalCase',
			},
			selector: `('测试评审' = '${approveId.objectId || 'error'}')`,
			fields: [
				'id',
				'status',
				'name',
			],
			notConcatField: true,
			offset: 0,
			limit: 10,
		},
		params: {
			jsonpath: '$.data.list[*].workflowStatus.name',
			subsetStr: [APPROVAL_STATUS_KEYS.approved],
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询用例评审通过状态',
	});
	testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApprovalDesign',
			},
			selector: `('测试评审' = '${approveId.objectId || 'error'}')`,
			fields: [
				'id',
				'status',
				'name',
			],
			notConcatField: true,
			offset: 0,
			limit: 10,
		},
		params: {
			jsonpath: '$.data.list[*].workflowStatus.name',
			subsetStr: [APPROVAL_STATUS_KEYS.approved],
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询设计评审通过状态',
	});
	testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApprovalExecution',
			},
			selector: `('测试评审' = '${approveId.objectId || 'error'}')`,
			fields: [
				'id',
				'status',
				'name',
			],
			notConcatField: true,
			offset: 0,
			limit: 10,
		},
		params: {
			jsonpath: '$.data.list[*].workflowStatus.name',
			subsetStr: [APPROVAL_STATUS_KEYS.approved],
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询任务评审通过状态',
	});
	testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApprovalFactor',
			},
			selector: `('测试评审' = '${approveId.objectId || 'error'}')`,
			fields: [
				'id',
				'status',
				'name',
			],
			notConcatField: true,
			offset: 0,
			limit: 10,
		},
		params: {
			jsonpath: '$.data.list[*].workflowStatus.name',
			subsetStr: [APPROVAL_STATUS_KEYS.approved],
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询数据因子评审通过状态',
	});

	// ============ 清理：查询评审下的用例/设计/执行任务/因子，再按类型批量删除评审内事项 ============
	const workspace = {
		objectId: data.myworkspace.objectId,
		key: data.myworkspace.key,
		name: data.myworkspace.name,
		isArchived: false,
	};
	const k6dateField = data.suffix ? `k6date${data.suffix}` : 'k6date07271726';

	// 1. 查询评审下的用例
	const approvalCaseIds = testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			descending: [],
			onlySelectId: false,
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApprovalCase',
			},
			selector: `('测试评审' = '${approveId.objectId || 'error'}')`,
			fields: ['id', 'r_test_manager_testApprovalSource', 'r_test_manager_testApprovalCaseExecution'],
			notConcatField: true,
			limit: 99999,
		},
		params: {
			jsonpath: '$.data.list[*].id',
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询评审下的用例',
	}) || [];

	// 2. 查询评审下的设计
	const approvalDesignIds = testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			descending: [],
			onlySelectId: false,
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApprovalDesign',
			},
			selector: `('测试评审' = '${approveId.objectId || 'error'}')`,
			fields: ['updatedBy', 'updatedAt', 'createdBy', 'createdAt', 'key', 'name', 'status', 'version', 'priority', 'assignee', 'workspace', k6dateField, 'r_test_manager_automationScripts'],
			offset: 0,
			limit: 10,
		},
		params: {
			jsonpath: '$.data.list[*].id',
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询评审下的设计',
	}) || [];

	// 3. 查询评审下的执行任务
	const approvalExecutionIds = testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			descending: [],
			onlySelectId: false,
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApprovalExecution',
			},
			selector: `('测试评审' = '${approveId.objectId || 'error'}')`,
			fields: ['updatedBy', 'updatedAt', 'createdBy', 'createdAt', 'key', 'name', 'status', 'version', 'priority', 'assignee', 'workspace', k6dateField, 'r_test_manager_automationScripts'],
			offset: 0,
			limit: 10,
		},
		params: {
			jsonpath: '$.data.list[*].id',
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询评审下的执行任务',
	}) || [];

	// 4. 查询评审下的因子
	const approvalFactorIds = testManagerApi.apiqueryTestManager({
		loginRes,
		body: {
			descending: [],
			onlySelectId: false,
			query: {
				workspaceKey: data.myworkspace.key,
				type: 'TestApprovalFactor',
			},
			selector: `('测试评审' = '${approveId.objectId || 'error'}')`,
			fields: ['updatedBy', 'updatedAt', 'createdBy', 'createdAt', 'key', 'name', 'status', 'version', 'priority', 'assignee', 'workspace', k6dateField, 'r_test_manager_automationScripts'],
			offset: 0,
			limit: 10,
		},
		params: {
			jsonpath: '$.data.list[*].id',
			arrayLength: ['>=', 1],
		},
		group,
		casename: '查询评审下的因子',
	}) || [];

	// 5. 按类型批量删除评审内事项（因子删除类型为 TestApprovalDataFactor）
	const approvalDeleteGroups = [
		{ ids: approvalCaseIds, type: 'TestApprovalCase', name: '用例' },
		{ ids: approvalDesignIds, type: 'TestApprovalDesign', name: '设计' },
		{ ids: approvalExecutionIds, type: 'TestApprovalExecution', name: '执行任务' },
		{ ids: approvalFactorIds, type: 'TestApprovalDataFactor', name: '数据因子' },
	];
	for (const groupItem of approvalDeleteGroups) {
		if (!Array.isArray(groupItem.ids) || groupItem.ids.length === 0) {
			continue;
		}
		testManagerApproveApi.apiBatchDeleteTestApprovalItems({
			loginRes,
			ids: groupItem.ids,
			type: groupItem.type,
			approvalId: approveId.objectId,
			workspace,
			group,
			casename: `删除评审下的${groupItem.name}`,
		});
	}

	// 6. 删除测试评审
	testManagerApi.apibatchDelete({
		loginRes,
		ids: [approveId?.objectId],
		group,
		casename: '删除测试评审',
	});

	// 7. 删除执行任务（任务）及其关联的测试计划
	testManagerApi.apibatchDelete({
		loginRes,
		ids: [testExecutions?.objectId],
		group,
		casename: '删除任务',
	});
	const linkedPlanIds = testManagerApi.apiQueryLinkedTestEntity({
		loginRes,
		workspaceKey: data.myworkspace.key,
		destinationType: 'TestPlan',
		linkType: 'ExecutionLinkPlan',
		sourceIds: [testExecutions?.objectId],
		query: {
			workspaceKey: data.myworkspace.key,
			type: 'TestPlan',
		},
		params: {
			jsonpath: '$.data.list[*].id',
		},
		group,
		casename: '查询执行任务关联的计划',
	}) || [];
	if (Array.isArray(linkedPlanIds) && linkedPlanIds.length > 0) {
		testManagerApi.apibatchDelete({
			loginRes,
			ids: linkedPlanIds,
			group,
			casename: '删除计划',
		});
	}

	// 8. 删除测试用例
	testManagerApi.apibatchDeletev2({
		loginRes,
		workspaceKey: data.myworkspace.key,
		itemIdList: [testcasesId?.objectId],
		group,
		casename: '删除用例',
	});

	// 9. 删除数据因子
	testManagerApi.apibatchDelete({
		loginRes,
		ids: [testDataFactor?.objectId],
		group,
		casename: '删除因子',
	});

	// 10. 删除设计
	testManagerApi.apibatchDelete({
		loginRes,
		ids: [testdesign?.objectId],
		group,
		casename: '删除设计',
	});
}

export default function () {
	testmanager_approve();
}
