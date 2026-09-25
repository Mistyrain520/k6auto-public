import { testManagerApi } from '../../apiTest/testmanager/testmanager.js'
import { testManagerDesignApi } from '../../apiTest/testmanager/testmanager_design.js'
import { commonApi } from '../../apiTest/common.js'
import { fileApi } from '../../apiTest/file.js'
import Assertions from '../../tool/assertion.js'
import { consoleError, consoleLog, readEnvData } from '../../tool/allTool.js'
import file from 'k6/x/file'
import { sleep } from 'k6'

/**
 * 场景：上传 empty.jsonl -> 执行 jsonl 导入 -> 查询模块 crt1 -> 查询用例 crt造数1 -> 查询 testFactorImage -> 查询因子组合数据并断言 -> 查询自动化脚本 -> 删除用例/自动化脚本/模块
 */
export function testmanager_importjsonl_flow() {
  const data = readEnvData('data.json')
  const loginRes = data.loginRes

  const group = '测试管理.jsonl导入场景'
  const workspaceKey = data.myworkspace?.key || 'error'

  // 1. 上传 empty.jsonl 文件
  const uploadRes = fileApi.importTestCaseFileFromPath({
    loginRes: loginRes || null,
    filePath: 'config/empty.jsonl',
    contentType: 'text/plain',
    group,
    casename: '上传empty.jsonl文件',
  })

  // 2. 查询组合维度配置，获取默认产品 id
  const combinationDimensionConfig = testManagerDesignApi.apiGetCombinationDimensionConfig({
    loginRes: loginRes || null,
    workspaceKey,
    group,
    casename: '查询组合维度配置',
  })
  const defaultProductId = combinationDimensionConfig?.['默认'] || 'error'

  // 3. 执行 jsonl 导入
  fileApi.executeImport({
    loginRes: loginRes || null,
    url: uploadRes.url,
    workspaceId: data.myworkspace?.objectId || 'error',
    fieldMappings: [{
      sheet: 'empty.jsonl',
      fieldMapping: {
        name: 'name',
        automationScript: 'r_test_manager_automationScripts',
        testRepository: 'group',
        createdBy: 'createdBy',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        updatedBy: 'updatedBy',
        testFactorGroups: 'testFactorGroups',
      },
    }],
    app: 'test_manager',
    extraParams: {
      snapShotConfig: { enabled: false, name: '' },
      reviewConfig: { enabled: false, name: '' },
      repositoryType: 'case',
      isEnv: 'true',
      defaultProductId,
      identifierFieldKey: 'r_test_manager_automationScriptIdentifier',
      scriptQuoteFieldKey: 'r_test_manager_automationScripts',
      scriptItemTypeKey: 'test_manager_automation_script',
      combinationAlgorithmFieldKey: 'r_test_manager_combination_algorithm',
      testFactorImageFieldKey: 'r_test_manager_testFactorImage',
      dataLevelFieldKey: 'r_test_manager_data_level',
      productFieldKey: 'associated_product',
    },
    repositoryType: 'case',
    group,
    casename: '执行jsonl用例导入',
  })
  sleep(5);

  // 4. 查询所属模块 crt1
  const repositoryRes = commonApi.apiqueryByParse({
    params: {
      jsonpath: '$.results[0].objectId',
      arrayLength: ['=', 1],
    },
    where: JSON.stringify({
      workspaceKey: { $in: [workspaceKey] },
      name: 'crt1',
      type: 'case',
    }),
    keys: 'name,objectId,parent',
    tablename: 'test_manager_Repository',
    loginRes: loginRes || null,
    group,
    casename: '查询所属模块crt1',
  })

  // 5. 查询用例 crt造数1 是否存在
  const caseIds = testManagerApi.apiqueryTestManager({
    params: {
      jsonpath: '$.data.list[*].id',
      arrayLength: ['>=', 1],
    },
    loginRes: loginRes || null,
    body: {
      descending: [],
      onlySelectId: false,
      query: {
        workspaceKey,
        type: 'TestCase',
        repository: [repositoryRes?.[0] || 'error'],
      },
      selector: "('标题' = 'crt造数1')",
      fields: ['key', 'name', 'workspace', 'objectId', 'id'],
      offset: 0,
      limit: 10,
    },
    group,
    casename: '查询用例crt造数1是否存在',
  })

  // 5.1 查询用例的 testFactorImage 值（因子组合图片）
  const testFactorImageRes = testManagerApi.apiqueryTestManager({
    params: {
      jsonpath: '$.data.list[0].testFactorImage',
      arrayLength: ['=', 1],
    },
    loginRes: loginRes || null,
    body: {
      descending: [],
      onlySelectId: false,
      query: {
        id: caseIds?.[0] || 'error',
      },
      fields: ['testFactorImage', '__version'],
      selector: null,
      offset: 0,
      limit: 10,
    },
    group,
    casename: '查询用例的testFactorImage值',
  })
  const testFactorImageId = testFactorImageRes?.[0]

  // 5.2 查询用例对应的因子组合数据
  const factorImageRes = commonApi.apiqueryByParse({
    params: {
      jsonpath: '$.results[0].factors',
      arrayLength: ['=', 1],
    },
    loginRes: loginRes || null,
    tablename: 'test_manager_CaseFactorImage',
    where: { objectId: testFactorImageId || 'error' },
    limit: 1,
    keys: 'factors',
    group,
    casename: '查询用例对应的因子组合数据,
  })

  // 5.3 断言：存在两个数据因子，且每个数据因子的值与 jsonl 文件一致
  const jsonlContent = JSON.parse(file.readFile('./config/empty.jsonl'))
  const expectedFactors = (jsonlContent.testFactorGroups || []).map((item) => ({
    name: item.factors?.[0]?.name,
    values: item.factors?.[0]?.value || [],
  }))
  let dataFactors = []
  const factorsRaw = factorImageRes?.[0]
  if (typeof factorsRaw === 'string') {
    try {
      dataFactors = (JSON.parse(factorsRaw) || {}).dataFactors || []
    } catch (error) {
      consoleError({
        group,
        casename: '解析因子组合数据失败',
        errorMessage: error?.message || String(error),
      })
    }
  }
  const steps = [Assertions.arrayLength(dataFactors, expectedFactors.length)]
  expectedFactors.forEach((expected) => {
    const actual = dataFactors.find((item) => item.name === expected.name) || {}
    steps.push(Assertions.equals(actual.name, expected.name))
    const actualValues = (actual.levelData || []).map((item) => item.level)
    steps.push(Assertions.isSubsetOf(expected.values, actualValues))
    steps.push(Assertions.isSubsetOf(actualValues, expected.values))
  })
  consoleLog({
    group,
    casename: '验证因子组合数据与jsonl文件一致',
    start: new Date().getTime(),
    stop: new Date().getTime(),
    description: `jsonl文件中的因子: ${JSON.stringify(expectedFactors)}`,
    steps,
  })

  // 6. 查询自动化脚本是否存在
  const scriptIds = testManagerApi.apiqueryTestManager({
    params: {
      jsonpath: '$.data.list[*].id',
      arrayLength: ['>=', 1],
    },
    loginRes: loginRes || null,
    body: {
      descending: [],
      onlySelectId: false,
      query: {
        workspaceKey,
        type: 'AutomationScript',
      },
      selector: "('标题' ~ '造数脚本')",
      sortByRepositoryIds: [],
      offset: 0,
      limit: 10,
      fields: ['updatedBy', 'updatedAt', 'createdBy', 'createdAt', 'key', 'name', 'priority', 'assignee', 'workspace', 'r_test_manager_automationScripts'],
    },
    group,
    casename: '查询自动化脚本造数脚本是否存在',
  })

  // 7. 后置处理：删除导入的用例和自动化脚本
  testManagerApi.apibatchDelete({
    loginRes: loginRes || null,
    ids: [...(caseIds || []), ...(scriptIds || [])],
    group,
    casename: '删除导入的用例和自动化脚本',
  })

  // 7.1 查询导入的测试数据因子（crt造数据数据因子1 / 因子2）
  const factorIds = testManagerApi.apiqueryTestManager({
    loginRes: loginRes || null,
    params: {
      jsonpath: '$.data.list[*].id',
      arrayLength: ['>=', 1],
    },
    body: {
      descending: [],
      onlySelectId: false,
      query: {
        workspaceKey,
        type: 'TestFactor',
      },
      selector: "('标题' ~ 'crt造数据数据因子1' or '标题' ~ 'crt造数据数据因子2')",
      fields: [],
      offset: 0,
      limit: 10,
    },
    group,
    casename: '查询导入的测试数据因子',
  })

  // 7.2 批量删除导入的测试数据因子
  if (Array.isArray(factorIds) && factorIds.length > 0) {
    testManagerApi.apibatchDelete({
      loginRes: loginRes || null,
      ids: factorIds,
      group,
      casename: '删除导入的测试数据因子,
    })
  }

  // 8. 删除所属模块 crt1
  testManagerApi.apiDeleteRepository({
    loginRes: loginRes || null,
    repositoryId: repositoryRes?.[0] || 'error',
    group,
    casename: '删除所属模块crt1',
  })
}

export default function () {
  testmanager_importjsonl_flow()
}
