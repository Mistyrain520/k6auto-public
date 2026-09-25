import { testManagerApi } from '../../apiTest/testmanager/testmanager.js'
import { testManagerDesignApi } from '../../apiTest/testmanager/testmanager_design.js'
import { commonApi } from '../../apiTest/common.js'
import { fileApi } from '../../apiTest/file.js'
import { ApiOptions, testmanagerOptions } from '../../config/apiOptions.js'
import { consoleError, readEnvData } from '../../tool/allTool.js'
import { sleep } from 'k6'

/**
 * 场景：设置环境变量 -> 上传文件 -> 执行导入 -> 查询模块 -> 查询用例
 * 本场景流程：
 *   1. 读取配置文件获取登录态
 *   2. 查询插件详情并设置环境变量
 *   3. 上传 Excel 文件
 *   4. 执行导入操作
 *   5. 查询当前空间所属模块的 objectId
 *   6. 调用 apiqueryTestManager 查询用例
 */
export function testmanager_importfile_flow() {
  // 步骤1：读取配置文件
  let data = readEnvData('data.json')
  let testmanagerData = readEnvData('dataTestmanager.json')

  let loginRes = data.loginRes

  // 步骤2：查询插件详情
  let app = commonApi.apiGetPluginDetail({
    loginRes: loginRes || null,
    group: '测试管理.导入场景',
    casename: '查询插件详情',
    pluginId: 'test_manager'
  })

  if (!app.data?.objectId) {
    console.log('没有查询到插件详情，请手动检查是否订阅。本场景结束测试。')
    consoleError({
      'group': '测试管理.导入场景',
      'casename': '没有查询到插件详情，请手动检查是否订阅。本场景结束测试。',
      'errorMessage': '没有查询到插件详情，请手动检查是否订阅。本场景结束测试。'
    })
    return
  }

  // 步骤3：设置环境变量
  commonApi.apiSetEnvironment({
    pluginId: app.data?.objectId || 'error',
    env: testmanagerOptions.PLUGIN_ENV || 'error',
    loginRes: loginRes || null,
    group: '测试管理.导入场景',
    casename: '设置环境变量'
  })

  // 步骤4：上传文件
  const uploadRes = fileApi.importTestCaseFileFromPath({
    loginRes: loginRes || null,
    filePath: 'config/import_test.xlsx',
    group: '测试管理.导入场景',
    casename: '上传测试用例文件'
  })

  const combinationDimensionConfig = testManagerDesignApi.apiGetCombinationDimensionConfig({
    loginRes: loginRes || null,
    workspaceKey: data.myworkspace?.key || 'error',
    group: '测试管理.导入场景',
    casename: '查询组合维度配置'
  })
  const defaultProductId = combinationDimensionConfig?.['默认'] || 'error'

  // 步骤5：执行导入（dji导入，传参会不一样，后端校验也不一样）
  const importRes = fileApi.executeImport({
    loginRes: loginRes || null,
    url: uploadRes.url,
    workspaceId: data.myworkspace?.objectId || 'error',
    app: 'test_manager',
    extraParams: {
      snapShotConfig: { enabled: false, name: '' },
      reviewConfig: { enabled: false, name: '' },
      repositoryType: 'case',
      isEnv: 'true',
      defaultProductId,
      identifierFieldKey: 'r_test_manager_automationScriptIdentifier',
      scriptQuoteFieldKey: 'r_test_manager_automationKeyCase',
      scriptItemTypeKey: 'test_manager_automation_script'
    },
    repositoryType: 'case',
    group: '测试管理.导入场景',
    casename: '执行测试用例导入'
  })
  sleep(2)

  // 步骤6：查询当前空间所属模块的 objectId
  const repositoryRes = commonApi.apiqueryByParse({
    params: {
        jsonpath: '$.results[0].objectId',
        arrayLength: ['=', 1]
    },
    where: JSON.stringify({
      workspaceKey: { '$in': [data.myworkspace?.key || 'error'] },
      name: "导入目录k6",
      type: 'case'
    }),
    keys: 'name,objectId,parent',
    tablename: 'test_manager_Repository',
    loginRes: loginRes || null,
    group: '测试管理.导入场景',
    casename: '查询当前空间所属模块，判断所属模块是否创建成功了'
  })

  // 步骤7：调用 apiqueryTestManager 查询用例
  const caseIds = testManagerApi.apiqueryTestManager({
    params: {
      jsonpath: '$.data.list[*].id',
      arrayLength: ['>=', 1]
    },
    loginRes: loginRes || null,
    body: {
      descending: [],
      onlySelectId: false,
      query: {
        workspaceKey: data.myworkspace?.key || 'error',
        type: 'TestCase',
        repository: [repositoryRes?.[0] || 'error']
      },
      selector: null,
      fields: ['key', 'name','workspace', 'objectId', 'id'],
      offset: 0,
      limit: 10
    },
    group: '测试管理.导入场景',
    casename: '查询当前模块下的测试用例'
  })


  testManagerApi.apibatchDeletev2({
      loginRes: loginRes || null,
      itemIdList: caseIds || ['error'],
      group: '测试管理.导入场景',
      casename: '批量删除测试用例'
    })
  
  testManagerApi.apiDeleteRepository({
    loginRes: loginRes || null,
    repositoryId: repositoryRes?.[0] || 'error',
    group: '测试管理.导入场景',
    casename: '删除模块'
  })
}

export default function () {
  testmanager_importfile_flow()
}
