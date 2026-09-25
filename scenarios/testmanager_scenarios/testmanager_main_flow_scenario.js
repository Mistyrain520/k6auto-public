import { itemApi } from '../../apiTest/item.js';
import { testManagerApi } from '../../apiTest/testmanager/testmanager.js';
import { commonApi } from '../../apiTest/common.js'
import { ApiOptions,testmanagerOptions } from '../../config/apiOptions.js';
import { generateUUID, initDataFromFilePath, consoleError, readEnvData } from '../../tool/allTool.js';
import { group, sleep } from 'k6';


/*
    本场景流程：
        创建分组
        创建用例1
        创建用例2
        复制用例1+用例2 （单个复制和批量复制是一样接口）
        查询列表用例，验证上面四个用例都存在
        创建计划事项
        更新事项为测试计划类型
        创建任务
        更新事项为测试任务类型
        再调一遍更新事项（api-batch-update）把任务和计划关联上
        创建测试执行（api-batch-create-test-run-v2）
        查询页面测试执行（apiQueryLinkedTestEntity）
        批量执行测试执行（update）
        批量删除测试执行
        删除测试执行任务
        删除计划
        批量删除用例
        删除所属分组
        
*/
export function testmanager_main_flow(){

    let data = readEnvData('data.json');
    let testmanagerData = readEnvData('dataTestmanager.json');


    let loginRes = data.loginRes
    let sceneData = {}

    let app = commonApi.apiGetPluginDetail({
        loginRes: loginRes || null,
        group: '测试管理.前置校验',
        casename: '查询插件详情',
        pluginId: 'test_manager'
    })
    if (!app.data?.objectId) {
        console.log("没有查询到插件详情，请手动检查是否订阅。本场景结束测试。")
        consoleError({
            'group': '测试管理.前置校验',
            'casename': '没有查询到插件详情，请手动检查是否订阅。本场景结束测试。',
            'errorMessage': '没有查询到插件详情，请手动检查是否订阅。本场景结束测试。'
        })
        return 
    }
    commonApi.apiSetEnvironment(
        {   pluginId: app.data?.objectId || 'error',
            env: testmanagerOptions.PLUGIN_ENV || 'error',
            loginRes: loginRes || null,
            group: '测试管理.前置校验',
            casename: '设置环境变量'
         }
     )

    let repo = testManagerApi.apiCreateTestManagerRepository({
        loginRes: loginRes || null,
        workspaceKey: data.myworkspace?.key || 'error',
        name: '测试分组' + (data.suffix || ''),
        group: '测试管理.主流程',
        casename: '创建测试用例分组',
        returnBykey: ['objectId']
    })
    sceneData.repo = repo

    let myitem = itemApi.apicreateItem({
        name: 'testitem' + (data.suffix || ''),
        workspace: data.myworkspace?.objectId || 'error',
        itemType: testmanagerData.itemTypes?.test_manager_detail?.objectId || 'error',
        loginRes: loginRes || null,
        group: '测试管理.主流程',
        casename: '创建测试用例事项'
    })

    let myitem1 = itemApi.apicreateItem({
            name: 'testitem1' + (data.suffix || ''),
            workspace: data.myworkspace?.objectId || 'error',
            itemType: testmanagerData.itemTypes?.test_manager_detail?.objectId || 'error',
            loginRes: loginRes || null,
            group: '测试管理.主流程',
            casename: '创建测试用例事项1'
        })

    sceneData.myitem = myitem
    sceneData.myitem1 = myitem1
    let updateRes = testManagerApi.apibatchUpdateTestManager({
        loginRes: loginRes || null,
        data: [{
            objectId: myitem?.objectId || null,
            repository: sceneData.repo?.objectId || null,
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
        group: '测试管理.主流程',
        casename: '更新为测试用例类型'
    })

    let updateRes1 = testManagerApi.apibatchUpdateTestManager({
        loginRes: loginRes || null,
        data: [{
            objectId: myitem1?.objectId || null,
            repository: sceneData.repo?.objectId || null,
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
        group: '测试管理.主流程',
        casename: '更新为测试用例类型1'
    })

    sleep(2) //等2秒，让更新生效，再去查询
    // 调用 apiqueryTestManager 查询测试用例，验证创建的用例没问题
    let queryRes = testManagerApi.apiqueryTestManager({
        params: {
            'jsonpath': '$.data.list[*].id',
            'subsetStr': [sceneData.myitem?.objectId, sceneData.myitem1?.objectId]
        },
        loginRes: loginRes || null,
        body: {
            descending: [],
            onlySelectId: false,
            query: {
                workspaceKey: data.myworkspace?.key || 'error',
                type: "TestCase"
            },
            selector: `('id' = '${sceneData.myitem?.objectId || 'error'}') or ('id' = '${sceneData.myitem1?.objectId || 'error'}')`,
            sortByRepositoryIds: [sceneData.repo?.objectId],
            fields: ["key", "name", "objectId", "repository", "type", "detail"],
            offset: 0,
            limit: 10
        },
        group: '测试管理.主流程',
        casename: '查询测创建的用例'
    })


    //复制用例，批量复制的接口
    let copyitem = testManagerApi.apiBatchCopyTestCaseV4TestManager({
        loginRes: loginRes || null,
        workspaceKey: data.myworkspace?.key || 'error',
        workspaceId: data.myworkspace?.objectId || 'error',
        itemIdList: [sceneData.myitem?.objectId || null, sceneData.myitem1?.objectId || null],
        group: '测试管理.主流程',
        casename: '批量复制测试用例'
    })
    sleep(2) //等2秒，让更新生效，再去查询
    //查询复制后的用例
    let queryRes1 = testManagerApi.apiqueryTestManager({
        params: {
            'jsonpath': '$.data.list[*].id',
            'arrayLength': ['>=', 1]
        },
        loginRes: loginRes || null,
        body: {
            descending: [],
            onlySelectId: false,
            query: {
                workspaceKey: data.myworkspace?.key || 'error',
                type: "TestCase"
            },
            selector: `('标题' ~ '${sceneData.myitem?.name || 'error'}副本') or ('标题' ~ '${sceneData.myitem1?.name || 'error'}副本')`,
            sortByRepositoryIds: [sceneData.repo?.objectId],
            fields: ["key", "name", "objectId", "repository", "type", "detail"],
            offset: 0,
            limit: 10
        },
        group: '测试管理.主流程',
        casename: '查询复制后的测试用例'
    })

    let myplan = itemApi.apicreateItem({
            name: 'testplan' + (data.suffix || ''),
            workspace: data.myworkspace?.objectId || 'error',
            itemType: testmanagerData.itemTypes?.test_manager_plan?.objectId || 'error',
            loginRes: loginRes || null,
            group: '测试管理.主流程',
            casename: '创建测测试计划事项'
        })

    sceneData.myplan = myplan

    let updateResPlan = testManagerApi.apibatchUpdateTestManager({
        loginRes: loginRes || null,
        data: [{
            objectId: myplan?.objectId || null,
            repository: sceneData.repo?.objectId || null,
            type: 'TestPlan'
        }],
        group: '测试管理.主流程',
        casename: '更新为测试计划类型'
    })

    //创建测试执行任务事项，并更新为测试执行任务类型，关联测试计划
    let myExecution = itemApi.apicreateItem({
            name: 'testExecution' + (data.suffix || ''),
            workspace: data.myworkspace?.objectId || 'error',
            itemType: testmanagerData.itemTypes?.test_manager_execution?.objectId || null,
            loginRes: loginRes || null,
            group: '测试管理.主流程',
            casename: '创建测测试执行任务事项'
        })

    sceneData.myExecution = myExecution

    let updateResExecution = testManagerApi.apibatchUpdateTestManager({
        loginRes: loginRes || null,
        data: [{
            objectId: myExecution?.objectId || null,
            name: myExecution?.name || null,
            type: 'TestExecution'
        }],
        group: '测试管理.主流程',
        casename: '更新为测试执行任务类型'
    })
    testManagerApi.apibatchUpdateTestManager({
        params: {
            'jsonpath': '$.data[*].key',
            'arrayLength': ['=', 1]
        },
        loginRes: loginRes || null,
        data: [{
            "objectId": myExecution?.objectId || null,
            "type": "TestExecution",
            "linkType": "ExecutionLinkPlan",
            "linkItems": {
                "action": "add",
                "value": [
                    myplan?.objectId || null //测试计划id
                ]
            },
            "sortIndex": new Date().getTime() * 1000
        }],
        group: '测试管理.主流程',
        casename: '更新测试执行任务和计划的关系'
    })
    testManagerApi.apiQueryLinkedTestEntity({
        params: {
            'jsonpath': '$.data.list[*].id',
            'arrayLength': ['=', 1]
        },
        loginRes: loginRes || null,
        destinationType: 'TestExecution',
        linkType: "ExecutionLinkPlan",
        workspaceKey: data.myworkspace?.key || 'error',
        sourceIds: [myplan?.objectId || null],
        group: '测试管理.主流程',
        casename: '查询测试计划下的测试执行任务',
    });
    //批量创建测试运行，关联测试执行任务和测试用例
    testManagerApi.apiBatchCreateTestRunV2({
        loginRes: loginRes || null,
        workspaceKey: data.myworkspace?.key || 'error',
        workspaceId: data.myworkspace?.objectId || 'error',
        planId: myplan?.objectId || null,
        executionId: myExecution?.objectId || null,
        caseIds: [sceneData.myitem?.objectId || null, sceneData.myitem1?.objectId || null],
        group: '测试管理.主流程',
        casename: '批量创建测试运行'
    })

    sleep(2)
    //查询测试运行，验证是否创建成功
    let run = testManagerApi.apiQueryLinkedTestEntity({
        params: {
            'jsonpath': '$.data.list[*].id',
            'arrayLength': ['=', 2]
        },
        loginRes: loginRes || null,
        linkType: 'RunLinkExecution',
        destinationType: 'TestRun',
        workspaceKey: data.myworkspace?.key || 'error',
        sourceIds: [myExecution?.objectId || null], //测试执行任务id
        selector: `"test_manager_referenceCase" in ["${sceneData.myitem?.objectId || "error"}", "${sceneData.myitem1?.objectId || "error"}"]`, //查询关联了哪个测试用例的测试运行
        group: '测试管理.主流程',
        casename: '查询测试运行是否创建成功',
        });
    sceneData.run = run
    
    //批量更新测试运行的状态为通过
    testManagerApi.apiBatchUpdateItemsV2({
        loginRes: loginRes || null,
        fields: {
            "values": {
                "r_test_manager_status": "PASSED",
                "r_test_manager_executor": [
                    {
                        "deleted": false,
                        "value": data.admin?.objectId || 'error',
                        "nickname": data.admin?.nickname || 'error',
                        "username": data.admin?.username || 'error',
                        "label": `${data.admin?.nickname || 'error'}(${data.admin?.username || 'error'})`
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
                "setIfNull": "PASSED"
            },
            "r_test_manager_businessFinishTime": {
                "setIfNull": Date.now()
            },
            "r_test_manager_executeRecord": {
                "concat": [
                    {
                        "executor": {
                            "deleted": false,
                            "value": data.admin?.objectId || 'error',
                            "nickname": data.admin?.nickname || 'error',
                            "username": data.admin?.username || 'error',
                            "label": `${data.admin?.nickname || 'error'}(${data.admin?.username || 'error'})`
                            },
                        "executeTime": Date.now(),
                        "status": "PASSED"
                    }
                ]
            },
            "r_test_manager_firstExecuteTime": {
                "setIfNull": Date.now()
            }
        },
        group: '测试管理.主流程',
        casename: '批量更新测试执行状态为通过'
    })
    sleep(2)
    //重新查询测试运行状态，验证是否更新成功
    testManagerApi.apiQueryLinkedTestEntity({
        params: {
            'jsonpath': '$.data.list[*].status',
            'subsetStr': ['PASSED','PASSED']
        },
        loginRes: loginRes || null,
        workspaceKey: data.myworkspace?.key || 'error',
        destinationType: 'TestRun',
        linkType: 'RunLinkExecution',
        sourceIds: [myExecution?.objectId || null], //测试执行任务id
        selector: `"test_manager_referenceCase" in ["${sceneData.myitem?.objectId || "error"}", "${sceneData.myitem1?.objectId || "error"}"]`, //查询关联了哪个测试用例的测试运行
        group: '测试管理.主流程',
        casename: '重新查询测试执行的状态，确实是否都是passed',
    });
    testManagerApi.apibatchDeleteRun({
        loginRes: loginRes || null,
        ids: run || [null],
        group: '测试管理.主流程',
        casename: '批量删除测试执行'
    })
    sleep(2)
    //查询测试执行，验证是否删除成功
    testManagerApi.apiQueryLinkedTestEntity({
        params: {
            'jsonpath': '$.data.list[*].id',
            'arrayLength': ['=', 0]
        },
        loginRes: loginRes || null,
        workspaceKey: data.myworkspace?.key || 'error',
        destinationType: 'TestExecution',
        linkType: 'RunLinkExecution',
        sourceIds: [myExecution?.objectId || null], //测试执行任务id
        selector: `"test_manager_referenceCase" in ["${sceneData.myitem?.objectId || "error"}", "${sceneData.myitem1?.objectId || "error"}"]`, //查询关联了哪个测试用例的测试运行
        group: '测试管理.主流程',
        casename: '查询测试执行是否删除成功',
        });
    //删除测试执行任务
    testManagerApi.apibatchDelete({
        loginRes: loginRes || null,
        ids: [myExecution?.objectId || null],
        group: '测试管理.主流程',
        casename: '批量删除测试执行任务'
    })
    sleep(2)
    testManagerApi.apiQueryLinkedTestEntity({
        params: {
            'jsonpath': '$.data.list[*].id',
            'arrayLength': ['=', 0]
        },
        loginRes: loginRes || null,
        workspaceKey: data.myworkspace?.key || 'error',
        destinationType: 'TestExecution',
        linkType: "ExecutionLinkPlan",
        sourceIds: [myplan?.objectId || null],
        group: '测试管理.主流程',
        casename: '查询测试计划下的测试执行任务是否删除成功',
    });
    //删除测试计划和用例
    itemApi.apideleteItems({
        loginRes: loginRes || null,
        itemIds: [myplan?.objectId || null],
        group: '测试管理.主流程',
        casename: '删除测试计划'
     })
     testManagerApi.apibatchDeletev2({
        loginRes: loginRes || null,
        itemIdList: [sceneData.myitem?.objectId || null, sceneData.myitem1?.objectId || null, ...(queryRes1 || [])],
        group: '测试管理.主流程',
        casename: '批量删除测试用例'
     })
    sleep(5)
    //查询测试计划，验证是否删除成功
    testManagerApi.apiqueryTestManager({
        params: {
            'jsonpath': '$.data.list[*].id',
            'isNotSubsetOf': [myplan?.objectId || null]
        },
        loginRes: loginRes || null,
        body: {
            descending: [],
            onlySelectId: false,
            query: {
                workspaceKey: data.myworkspace?.key || 'error',
                type: "TestPlan"
            },
            fields: ["key", "name", "objectId", "type"],
            offset: 0,
            limit: 10
        },
        group: '测试管理.主流程',
        casename: '查询测试计划是否删除成功'
     })
    //查询测试用例，验证是否删除成功
    testManagerApi.apiqueryTestManager({
        params: {
            'jsonpath': '$.data.list[*].id',
            'isNotSubsetOf': [sceneData.myitem?.objectId, sceneData.myitem1?.objectId]
        },
        loginRes: loginRes || null,
        body: {
            descending: [],
            onlySelectId: false,
            query: {
                workspaceKey: data.myworkspace?.key || 'error',
                type: "TestCase"
            },
            selector: `('id' = '${sceneData.myitem?.objectId || 'error'}') or ('id' = '${sceneData.myitem1?.objectId || 'error'}')`,
            sortByRepositoryIds: [sceneData.repo?.objectId],
            fields: ["key", "name", "objectId", "repository", "type", "detail"],
            offset: 0,
            limit: 10
        },
        group: '测试管理.主流程',
        casename: '查询用例确认删除成功了'
    })

    testManagerApi.apiDeleteRepository({
        loginRes: loginRes || null,
        repositoryId: sceneData.repo?.objectId || null,
        group: '测试管理.主流程',
        casename: '删除仓库'
    })
}
