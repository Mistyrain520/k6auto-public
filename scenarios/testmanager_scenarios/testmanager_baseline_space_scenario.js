import { workspaceApi } from '../../apiTest/workspace.js';
import { commonApi } from '../../apiTest/common.js';
import { itemApi } from '../../apiTest/item.js';
import { testManagerApi } from '../../apiTest/testmanager/testmanager.js';
import { testManagerFactorApi } from '../../apiTest/testmanager/testmanager_factor.js';
import { generateUUID, readEnvData } from '../../tool/allTool.js';
import testmanagerBasicItem from '../basescenarios/testmanager_basicItem.js';
import { sleep } from 'k6';

// 创建测试数据因子个数（用户要求创建 2 个）
const DATA_FACTOR_COUNT = 2;
// 每个产品维度创建的有效值个数（与用户 curl 中的有效值数量一致）
const VALID_VALUE_COUNT = 2;

// 根据产品维度生成因子的 levelData、productValues 和每个产品维度的 recordId 列表（有效值格式：{产品}有效值{序号}）
function buildTestFactorData(products) {
	const levelData = [];
	const productValues = [];
	const productRecordIds = {};
	products.forEach((product) => {
		const recordIds = [];
		for (let index = 1; index <= VALID_VALUE_COUNT; index += 1) {
			const level = `${product}有效值{index}`;
			const recordId = generateUUID();
			recordIds.push(recordId);
			levelData.push({
				recordId,
				productDimensionId: product,
				levelType: 'valid',
				level,
			});
			productValues.push(level);
		}
		productRecordIds[product] = recordIds;
	});
	return { levelData, productValues, productRecordIds };
}

/**
 * 场景：创建基线空间 -> parsequery 查询该空间 -> 在基线空间中创建测试用例 -> 创建 2 个测试数据因子并回填产品有效值
 * 1. 读取配置文件获取登录态
 * 2. 创建基线空间（uuid 动态生成，避免空间标识重复）
 * 3. parsequery 按 key=uuid 查询 Workspace，拿到空间 objectId
 * 4. 复用 createTestcases(group, workspace) 在基线空间中创建测试用例
 * 5. 在基线空间中创建 2 个测试数据因子（产品维度取 data.productField.products，有效值动态生成）
 * 6. 调用 api-batch-update webtrigger 回填每个因子的产品有效值，并查询确认创建成功
 * 7. 把 2 个数据因子绑定到创建的测试用例上
 * 8. 把基线空间中的用例组合导入到 data.json 配置的空间，并按用例维度查询组合配置
 * 9. 创建测试计划与测试执行任务（关联计划），用组合 id + 导入后的用例 id 规划进入测试执行任务
 * 10. 查询测试执行任务下的测试运行，确认组合已规划进去
 * 11. 修改基线空间用例的 k6date 值并推送用例更新，查询基线版本校验后更新导入用例、标记更新链接已接受并确认
 * 12. 清理：删除基线空间用例与基线空间，删除 data 空间的测试运行/执行任务/计划/导入后的用例
 */
export function testmanager_baseline_space() {
	const data = readEnvData('data.json');
	const loginRes = data.loginRes;
	const group = '测试管理.基线空间场景';

	// 1. 创建基线空间（标识和名称都需唯一，32 位无横线 uuid + 名称带 uuid 前缀）
	const uuid = generateUUID().replace(/-/g, '');
	const spaceName = '基线空间' + uuid.slice(0, 8);
	workspaceApi.apiCreateBaseLineOneWorkspace({
		loginRes: loginRes || null,
		name: spaceName,
		uuid,
		schemeId: String(data.permissionScheme?.objectId ?? ''),
		itemTypeScheme: data.myitemtypescheme?.objectId || 'error',
		itemTypeScreenScheme: data.myItemTypeScreenScheme?.objectId || 'error',
		workflowScheme: data.myFlowScheme?.objectId || 'error',
		group,
		casename: '创建基线空间',
	});
	sleep(1);

	// 2. parsequery 查询该空间的数据
	const workspaceIdRes = commonApi.apiqueryByParse({
		params: {
			jsonpath: '$.results[0].objectId',
			arrayLength: ['=', 1],
		},
		where: JSON.stringify({ key: uuid }),
		keys: 'name,key,objectId',
		limit: 1,
		tablename: 'Workspace',
		loginRes: loginRes || null,
		group,
		casename: 'parsequery查询基线空间',
	});
	const workspaceId = workspaceIdRes?.[0] || 'error';

	// 3. 在基线空间中创建测试用例（复用 createTestcases，指定 workspace）
	const testcase = testmanagerBasicItem.createTestcases(group, workspaceId);
	if (!testcase?.objectId) {
		throw new Error('创建测试用例失败：接口未返回 objectId');
	}

	// 4. 在基线空间中创建 2 个测试数据因子，并回填产品有效值
	const testmanagerData = readEnvData('dataTestmanager.json');
	const products = Object.keys(data.productField?.products || {});
	if (products.length === 0) {
		throw new Error('当前环境 data.json 缺少 productField.products 产品维度配置，无法创建测试数据因子');
	}
	const factorItemType = testmanagerData.itemTypes?.test_manager_data_factor?.objectId || 'error';
	const filterItemTypeList = [
		{
			key: 'test_manager_data_factor',
			name: '数据因子',
			objectId: factorItemType,
			className: 'ItemType',
		},
		{
			key: 'test_manager_action_factor',
			name: '动作因子',
			objectId: testmanagerData.itemTypes?.test_manager_action_factor?.objectId || 'error',
			className: 'ItemType',
		},
	];

	// 两个因子共用同一套 levelData recordId，保证导入时的组合映射与因子数据一致
	const { levelData, productValues, productRecordIds } = buildTestFactorData(products);
	const factorIds = [];
	for (let index = 1; index <= DATA_FACTOR_COUNT; index += 1) {
		const factorName = `我是数据因子${index}`;

		// 4.1 创建测试数据因子事项（复用 itemApi.apicreateItem，透传 values/itemContext/parseContext）
		const factor = itemApi.apicreateItem({
			name: factorName,
			workspace: workspaceId,
			itemType: factorItemType,
			loginRes: loginRes || null,
			group,
			casename: `创建测试数据因子${index}`,
			values: {
				[`k6date${data.suffix || ''}`]: null,
				assignee: [],
				Relations: null,
				...(data.testFactorPriority ? { priority: data.testFactorPriority } : {}),
			},
			itemContext: {
				test_manager: {
					levelData,
					productDimensionIds: products,
					testFactors: [],
					productValues,
					autoCreateTestType: 'TestDataFactor',
				},
			},
			parseContext: {
				eventExtraData: {
					hideMessage: true,
					type: 'TestFactor',
					workspaceId,
					messageKey: `itemCreateSuccess${generateUUID()}`,
					skipTestCaseCreate: true,
					useItemBatchCreate: true,
					repository: null,
					key: 'test_manager',
					displayModule: 'plugin.testManager',
					filterItemTypeList,
				},
			},
		});
		if (!factor?.objectId) {
			throw new Error(`创建测试数据因子${index}失败：接口未返回 objectId`);
		}
		factorIds.push(factor.objectId);
		sleep(1);

		// 4.2 更新因子产品有效值（api-batch-update webtrigger，onlyValues=true）
		testManagerApi.apibatchUpdate({
			loginRes: loginRes || null,
			data: [{
				name: factorName,
				objectId: factor?.objectId || 'error',
				type: 'TestDataFactor',
				detail: {
					levelData,
					productDimensionIds: products,
					testFactors: [],
					productValues,
				},
				sortIndex: new Date().getTime() * 1000,
			}],
			group,
			casename: `更新测试数据因子${index}产品有效值`,
		});
		sleep(1);
	}

	// 4.3 查询基线空间中的测试数据因子，确认 2 个因子都创建成功
	testManagerApi.apiqueryTestManager({
		params: {
			jsonpath: '$.data.list[*].name',
			subsetStr: ['我是数据因子1', '我是数据因子2'],
		},
		loginRes: loginRes || null,
		body: {
			descending: [],
			onlySelectId: false,
			query: {
				workspaceKey: uuid,
				type: 'TestDataFactor',
			},
			fields: ['id', 'name', 'type', 'detail'],
			offset: 0,
			limit: 10,
		},
		group,
		casename: '查询基线空间中的测试数据因子',
	});

	// 5. 把 2 个数据因子绑定到创建的测试用例上
	testManagerApi.apiBindFactorsToTestEntity({
		loginRes: loginRes || null,
		itemId: testcase.objectId,
		factorIds,
		userId: data.admin?.objectId || 'error',
		group,
		casename: '绑定数据因子到测试用例',
	});

	// 6. 把基线空间的用例组合导入到 data.json 配置的空间，并查询导入后用例对应的组合配置
	const targetWorkspace = data.myworkspace || {};
	const selectedCombinationIdsMap = {};
	selectedCombinationIdsMap[testcase.objectId] = Object.entries(productRecordIds).flatMap(
		([product, recordIds]) => recordIds.flatMap(
			(recordIdA) => recordIds.map((recordIdB) => `${product}-${recordIdA.slice(0, 8)}-${recordIdB.slice(0, 8)}`)
		)
	);

	testManagerFactorApi.apiBatchCopyTestCaseCombinationImport({
		loginRes: loginRes || null,
		sourceWorkspace: {
			key: uuid,
			objectId: workspaceId,
		},
		caseIds: [testcase.objectId],
		repository: 'root',
		userId: data.admin?.objectId || 'error',
		combinationImportParams: {
			needCombination: true,
			productIds: products,
			methodMap: {},
			selectedCombinationIdsMap,
		},
		workspace: {
			key: targetWorkspace.key || 'error',
			objectId: targetWorkspace.objectId || 'error',
			name: targetWorkspace.name || '',
		},
		group,
		casename: '组合导入测试用例到配置空间',
	});
	sleep(2);

	// 6.1 按 r_test_manager_caseImportSourceId 定位导入到目标空间的用例
	const importedCase = testManagerApi.apiqueryTestManager({
		params: {
			jsonpath: '$.data.list[0]',
			arrayLength: ['=', 1],
		},
		loginRes: loginRes || null,
		body: {
			descending: [],
			onlySelectId: false,
			query: {
				workspaceKey: targetWorkspace.key || 'error',
				type: 'TestCase',
			},
			selector: `('r_test_manager_caseImportSourceId' = '${testcase.objectId || 'error'}')`,
			fields: ['id', 'name', 'testFactors'],
			offset: 0,
			limit: 10,
		},
		group,
		casename: '查询导入后的用例',
	});
	const importedCaseId = importedCase?.[0]?.id || 'error';
	const importedCaseName = importedCase?.[0]?.name || null;
	const importedFactorIds = importedCase?.[0]?.testFactors || [];

	// 6.2 按用例的因子维度查询组合配置（combination 字段包含用例的 factorId）
	const firstFactorId = importedFactorIds[0] || 'error';
	const combinationIds = commonApi.apiqueryByParse({
		params: {
			jsonpath: '$.results[*].objectId',
			arrayLength: ['=', 8],
		},
		where: JSON.stringify({ combination: { $regex: firstFactorId } }),
		keys: 'objectId,name,combination,productDimensionId,updatedAt',
		limit: 20,
		order: '-updatedAt',
		tablename: 'test_manager_FactorLevelCombination',
		loginRes: loginRes || null,
		group,
		casename: '查询导入用例对应的组合配置',
	});

	// 6.3 按导入后的用例 id 查询 TestConfiguration 事项（规划运行时 caseRunMap 需要这个 id）
	const configurationIds = testManagerApi.apiqueryTestManager({
		params: {
			jsonpath: '$.data.list[*].id',
			arrayLength: ['=', 8],
		},
		loginRes: loginRes || null,
		body: {
			descending: ['关联产品', 'createdAt'],
			onlySelectId: false,
			query: {
				type: 'TestConfiguration',
				testConfigurationCase: importedCaseId,
			},
			selector: null,
			fields: ['createdBy', 'createdAt', 'key', 'name', 'type', 'workspace', 'priority', 'r_test_manager_factorLevelCombinationId'],
			offset: 0,
			limit: 10,
			withConfiguration: true,
		},
		group,
		casename: '按用例id查询TestConfiguration事项',
	});

	// 7. 在目标空间创建测试计划（createTestplan 建在 data.myworkspace，即导入目标空间）
	const plan = testmanagerBasicItem.createTestplan(group);

	// 8. 创建测试执行任务并关联到计划
	const execution = testmanagerBasicItem.createTestExecutions(group, plan?.objectId || null);
	sleep(1);

	// 9. 用组合 id + 导入后的用例 id 规划进入测试执行任务（复用 apiBatchCreateTestRunV2，扩展 caseRunMap）
	testManagerApi.apiBatchCreateTestRunV2({
		loginRes: loginRes || null,
		workspaceKey: targetWorkspace.key || 'error',
		workspaceId: targetWorkspace.objectId || 'error',
		workspaceName: targetWorkspace.name || '',
		planId: plan?.objectId || 'error',
		executionId: execution?.objectId || 'error',
		executionName: execution?.name || null,
		caseIds: [importedCaseId],
		caseRunMap: {
			[importedCaseId]: configurationIds,
		},
		group,
		casename: '组合规划进入测试执行任务',
	});
	sleep(2);

	// 10. 查询测试执行任务下的测试运行，确认组合已规划进去
	const runIds = testManagerApi.apiQueryLinkedTestEntity({
		params: {
			jsonpath: '$.data.list[*].id',
			arrayLength: ['=', 8],
		},
		loginRes: loginRes || null,
		workspaceKey: targetWorkspace.key || 'error',
		linkType: 'RunLinkExecution',
		sourceIds: [execution?.objectId || 'error'],
		destinationType: 'TestRun',
		limit: 20,
		select: ['id', 'name', 'status', 'referenceCase', 'runFactorRecord'],
		group,
		casename: '查询执行任务下的测试运行',
	});
	testManagerApi.apiQueryLinkedTestEntity({
		params: {
			jsonpath: '$.data.list[*].runFactorRecord[*].value',
			arrayLength: ['=', 16],
		},
		loginRes: loginRes || null,
		workspaceKey: targetWorkspace.key || 'error',
		linkType: 'RunLinkExecution',
		sourceIds: [execution?.objectId || 'error'],
		destinationType: 'TestRun',
		limit: 20,
		select: ['id', 'name', 'status', 'referenceCase', 'runFactorRecord'],
		group,
		casename: '确认测试运行已规划因子组合',
	});

	// 11. 修改基线空间用例的 k6date 值（固定值），并推送用例更新
	const k6dateKey = `k6date${data.suffix || ''}`;
	const fixedK6DateValue = 1785081600000; // 用户要求固定写死

	itemApi.apiBatchUpdateItems({
		loginRes: loginRes || null,
		items: [{
			objectId: testcase.objectId,
			name: testcase.name || null,
			values: {
				[k6dateKey]: fixedK6DateValue,
			},
		}],
		asynchronous: false,
		group,
		casename: '修改基线空间用例的k6date值',
	});

	// 12. 推送用例更新（api-create-case-update-link）
	testManagerFactorApi.apiCreateCaseUpdateLink({
		loginRes: loginRes || null,
		items: [importedCaseId],
		source: testcase.objectId,
		sourceKey: `${uuid}-1`,
		itemVersion: 120,
		userId: data.admin?.objectId || 'error',
		group,
		casename: '推送用例更新',
	});
	sleep(1);

	// 13. 查询需要更新的用例版本，拿到链接 objectId 和 baseLineItem.objectId
	const linksRes = testManagerFactorApi.apiGetCaseUpdateLinksInItems({
		params: {
			jsonpath: '$.data.data[*]',
			arrayLength: ['>=', 1],
		},
		loginRes: loginRes || null,
		items: [importedCaseId],
		group,
		casename: '查询需要更新的用例版本',
	});
	const updateLink = linksRes?.[0] || {};
	const linkObjectId = updateLink.objectId;
	const baseLineItemId = updateLink.baseLineItem?.objectId;
	if (!linkObjectId || !baseLineItemId) {
		throw new Error('未查询到用例更新链接或baseLineItem');
	}

	// 14. 查询基线用例版本数据，断言 k6date 值与固定值一致
	itemApi.apiGetBaseLineItem({
		params: {
			jsonpath: `$.baseLineItem.values.${k6dateKey}`,
			subsetStr: [fixedK6DateValue],
		},
		loginRes: loginRes || null,
		objectId: baseLineItemId,
		group,
		casename: '查询基线用例版本数据',
	});

	// 15. 用固定值更新导入后的用例
	itemApi.apiBatchUpdateItems({
		loginRes: loginRes || null,
		items: [{
			objectId: importedCaseId,
			name: importedCaseName,
			values: {
				[k6dateKey]: fixedK6DateValue,
				r_test_manager_pendingApplyUpdate: '0',
			},
		}],
		asynchronous: false,
		group,
		casename: '更新导入用例的k6date值',
	});
	sleep(1);

	// 15.1 标记更新链接为已接受（前端应用更新后还会调用此接口，用于熄灭更新按钮）
	testManagerFactorApi.apiUpdateCaseUpdateLinksAccepted({
		loginRes: loginRes || null,
		objectId: linkObjectId,
		group,
		casename: '标记用例更新链接为已接受',
	});
	sleep(1);

	// 16. 查询导入后的用例原始数据，断言 k6date 更新成功（apiqueryTestManager 的 values 是过滤视图，不含自定义字段）
	itemApi.apiGetItem({
		params: {
			jsonpath: `$.item.values.${k6dateKey}`,
			subsetStr: [fixedK6DateValue],
		},
		loginRes: loginRes || null,
		objectId: importedCaseId,
		group,
		casename: '查询导入用例确认k6date更新成功',
	});

	// 17. 重新查询更新链接，确认已清空（更新按钮不再亮起）
	testManagerFactorApi.apiGetCaseUpdateLinksInItems({
		params: {
			jsonpath: '$.data.data[*].objectId',
			arrayLength: ['=', 0],
		},
		loginRes: loginRes || null,
		items: [importedCaseId],
		group,
		casename: '确认用例更新链接已清空',
	});

	// 18. 清理：删除基线空间用例与基线空间
	itemApi.apideleteItems({
		loginRes: loginRes || null,
		itemIds: [testcase.objectId],
		group,
		casename: '删除基线空间用例',
	});
	sleep(1);

	workspaceApi.apiDeleteWorkspace({
		loginRes: loginRes || null,
		projectId: uuid,
		password: '<YOUR-PASSWORD>',
		group,
		casename: '删除基线空间',
	});
	sleep(10);
	commonApi.apiqueryByParse({
		params: {
			jsonpath: '$.results[*]',
			arrayLength: ['=', 0],
		},
		where: JSON.stringify({ key: uuid }),
		keys: 'name,key,objectId',
		limit: 1,
		tablename: 'Workspace',
		loginRes: loginRes || null,
		group,
		casename: '查询基线空间是否删除成功',
	});

	// 19. 清理 data 空间：删除测试运行、执行任务、计划、导入后的用例
	testManagerApi.apibatchDeleteRun({
		loginRes: loginRes || null,
		ids: runIds || [],
		group,
		casename: '删除测试运行',
	});
	sleep(5);
	testManagerApi.apiQueryLinkedTestEntity({
		params: {
			jsonpath: '$.data.list[*].id',
			arrayLength: ['=', 0],
		},
		loginRes: loginRes || null,
		workspaceKey: targetWorkspace.key || 'error',
		linkType: 'RunLinkExecution',
		sourceIds: [execution?.objectId || 'error'],
		destinationType: 'TestRun',
		limit: 20,
		group,
		casename: '查询测试运行是否删除成功',
	});

	testManagerApi.apibatchDelete({
		loginRes: loginRes || null,
		ids: [execution?.objectId || null],
		group,
		casename: '删除测试执行任务',
	});
	sleep(1);

	itemApi.apideleteItems({
		loginRes: loginRes || null,
		itemIds: [plan?.objectId || null],
		group,
		casename: '删除测试计划',
	});
	sleep(1);

	testManagerApi.apibatchDeletev2({
		loginRes: loginRes || null,
		workspaceKey: targetWorkspace.key || 'error',
		itemIdList: [importedCaseId],
		group,
		casename: '删除导入后的用例',
	});
	sleep(2);
	testManagerApi.apiqueryTestManager({
		params: {
			jsonpath: '$.data.list[*].id',
			arrayLength: ['=', 0],
		},
		loginRes: loginRes || null,
		body: {
			descending: [],
			onlySelectId: false,
			query: {
				workspaceKey: targetWorkspace.key || 'error',
				type: 'TestCase',
			},
			selector: `('id' = '${importedCaseId}')`,
			fields: ['id'],
			offset: 0,
			limit: 10,
		},
		group,
		casename: '查询导入后的用例是否删除成功',
	});
}

export default function () {
	testmanager_baseline_space();
}
