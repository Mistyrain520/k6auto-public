import { sleep } from 'k6';
// import sql from 'k6/x/sql';
import {ApiOptions} from '../config/apiOptions.js'
import { getNowString, writeDataJson, writeEnvData } from '../tool/allTool.js'
// import { getFieldtype_Date } from '../tool/pgsql.js';
import { itemTypeApi } from '../apiTest/itemType.js'
import { screenApi } from '../apiTest/screen.js'
import { workflowApi } from '../apiTest/workflow.js';
import { login } from '../apiTest/login.js';
import { commonApi } from '../apiTest/common.js';
import { workspaceApi } from '../apiTest/workspace.js';
//初始化数据场景

/*
如何编写用例？
直接传参去调用用例接口即可，比如：
let myitemtype = apicreateItemType({
        'params': {
            'returnBykey': ['objectId']
        },
        'name': 'k6自动化类型',
        'key': 'k6itemtype',
        'group': '初始化数据.事项类型',
        'casename': '创建事项类型'
    })
其中必要参数：
    'group': '初始化数据.事项类型', //这个是用例报告分组，代表这个用例会放在  初始化/事项类型 这个分组下
    'casename': '创建事项类型', //这个是用例名称，
非必须参数：
    'params': {
            'returnBykey': ['objectId'], //通过key来获取请求返回值，返回 {'key': value}
            'jsonpath': '',   //jsonpath方式获取请求的返回值， 返回 []
        }, //如果不填写这个，那么返回整个请求body
    
其他参数根据接口来：
    比如apicreateItemType是创建类型的接口，创建类型需要填写名字和表示，因此该接口需要这两个参数
    'key'  //这个是根据apicreateItemType接口自己定义的
    'name' //这个也是

*/
export function setupdata(){
    // const db = sql.open('postgres', 'postgres://<YOUR-DB-USER>:<YOUR-DB-PASSWORD>@<YOUR-DB-HOST>:5432/<YOUR-DB-NAME>?sslmode=disable');
    // try {
    //     // 尝试执行一个简单的查询
    //     let results = db.query('SELECT 1');
    //     console.log('数据库连接成功');
    // } catch (error) {
    //     console.log('数据库连接失败：', error);
    //     return
    // }
    const data = {}

    const suffix = getNowString()
    data.suffix = suffix

    //登录获取token和tenant，存到全局变量里，后面接口调用就不需要再登录一次了
    const loginRes = login({
        'username': ApiOptions.auth.username,
        'password': ApiOptions.auth.password,
        'group': '初始化数据.登录',
        'casename': 'osc-admin登录'
    })
    data.loginRes = loginRes
    let admininfo = commonApi.apiqueryByParse({
        'tablename': '_User',
        'where': {
            'username': ApiOptions.auth.username
        },
        'keys': 'username,nickname,objectId,email',
        'params': {
            'jsonpath': '$.results[0]',
            'arrayLength': ['=', 1]
        },
        'group': '初始化数据.登录',
        'casename': '查询osc-admin用户信息',
        'loginRes': loginRes,
    })
    data.admin = admininfo && admininfo[0] ? admininfo[0] : {}

    //新建类型，新建类型方案
    let myitemtype = itemTypeApi.apicreateItemType({
        'params': {
            'returnBykey': ['objectId']
        },
        'name': 'haha' + (ApiOptions.projectuuid || data.suffix),
        'key': 'k6itemtype' + (ApiOptions.projectuuid || data.suffix),
        'group': '初始化数据.事项类型',
        'casename': '创建事项类型',
        'loginRes': loginRes
    })
    //用新建类型的obid和类型的key，来新建类型方案，返回方案的obid
    let myitemtypescheme = itemTypeApi.apicreateItemTypeScheme({
        'objectId': myitemtype.objectId,
        'key': 'k6itemtype',
        'name': 'haha' + (ApiOptions.projectuuid || data.suffix),
        'params': {'returnBykey': ['objectId']},
        'group': '初始化数据.事项类型',
        'casename': '创建事项类型方案',
        'loginRes': data.loginRes,

    })
    //将返回的objectId存下来，后面再操作删除掉创建的这个数据
    data.myitemtype = {'objectId': myitemtype.objectId}
    data.myitemtypescheme = {'objectId': myitemtypescheme.objectId}


    // 新建字段，并且新建界面
    let riqi = commonApi.apiqueryByParse({
        'tablename': 'FieldType',
        'where': {
            'name': '日期'
        },
        'params': {
            'jsonpath': '$.results[*].objectId'
            
        },
        'group': '初始化数据.字段和界面',
        'casename': '查询日期字段的类型ID',
        'loginRes': data.loginRes,
    })
    let myField = screenApi.apicreateField({
        'params': {
            'returnBykey': ['objectId']
        },
        'name': 'haha' + (ApiOptions.projectuuid || data.suffix),
        'key': 'k6date' + (ApiOptions.projectuuid || data.suffix),
        'objectId': riqi[0],
        'group': '初始化数据.字段和界面',
        'casename': '创建自定义字段',
        'loginRes': data.loginRes
    })
    let myscreen = screenApi.apicreateScreen({
            'params': {
                'returnBykey': ['objectId']
            },
            'name': 'haha' + (ApiOptions.projectuuid || data.suffix),
            'children': [{
                "_id": 'k6date' + (ApiOptions.projectuuid || data.suffix),
                "component": "Date",
                "config": {
                    "layoutConfig": {
                        "componentCols": 12
                    }
                }
            }],
            'group': '初始化数据.字段和界面',
            'casename': '创建界面',
            'loginRes': data.loginRes
        })
    let myscreenScheme = screenApi.apicreateScreenScheme(
        {
            'params': {
                'returnBykey': ['objectId']
            },
            'name': 'haha' + (ApiOptions.projectuuid || data.suffix),
            'objectId': myscreen && myscreen.objectId,
            'group': '初始化数据.字段和界面',
            'casename': '创建界面方案',
            'loginRes': data.loginRes
        }
     )
    let myItemTypeScreenScheme = screenApi.apicreateItemTypeScreenScheme(
        {
            'params': {
                'returnBykey': ['objectId']
            },
            'name': 'haha' + (ApiOptions.projectuuid || data.suffix),
            'objectId': myscreenScheme && myscreenScheme.objectId,
            'group': '初始化数据.字段和界面',
            'casename': '创建类型界面方案',
            'loginRes': data.loginRes
        }
     )
     data.myField = {'objectId': myField && myField.objectId}
     data.myscreen = {'objectId': myscreen && myscreen.objectId}
     data.myscreenScheme = {'objectId': myscreenScheme && myscreenScheme.objectId}
     data.myItemTypeScreenScheme = {'objectId': myItemTypeScreenScheme && myItemTypeScreenScheme.objectId}


    //新建工作流状态,工作流，工作流方案，配置默认工作流
    let statusName1 = 'hahaA' + (ApiOptions.projectuuid || data.suffix)
    let statusName2 = 'hahaB' + (ApiOptions.projectuuid || data.suffix)
    let myStatus1 = workflowApi.apicreateStatus({
            'params': {
                'returnBykey': ['objectId']
            },
            'name': statusName1,
            'type': 'InProgress',
            'group': '初始化数据.工作流',
            'casename': '创建状态1',
            'loginRes': data.loginRes
        })
    let myStatus2 = workflowApi.apicreateStatus({
            'params': {
                'returnBykey': ['objectId']
            },
            'name': statusName2,
            'type': 'InProgress',
            'group': '初始化数据.工作流',
            'casename': '创建状态2',
            'loginRes': data.loginRes
        })
    data.myStatus1 = {'objectId': myStatus1 && myStatus1.objectId}
    data.myStatus2 = {'objectId': myStatus2 && myStatus2.objectId}

    let myFlow = workflowApi.apicreatFlow({
            'params': {
                'returnBykey': ['id']
            },
            'name': 'haha'+ (ApiOptions.projectuuid || data.suffix),
            'statusKey1': myStatus1 && myStatus1.objectId,
            'statusName1': statusName1,
            'statusKey2': myStatus2 && myStatus2.objectId,
            'statusName2': statusName2,
            'group': '初始化数据.工作流',
            'casename': '创建工作流',
            'loginRes': data.loginRes
        })
    data.myFlow = {'objectId': myFlow && myFlow.id}

    let myFlowScheme = workflowApi.apiWorkflowScheme({
        'params': {
            'returnBykey': ['objectId']
        },
        'name': 'haha'+ (ApiOptions.projectuuid || data.suffix),
        'group': '初始化数据.工作流',
        'casename': '创建工作流方案',
        loginRes: data.loginRes,
    })
    data.myFlowScheme = {'objectId': myFlowScheme && myFlowScheme.objectId}

    workflowApi.apiWorkflowSchemeConfig({
        'params': {},
        'workflowSchemeId': myFlowScheme && myFlowScheme.objectId,
        'itemTypeIds': ["all_item_types"],
        'workflowId': data.myFlow && data.myFlow.objectId,
        'group': '初始化数据.工作流',
        'casename': '配置工作流方案',
        loginRes: data.loginRes,
    })


    //创建空间
    let permmissionname = '测试权限模板' + (ApiOptions.projectuuid || data.suffix)
    let permissionScheme = workspaceApi.apiCreatePermissionScheme({
        name: permmissionname,
        loginRes: data.loginRes,
        group: '初始化数据.空间',
        casename: '创建权限模板'
    })
    let queryPermissionScheme = workspaceApi.apiQueryPermissionScheme({
        name: permmissionname,
        loginRes: data.loginRes,
        group: '初始化数据.空间',
        casename: '查询权限模板'
    })
    let workspaceName = '测试空间' + (ApiOptions.projectuuid || data.suffix)
    let myuuid = "k6" + (ApiOptions.projectuuid || data.suffix)
    let myworkspace = workspaceApi.apiCreateOneWorkspace({
        'params': {},
        'name': workspaceName,
        'uuid': myuuid,
        'schemeId': queryPermissionScheme && queryPermissionScheme.id,
        'itemTypeScheme': myitemtypescheme && myitemtypescheme.objectId,
        'itemTypeScreenScheme': myItemTypeScreenScheme && myItemTypeScreenScheme.objectId,
        'workflowScheme': myFlowScheme && myFlowScheme.objectId,
        loginRes: data.loginRes,
        group: '初始化数据.空间',
        casename: '创建空间'
    })
    data.permissionScheme = {'objectId': queryPermissionScheme && queryPermissionScheme.id}

    
    sleep(3)
    let workspaceQuery = commonApi.apiqueryByParse({
        'params': {
        },
        'where': JSON.stringify({
            'name': workspaceName
        }),
        'tablename': 'Workspace',
        'group': '初始化数据.空间',
        'casename': '查询workspace',
        'loginRes': data.loginRes,
        'isNotLog': false
    })
    data.myworkspace = {'objectId': workspaceQuery.results && workspaceQuery.results[0].objectId, 'key': workspaceQuery.results && workspaceQuery.results[0].key,
        myuuid: myuuid, 'name': workspaceName}
    

    writeEnvData('data.json', data)

    return data
}


export function setuptest() {
  let aa = {'dd': 123,'ddx': 3435,'ggggg':6578 }
  writeDataJson('./config/data1.json', aa)
}
export default function(){
	setuptest()
}
