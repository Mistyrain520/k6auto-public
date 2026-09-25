import { commonApi } from '../../apiTest/common.js';
import testmanagerBasicItem from '../basescenarios/testmanager_basicItem.js';
import { itemApi } from '../../apiTest/item.js';
import { testManagerApi } from '../../apiTest/testmanager/testmanager.js';
import { readEnvData } from '../../tool/allTool.js';
import { sleep } from 'k6';

export function testmanager_excution() {
	const data = readEnvData('data.json');
	const loginRes = data.loginRes;
	const group = '测试管理.测试任务场景';

	const case1 = testmanagerBasicItem.createTestcases(group);
	const case2 = testmanagerBasicItem.createTestcases(group);
	const plan = testmanagerBasicItem.createTestplan(group);
	const execution = testmanagerBasicItem.createTestExecutions(group, plan.objectId || 'error');
	const run = testmanagerBasicItem.createTestRun(group, data.myworkspace, [case1.objectId, case2.objectId], plan.objectId, execution.objectId, "PASSED", data?.admin);
	
	const cloneTaskRes = itemApi.apiclonetestManagerItem({
		loginRes,
		objectId: execution.objectId,
		workspace: data.myworkspace?.objectId || 'error',
		name: `复制任务-${execution.name || execution.objectId}`,
		progressBarKey: `batch-simply-clone-${data.suffix || ''}`,
		includeStatus: false,
		includeDescendant: false,
		fields: {
			'r_test_manager_plan': plan.objectId,
			'r_test_manager_linkItems': [plan.objectId],
			'r_test_manager_testPlans': [plan.objectId],
		},
		group,
		casename: '复制任务',
	});

	const clonedExecutionId = cloneTaskRes?.objectId || 'error';


	const cloneRunRes = itemApi.apisimpleCloneItems({
		loginRes,
		iql: `('workspaceKey' = '${data.myworkspace?.key || 'error'}' and 'test_manager_type' = 'TestRun' and 'test_manager_linkItems' = '${execution.objectId}') and 'test_manager_status' in ['PASSED']`,
		fields: {
			'r_test_manager_plan': plan.objectId,
			'r_test_manager_linkItems': [clonedExecutionId],
			'r_test_manager_testExecutions': [clonedExecutionId],
			'r_test_manager_status': 'TODO',
		},
		ignoreFields: ['r_test_manager_executeCount', 'r_test_manager_executeRecord', 'r_test_manager_executeTime', 'r_test_manager_executor', 'r_test_manager_testDefectsDJI'],
		context: { displayContext: 'test_manager' },
		asynchronous: true,
		postAction: ['planTestCase', 'resetRunStep'],
		extraParams: { testManagerPlan: plan.objectId },
		group,
		casename: '复制任务中的测试执行',
	});

	const processBarKey = cloneRunRes?.processBarKey;
	sleep(2);

	const processBarRes = commonApi.apiqueryByParse({
		loginRes,
		tablename: 'ProcessBar',
		where: {
			key: {
				$in: [processBarKey],
			},
		},
		limit: 1,
		keys: 'key,status,progress,objectId',
		params: {
			jsonpath: '$.results',
			arrayLength: ['=', 1],
		},
		group,
		casename: '查询复制进度',
	});
	sleep(2);
	testManagerApi.apiQueryLinkedTestEntity({
		loginRes,
		workspaceKey: data.myworkspace?.key || 'error',
		destinationType: 'TestRun',
		linkType: 'RunLinkExecution',
		sourceIds: [clonedExecutionId],
		selector: `'test_manager_referenceCase' in ['${case1.objectId}', '${case2.objectId}']`,
		query: {
			workspaceKey: data.myworkspace?.key || 'error',
			type: 'TestRun',
		},
		params: {
			jsonpath: '$.data.list[*].status',
			subsetStr: ['TODO', 'TODO'],
		},
		group,
		casename: '验证复制测试执行状态 TODO',
	});

	const keepStatusCloneTaskRes = itemApi.apiclonetestManagerItem({
		loginRes,
		objectId: execution.objectId,
		workspace: data.myworkspace?.objectId || 'error',
		name: `复制任务-保留状态-${execution.name || execution.objectId}`,
		progressBarKey: null,
		includeStatus: false,
		includeDescendant: false,
		fields: {
			'r_test_manager_plan': plan.objectId,
			'r_test_manager_linkItems': [plan.objectId],
			'r_test_manager_testPlans': [plan.objectId],
		},
		group,
		casename: '复制任务-保留执行状态',
	});
	sleep(2);
	const keepStatusClonedExecutionId = keepStatusCloneTaskRes?.objectId || 'error';

	const keepStatusCloneRunRes = itemApi.apisimpleCloneItems({
		loginRes,
		iql: `('workspaceKey' = '${data.myworkspace?.key || 'error'}' and 'test_manager_type' = 'TestRun' and 'test_manager_linkItems' = '${execution.objectId}') and 'test_manager_status' in ['PASSED']`,
		fields: {
			'r_test_manager_plan': plan.objectId,
			'r_test_manager_linkItems': [keepStatusClonedExecutionId],
			'r_test_manager_testExecutions': [keepStatusClonedExecutionId],
		},
		context: { displayContext: 'test_manager' },
		copyItemLinks: run || [],
		asynchronous: true,
		postAction: ['planTestCase'],
		extraParams: { testManagerPlan: plan.objectId },
		group,
		casename: '复制任务中的测试执行并保留执行状态',
	});

	const keepStatusProcessBarKey = keepStatusCloneRunRes?.processBarKey;

	sleep(3);

	commonApi.apiqueryByParse({
		loginRes,
		tablename: 'ProcessBar',
		where: {
			key: {
				$in: [keepStatusProcessBarKey],
			},
		},
		limit: 1,
		keys: 'key,status,progress,objectId',
		params: {
			jsonpath: '$.results',
			arrayLength: ['=', 1],
		},
		group,
		casename: '查询复制进度-保留执行状态',
	});

	testManagerApi.apiQueryLinkedTestEntity({
		loginRes,
		workspaceKey: data.myworkspace?.key || 'error',
		destinationType: 'TestRun',
		linkType: 'RunLinkExecution',
		sourceIds: [keepStatusClonedExecutionId],
		selector: `'test_manager_referenceCase' in ['${case1.objectId}', '${case2.objectId}']`,
		query: {
			workspaceKey: data.myworkspace?.key || 'error',
			type: 'TestRun',
		},
		params: {
			jsonpath: '$.data.list[*].status',
			subsetStr: ['PASSED', 'PASSED'],
		},
		group,
		casename: '验证复制测试执行状态 PASSED',
	});

	testManagerApi.apibatchDelete({
		loginRes,
		ids: [execution.objectId, clonedExecutionId, keepStatusClonedExecutionId],
		group,
		casename: '删除测试执行任务',
	});

	testManagerApi.apibatchDelete({
		loginRes,
		ids: [plan.objectId],
		group,
		casename: '删除测试计划',
	});

	testManagerApi.apibatchDeletev2({
		loginRes,
		workspaceKey: data.myworkspace?.key || 'error',
		itemIdList: [case1.objectId, case2.objectId],
		group,
		casename: '删除测试用例',
	});
}

export default function () {
	testmanager_excution();
}
