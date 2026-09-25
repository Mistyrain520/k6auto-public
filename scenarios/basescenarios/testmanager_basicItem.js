import { generateUUID, getNowString } from '../../tool/allTool.js';
import { itemApi } from '../../apiTest/item.js';
import { testManagerApi } from '../../apiTest/testmanager/testmanager.js';
import { sleep } from 'k6';
import { getTestmanagerContext } from './testmanagerContext.js';

/*
    本场景不正式使用。提供快速创建测试管理实体方法。
*/


// Create a test case item with default step details.
// workspace 可选：不传时使用配置的 data.myworkspace，传时在指定空间中创建。
function createTestcases(group, workspace = null) {
    const { data, testmanagerData, loginRes } = getTestmanagerContext();
    let suffix = getNowString();
    let myitem = itemApi.apicreateItem({
			name: 'testcase' + (suffix || ''),
			workspace: workspace || data.myworkspace?.objectId || 'error',
			itemType: testmanagerData.itemTypes?.test_manager_detail?.objectId || 'error',
			loginRes: loginRes || null,
			group: group,
			casename: '创建测试用例事项'
		});
	testManagerApi.apibatchUpdateTestManager({
			loginRes: loginRes || null,
			data: [{
				objectId: myitem?.objectId || null,
                type: 'TestCase',
				detail: {
					"productDimensionIds": [],
					"steps": [
						{
						"id": generateUUID(),
						"data": [
							{
							"stringText": "333333"
							},
							{
							"type": "p",
							"children": [
								{
								"text": "333333"
								}
							],
							"id": "CASERwJkkV"
							}
						],
						"result": [
							{
							"stringText": "33333"
							},
							{
							"type": "p",
							"children": [
								{
								"text": "33333"
								}
							],
							"id": "SAy46ifiDi"
							}
						],
						"action": [
							{
							"stringText": "3333"
							},
							{
							"type": "p",
							"children": [
								{
								"text": "3333"
								}
							],
							"id": "59oMofzZZ-"
							}
						],
						"customFields": []
						}
					]
					},
				sortIndex: new Date().getTime() * 1000
			}],
			group: group,
			casename: '更新为测试用例类型'
		});
    return myitem;
}

// Create a test execution item and optionally link it to a test plan.
function createTestExecutions(group, planId = null) {
    const { data, testmanagerData, loginRes } = getTestmanagerContext();
    let suffix = getNowString();
    let myExecution = itemApi.apicreateItem({
            name: 'testexecution' + (suffix || ''),
            workspace: data.myworkspace?.objectId || 'error',
            itemType: testmanagerData.itemTypes?.test_manager_execution?.objectId || 'error',
            loginRes: loginRes || null,
            group: group,
            casename: '创建测试执行事项'
        });
    if (planId) {
		testManagerApi.apibatchUpdateTestManager({
			loginRes: loginRes || null,
			data: [{
				objectId: myExecution?.objectId || null,
				name: myExecution?.name || null,
				type: "TestExecution",
                linkType: "ExecutionLinkPlan",
                linkItems: {
                    action: "add",
                    value: [
                        planId || null //测试计划id
                    ]
                },
			}],
			group: group,
			casename: '更新为测试执行任务类型并且关联上测试计划'
		})
    }else{
        testManagerApi.apibatchUpdateTestManager({
			loginRes: loginRes || null,
			data: [{
				objectId: myExecution?.objectId || null,
				name: myExecution?.name || null,
				type: 'TestExecution'
			}],
			group: group,
			casename: '更新为测试执行任务类型'
		})
    }
    return myExecution;
}
// Create a test plan item.
function createTestplan (group) {
    const { data, testmanagerData, loginRes } = getTestmanagerContext();
    let suffix = getNowString();
    let myplan = itemApi.apicreateItem({
            name: 'testplan' + (suffix || ''),
            workspace: data.myworkspace?.objectId || 'error',
            itemType: testmanagerData.itemTypes?.test_manager_plan?.objectId || 'error',
            loginRes: loginRes || null,
            group: group,
            casename: '创建测试计划事项'
        });
    testManagerApi.apibatchUpdateTestManager({
        loginRes: loginRes || null,
        data: [{
            objectId: myplan?.objectId || null,
            type: 'TestPlan'
        }],
        group: group,
        casename: '更新为测试计划类型'
    })
    return myplan;
}

// Create a test approval item.
function createTestApprove(group) { 
    const { data, testmanagerData, loginRes } = getTestmanagerContext();
    let suffix = getNowString();
    let myapprove = itemApi.apicreateItem({
            name: 'testapprove' + (suffix || ''),
            workspace: data.myworkspace?.objectId || 'error',
            itemType: testmanagerData.itemTypes?.test_manager_approval?.objectId || 'error',
            loginRes: loginRes || null,
            group: group,
            casename: '创建测试审批事项'
        });
    testManagerApi.apibatchUpdateTestManager({
        loginRes: loginRes || null,
        data: [{
            objectId: myapprove?.objectId || null,
            type: 'TestApproval'
        }],
        group: group,
        casename: '更新为测试审批类型'
    })
    return myapprove;
}

// Create a test design item.
function createTestdesign(group) {
    const { data, testmanagerData, loginRes } = getTestmanagerContext();
    let suffix = getNowString();
    let mydesign = itemApi.apicreateItem({
            name: 'testdesign' + (suffix || ''),
            workspace: data.myworkspace?.objectId || 'error',
            itemType: testmanagerData.itemTypes?.test_manager_design?.objectId || 'error',
            loginRes: loginRes || null,
            group: group,
            casename: '创建测试设计事项'
        });
    testManagerApi.apibatchUpdateTestManager({
        loginRes: loginRes || null,
        data: [{
            objectId: mydesign?.objectId || null,
            type: 'TestDesign'
        }],
        group: group,
        casename: '更新为测试设计类型'
    })
    return mydesign;
}
// Create a test data factor item.
function createTestDataFactor(group) {
    const { data, testmanagerData, loginRes } = getTestmanagerContext();
    let suffix = getNowString();
    let mydatafactor = itemApi.apicreateItem({
            name: 'testdatafactor' + (suffix || ''),
            workspace: data.myworkspace?.objectId || 'error',
            itemType: testmanagerData.itemTypes?.test_manager_data_factor?.objectId || 'error',
            loginRes: loginRes || null,
            group: group,
            casename: '创建测试数据因子事项'
        });
    testManagerApi.apibatchUpdateTestManager({
        loginRes: loginRes || null,
        data: [{
            objectId: mydatafactor?.objectId || null,
            type: 'TestDataFactor'
        }],
        group: group,
        casename: '更新为测试数据因子类型'
    })
    return mydatafactor;
}
// Create a test action factor item.
function createTestActionFactor(group) {
    const { data, testmanagerData, loginRes } = getTestmanagerContext();
    let suffix = getNowString();
    let myactionfactor = itemApi.apicreateItem({
            name: 'testactionfactor' + (suffix || ''),
            workspace: data.myworkspace?.objectId || 'error',
            itemType: testmanagerData.itemTypes?.test_manager_action_factor?.objectId || 'error',
            loginRes: loginRes || null,
            group: group,
            casename: '创建测试动作因子事项'
        });
    testManagerApi.apibatchUpdateTestManager({
        loginRes: loginRes || null,
        data: [{
            objectId: myactionfactor?.objectId || null,
            type: 'TestActionFactor'
        }],
        group: group,
        casename: '更新为测试动作因子类型'
    })
    return myactionfactor;
}
// Create a test automation script item.
function createTestAutomationScript(group) {
    const { data, testmanagerData, loginRes } = getTestmanagerContext();
    let suffix = getNowString();
    let myautomation = itemApi.apicreateItem({
            name: 'testautomation' + (suffix || ''),
            workspace: data.myworkspace?.objectId || 'error',
            itemType: testmanagerData.itemTypes?.test_manager_automation_script?.objectId || 'error',
            loginRes: loginRes || null,
            group: group,
            casename: '创建测试自动化脚本事项'
        });
    testManagerApi.apibatchUpdateTestManager({
        loginRes: loginRes || null,
        data: [{
            objectId: myautomation?.objectId || null,
            type: 'TestAutomation'
        }],
        group: group,
        casename: '更新为测试自动化脚本'
    })
    return myautomation;
}
// Create test runs for cases and optionally update their execution status.
function createTestRun(group, workspace, caseIds, planId, executionId, runStatus = null, excutioner=null) {
    const { data, testmanagerData, loginRes } = getTestmanagerContext();
    const referenceCaseSelector = `"test_manager_referenceCase" in [${(caseIds || []).map((id) => `'${id}'`).join(', ')}]`;
    //批量创建测试运行，关联测试执行任务和测试用例
    testManagerApi.apiBatchCreateTestRunV2({
        loginRes: loginRes || null,
        workspaceKey: workspace?.key || 'error',
        workspaceId: workspace?.objectId || 'error',
        planId: planId || 'error',
        executionId: executionId || 'error',
        caseIds: caseIds,
        group: group,
        casename: '批量创建测试运行'
    })

    sleep(1)
    //查询测试运行，验证是否创建成功
    let run = testManagerApi.apiQueryLinkedTestEntity({
        params: {
            'jsonpath': '$.data.list[*].id',
            'arrayLength': ['=', 2]
        },
        loginRes: loginRes || null,
        linkType: 'RunLinkExecution',
        destinationType: 'TestRun',
        workspaceKey: workspace?.key || 'error',
        sourceIds: [executionId || null], //测试执行任务id
        selector: referenceCaseSelector, //查询关联了哪个测试用例的测试运行
        group: group,
        casename: '查询测试运行是否创建成功',
        });
    
    if (runStatus && excutioner) {
        //批量更新测试运行的状态为通过
        testManagerApi.apiBatchUpdateItemsV2({
            loginRes: loginRes || null,
            fields: {
                "values": {
                    "r_test_manager_status": runStatus,
                    "r_test_manager_executor": [
                        {
                            "deleted": false,
                            "value": excutioner?.objectId || 'error',
                            "nickname": excutioner?.nickname || 'error',
                            "username": excutioner?.username || 'error',
                            "label": `${excutioner?.nickname || 'error'}(${excutioner?.username || 'error'})`
                        }
                    ],
                    "r_test_manager_executeTime": Date.now()
                }
            },
            items: run || [],
            update: {
                "r_test_manager_executeCount": {
                    "increment": 1
                },
                    "r_test_manager_firstStatus": {
                    "setIfNull": runStatus
                },
                "r_test_manager_businessFinishTime": {
                    "setIfNull": Date.now()
                },
                "r_test_manager_executeRecord": {
                    "concat": [
                        {
                            "executor": {
                                "deleted": false,
                                "value": excutioner?.objectId || 'error',
                                "nickname": excutioner?.nickname || 'error',
                                "username": excutioner?.username || 'error',
                                "label": `${excutioner?.nickname || 'error'}(${excutioner?.username || 'error'})`
                                },
                            "executeTime": Date.now(),
                            "status": runStatus
                        }
                    ]
                },
                "r_test_manager_firstExecuteTime": {
                    "setIfNull": Date.now()
                }
            },
            group: group,
            casename: `批量更新测试执行状态为${runStatus}`,
        })
        sleep(1)
        //重新查询测试运行状态，验证是否更新成功
        testManagerApi.apiQueryLinkedTestEntity({
            params: {
                'jsonpath': '$.data.list[*].status',
                'subsetStr': [runStatus,runStatus]
            },
            loginRes: loginRes || null,
            workspaceKey: workspace?.key || 'error',
            destinationType: 'TestRun',
            linkType: 'RunLinkExecution',
            sourceIds: [executionId || null], //测试执行任务id
            selector: referenceCaseSelector, //查询关联了哪个测试用例的测试运行
            group: group,
            casename: `重新查询测试执行的状态，确实是否都是${runStatus}`,
        });
    return run;
    }
}
const testmanager_basicItem = {
        createTestcases,
        createTestExecutions,
        createTestplan,
        createTestRun,
	    createTestApprove,
	    createTestdesign,
	    createTestDataFactor,
	    createTestActionFactor,
	    createTestAutomationScript,
};

export default testmanager_basicItem;
