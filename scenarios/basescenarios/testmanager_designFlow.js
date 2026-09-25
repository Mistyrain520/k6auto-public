import { sleep } from 'k6';
import { commonApi } from '../../apiTest/common.js';
import { screenApi } from '../../apiTest/screen.js';
import { testManagerDesignApi } from '../../apiTest/testmanager/testmanager_design.js';
import { generateUUID, readEnvData } from '../../tool/allTool.js';
import { testManagerApi } from '../../apiTest/testmanager/testmanager.js';
import { itemApi } from '../../apiTest/item.js';

function readRuntimeData() {
	return readEnvData('data.json');
}

function getResults(raw) {
	if (Array.isArray(raw)) {
		return raw;
	}
	if (raw && Array.isArray(raw.results)) {
		return raw.results;
	}
	if (raw && raw.data && Array.isArray(raw.data.results)) {
		return raw.data.results;
	}
	return [];
}

function getCustomData(field = {}) {
	return (field.data && field.data.customData)
		|| (field.property && field.property.customData)
		|| field.customData
		|| [];
}

function ensureProductOptions(customData = [], products = []) {
	const next = [...customData];
	const exists = new Set(next.map((item) => item && item.value));
	products.forEach((product) => {
		if (!exists.has(product)) {
			next.push({ label: product, value: product });
			exists.add(product);
		}
	});
	return next;
}

function findTagList(value) {
	if (!value || typeof value !== 'object') {
		return [];
	}
	if (Array.isArray(value)) {
		if (value.every((item) => item && item.key && item.objectId)) {
			return value;
		}
		for (const item of value) {
			const nested = findTagList(item);
			if (nested.length) {
				return nested;
			}
		}
		return [];
	}
	if (Array.isArray(value.tagList)) {
		return value.tagList;
	}
	for (const key in value) {
		const nested = findTagList(value[key]);
		if (nested.length) {
			return nested;
		}
	}
	return [];
}

function tagByKey(tags = [], key) {
	const tag = tags.find((item) => item.key === key);
	if (!tag) {
		throw new Error(`Missing test design tag: ${key}`);
	}
	return {
		...tag,
		text: tag.text || tag.name,
		style: tag.style || { fill: tag.backgroundColor },
	};
}

function findTestDesignObjectId(value, itemId) {
	if (!value || typeof value !== 'object') {
		return null;
	}
	if (value.data && value.data.objectId) {
		return value.data.objectId;
	}
	if (value.objectId && (
		value.designData
		|| value.mindData
		|| (value.data && (value.data.designData || value.data.mindData))
		|| value.itemId === itemId
		|| value.item === itemId
		|| (value.item && value.item.objectId === itemId)
	)) {
		return value.objectId;
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			const objectId = findTestDesignObjectId(item, itemId);
			if (objectId) {
				return objectId;
			}
		}
		return null;
	}
	for (const key in value) {
		const objectId = findTestDesignObjectId(value[key], itemId);
		if (objectId) {
			return objectId;
		}
	}
	return null;
}

function hasMindDataChildren(value) {
	if (!value || typeof value !== 'object') {
		return false;
	}
	if (value.data && Array.isArray(value.data.children) && value.data.children.length > 0) {
		return true;
	}
	if (value.mindData && Array.isArray(value.mindData.children) && value.mindData.children.length > 0) {
		return true;
	}
	if (Array.isArray(value.children) && value.children.length > 0) {
		return true;
	}
	if (Array.isArray(value)) {
		return value.some((item) => hasMindDataChildren(item));
	}
	for (const key in value) {
		if (hasMindDataChildren(value[key])) {
			return true;
		}
	}
	return false;
}

function createNode(text, tag, parent = null, extra = {}) {
	return {
		data: {
			text,
			uid: generateUUID(),
			expand: true,
			richText: false,
			isActive: false,
			...(parent ? { parent } : {}),
			...(tag ? { tag: [tag] } : { tag: [] }),
			...extra,
		},
		children: [],
	};
}

function designDataEntry(userId, tag) {
	return {
		createdAt: new Date().toISOString(),
		createdBy: userId,
		testTagId: tag && tag.objectId ? tag.objectId : '',
	};
}

function normalizeRange(range, defaultRange, name) {
	const next = Array.isArray(range) ? range : defaultRange;
	if (!Array.isArray(next) || next.length !== 2) {
		throw new Error(`${name} must be [start, end]`);
	}
	const start = Number(next[0]);
	const end = Number(next[1]);
	if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
		throw new Error(`${name} must use positive integers and end >= start`);
	}
	return [start, end];
}

function rangeCount(range) {
	return range[1] - range[0] + 1;
}

function readProducts(data, productRange) {
	const fieldProducts = data && data.productField && data.productField.products;
	let products = [];
	if (fieldProducts && typeof fieldProducts === 'object') {
		products = Object.keys(fieldProducts)
			.map((key) => fieldProducts[key])
			.filter((value) => typeof value === 'string' && value.length > 0);
	}
	if (products.length === 0) {
		throw new Error('当前环境 data.json 的 productField.products 为空，无法生成数据因子产品值');
	}
	const start = productRange[0] - 1;
	const end = Math.min(productRange[1], products.length);
	const selected = products.slice(start, end);
	return selected.length > 0 ? selected : products;
}
function addDesignData(designData, userId, node) {
	const tag = node.data.tag && node.data.tag[0];
	designData[node.data.uid] = designDataEntry(userId, tag);
}

function createValueNodes({
	parent,
	product,
	count,
	tag,
	levelType,
	textPrefix,
	factorPrefix = '',
}) {
	const nodes = [];
	for (let index = 1; index <= count; index += 1) {
		nodes.push(createNode(`${factorPrefix}${product}产品${textPrefix}${index}`, tag, parent.data.uid, {
			_productValues: [product],
			_levelType: levelType,
		}));
	}
	return nodes;
}

function buildDesignPayload(tags, productValues, userId, ranges) {
	const root = createNode('测试设计', null);
	const caseNode = createNode('crt用例1', tagByKey(tags, 'case'), root.data.uid);
	const actionFactorNode = createNode('我是动作因子', tagByKey(tags, 'testActionFactor'), caseNode.data.uid);
	const preconditionNode = createNode('前置条件', tagByKey(tags, 'precondition'), actionFactorNode.data.uid, { _operation: 'generateTestCaseStructure' });
	const actionNode = createNode('步骤', tagByKey(tags, 'action'), actionFactorNode.data.uid, { _operation: 'generateTestCaseStructure' });
	const resultNode = createNode('预期结果', tagByKey(tags, 'result'), actionNode.data.uid, { _operation: 'generateTestCaseStructure' });
	const stepDataNode = createNode('数据', tagByKey(tags, 'data'), resultNode.data.uid, { _operation: 'generateTestCaseStructure' });
	const dataFactors = [];
	const designData = {};
	const validCount = rangeCount(ranges.validValueRange);
	const invalidCount = rangeCount(ranges.invalidValueRange);
	const testDataFactorTag = tagByKey(tags, 'testDataFactor');
	const validValueTag = tagByKey(tags, 'validValue');
	const invalidValueTag = tagByKey(tags, 'invalidValue');

	for (let index = ranges.dataFactorRange[0]; index <= ranges.dataFactorRange[1]; index += 1) {
		const factorIndex = index - ranges.dataFactorRange[0] + 1;
		const dataFactorNode = createNode(`我是数据因子${factorIndex}`, testDataFactorTag, caseNode.data.uid);
		const valueNodes = [];
		productValues.forEach((product) => {
			const validNodes = createValueNodes({
				parent: dataFactorNode,
				product,
				count: validCount,
				tag: validValueTag,
				levelType: 'valid',
				textPrefix: '有效值',
				factorPrefix: `crt数据因子${factorIndex}`,
			});
			const invalidNodes = createValueNodes({
				parent: dataFactorNode,
				product,
				count: invalidCount,
				tag: invalidValueTag,
				levelType: 'invalid',
				textPrefix: '无效值',
				factorPrefix: `crt数据因子${factorIndex}`,
			});
			valueNodes.push(...validNodes, ...invalidNodes);
		});
		dataFactorNode.children.push(...valueNodes);
		dataFactors.push({
			node: dataFactorNode,
			valueNodes,
		});
	}

	resultNode.children.push(stepDataNode);
	actionNode.children.push(resultNode);
	actionFactorNode.children.push(preconditionNode, actionNode);
	caseNode.children.push(...dataFactors.map((item) => item.node), actionFactorNode);
	root.children.push(caseNode);

	const collectNodes = (node) => {
		addDesignData(designData, userId, node);
		node.children.forEach(collectNodes);
	};
	collectNodes(root);

	return {
		root,
		caseNode,
		dataFactors,
		actionFactorNode,
		preconditionNode,
		actionNode,
		resultNode,
		stepDataNode,
		designData,
	};
}

function buildLevelData(dataFactor) {
	const levels = [];
	(dataFactor.valueNodes || []).forEach((node) => {
		const products = node.data._productValues || [];
		const levelType = nodeTagKey(node) === 'invalidValue' ? 'invalid' : 'valid';
		products.forEach((product) => {
			levels.push({
				level: node.data.text,
				levelType,
				recordId: `${node.data.uid}-${product}`,
				productDimensionId: product,
			});
		});
	});
	return levels;
}
function buildDraft(design) {
	const stepId = generateUUID();
	const actionStep = {
		action: design.actionNode.data.text,
		result: design.resultNode.data.text,
		data: design.stepDataNode.data.text,
		__innerHTML__: {
			action: design.actionNode.data.text,
			result: design.resultNode.data.text,
			data: design.stepDataNode.data.text,
		},
		id: design.actionNode.data.uid,
	};
	return {
		uid: design.caseNode.data.uid,
		name: design.caseNode.data.text,
		detail: {
			precondition: design.preconditionNode.data.text,
			steps: [{
				action: design.actionNode.data.text,
				result: design.resultNode.data.text,
				data: design.stepDataNode.data.text,
				id: stepId,
			}],
		},
		method: 'Preview',
		actionFactors: [{
			id: design.actionFactorNode.data.uid,
			name: design.actionFactorNode.data.text,
			detail: {
				precondition: design.preconditionNode.data.text,
				steps: [actionStep],
			},
			type: 'TestActionFactor',
		}],
		dataFactors: design.dataFactors.map((dataFactor) => ({
			id: dataFactor.node.data.uid,
			name: dataFactor.node.data.text,
			levelData: buildLevelData(dataFactor),
			type: 'TestDataFactor',
		})),
	};
}

function resolveRuntimeOptions(options = {}) {
	const data = options.runtimeData || readRuntimeData();
	const loginRes = options.loginRes || data.loginRes;
	const userId = options.userId || (data.admin && data.admin.objectId);
	const workspaceKey = options.workspaceKey || (data.myworkspace && data.myworkspace.key);

	if (!loginRes || !workspaceKey || !userId) {
		throw new Error('当前环境 data.json 缺少 loginRes、myworkspace.key 或 admin.objectId');
	}
	if (!options.testDesignItemId) {
		throw new Error('createDesignMindData requires options.testDesignItemId');
	}

	return {
		data,
		loginRes,
		userId,
		workspaceKey,
		testDesignItemId: options.testDesignItemId,
	};
}

function ensureAssociatedProductOptions({ loginRes, group, targetProducts }) {
	const customFieldQuery = commonApi.apiqueryByParse({
		loginRes,
		tablename: 'CustomField',
		where: { key: 'associated_product' },
		keys: 'name,key,objectId,data,property,fieldType',
		limit: 1,
		group,
		casename: '查询 associated_product 自定义字段',
	});
	const productField = getResults(customFieldQuery)[0];
	if (!productField || !productField.objectId) {
		throw new Error('没有找到 key 为 associated_product 的自定义字段');
	}

	screenApi.apiEditField({
		loginRes,
		objectId: productField.objectId,
		data: {
			...(productField.data || {}),
			customData: ensureProductOptions(getCustomData(productField), targetProducts),
		},
		group,
		casename: `补齐 ${targetProducts[0]} 到 ${targetProducts[targetProducts.length - 1]} 产品选项`,
	});
	sleep(1);
}

function findMindDataTree(value) {
	if (!value || typeof value !== 'object') {
		return null;
	}
	if (value.data && typeof value.data === 'object' && Array.isArray(value.children) && value.smmVersion) {
		return value;
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			const found = findMindDataTree(item);
			if (found) {
				return found;
			}
		}
		return null;
	}
	for (const key in value) {
		const found = findMindDataTree(value[key]);
		if (found) {
			return found;
		}
	}
	return null;
}

function nodeTagKey(node) {
	const tag = node && node.data && node.data.tag;
	return Array.isArray(tag) && tag[0] ? tag[0].key : null;
}

function validateMindDataStructure(mindData, expected = {}) {
	const issues = [];
	const products = expected.products || [];
	const validCount = expected.validCount || 1;
	const invalidCount = expected.invalidCount || 1;
	const seen = new Set();
	const collect = (node) => {
		if (!node || !node.data || !node.data.uid) {
			issues.push('存在缺少 uid 的脑图节点');
			return;
		}
		if (seen.has(node.data.uid)) {
			issues.push(`脑图节点 uid 重复: ${node.data.uid}`);
		}
		seen.add(node.data.uid);
		(node.children || []).forEach(collect);
	};
	collect({ data: mindData.data, children: mindData.children });

	const caseNodes = (mindData.children || []).filter((node) => nodeTagKey(node) === 'case');
	if (caseNodes.length !== 1) {
		issues.push(`用例节点(case)数量应为 1，实际 ${caseNodes.length}`);
		return issues;
	}
	const caseNode = caseNodes[0];
	const dataFactorNodes = (caseNode.children || []).filter((node) => nodeTagKey(node) === 'testDataFactor');
	if (dataFactorNodes.length < 1) {
		issues.push('用例节点下缺少数据因子(testDataFactor)节点');
	}
	dataFactorNodes.forEach((factorNode, factorIndex) => {
		const valueNodes = factorNode.children || [];
		const productLayerNodes = valueNodes.filter((node) => !nodeTagKey(node));
		if (productLayerNodes.length > 0) {
			issues.push(`数据因子${factorIndex + 1} 下存在无标签的产品层节点，正确结构应直接挂有效值/无效值节点`);
		}
		products.forEach((product) => {
			const validNodes = valueNodes.filter((node) => nodeTagKey(node) === 'validValue' && Array.isArray(node.data._productValues) && node.data._productValues.includes(product));
			const invalidNodes = valueNodes.filter((node) => nodeTagKey(node) === 'invalidValue' && Array.isArray(node.data._productValues) && node.data._productValues.includes(product));
			if (validNodes.length !== validCount) {
				issues.push(`产品 ${product} 有效值节点数量应为 ${validCount}，实际 ${validNodes.length}`);
			}
			if (invalidNodes.length !== invalidCount) {
				issues.push(`产品 ${product} 无效值节点数量应为 ${invalidCount}，实际 ${invalidNodes.length}`);
			}
		});
	});

	const actionFactorNodes = (caseNode.children || []).filter((node) => nodeTagKey(node) === 'testActionFactor');
	if (actionFactorNodes.length !== 1) {
		issues.push(`动作因子(testActionFactor)节点数量应为 1，实际 ${actionFactorNodes.length}`);
	} else {
		const actionFactorNode = actionFactorNodes[0];
		const preconditionNodes = (actionFactorNode.children || []).filter((node) => nodeTagKey(node) === 'precondition');
		const actionNodes = (actionFactorNode.children || []).filter((node) => nodeTagKey(node) === 'action');
		if (preconditionNodes.length !== 1) {
			issues.push('动作因子下缺少前置条件(precondition)节点');
		}
		if (actionNodes.length !== 1) {
			issues.push('动作因子下缺少步骤(action)节点');
		} else {
			const resultNodes = (actionNodes[0].children || []).filter((node) => nodeTagKey(node) === 'result');
			if (resultNodes.length !== 1) {
				issues.push('步骤(action)下缺少预期结果(result)节点');
			} else {
				const dataNodes = (resultNodes[0].children || []).filter((node) => nodeTagKey(node) === 'data');
				if (dataNodes.length !== 1) {
					issues.push('预期结果(result)下缺少数据(data)节点');
				}
			}
		}
	}
	return issues;
}
function validateDraftConsistency(draft, design) {
	const issues = [];
	const nodeByUid = new Map();
	const collect = (node) => {
		if (node && node.data && node.data.uid) {
			nodeByUid.set(node.data.uid, node);
		}
		(node.children || []).forEach(collect);
	};
	(design.dataFactors || []).forEach(({ node }) => collect(node));
	(draft.dataFactors || []).forEach((dataFactor) => {
		(dataFactor.levelData || []).forEach((level) => {
			const recordId = String(level.recordId || '');
			const uid = recordId.lastIndexOf('-') > 0 ? recordId.slice(0, recordId.lastIndexOf('-')) : recordId;
			const node = nodeByUid.get(uid);
			if (!node) {
				issues.push(`草稿 levelData 引用不存在的节点 uid: ${uid}（产品 ${level.productDimensionId}，${level.levelType}）`);
				return;
			}
			const data = node.data || {};
			const tagKey = nodeTagKey(node);
			const nodeLevelType = tagKey === 'invalidValue' ? 'invalid' : tagKey === 'validValue' ? 'valid' : null;
			if (!Array.isArray(data._productValues) || !data._productValues.includes(level.productDimensionId) || nodeLevelType !== level.levelType) {
				issues.push(`草稿 levelData 与树节点不一致: ${uid}（树: ${JSON.stringify(data._productValues)}/${nodeLevelType}，草稿: ${level.productDimensionId}/${level.levelType}）`);
			}
		});
	});
	return issues;
}
export function createDesignMindData(group, options = {}) {
	const runtime = resolveRuntimeOptions(options);
	const productRange = normalizeRange(options.productRange, [1, 10], 'productRange');
	const dataFactorRange = normalizeRange(options.dataFactorRange, [1, 1], 'dataFactorRange');
	const validValueRange = normalizeRange(options.validValueRange, [1, 1], 'validValueRange');
	const invalidValueRange = normalizeRange(options.invalidValueRange, [1, 1], 'invalidValueRange');
	const products = readProducts(runtime.data, productRange);
	const createCaseFromDraft = options.createCaseFromDraft !== false;

	ensureAssociatedProductOptions({
		loginRes: runtime.loginRes,
		group,
		targetProducts: products,
	});

	const testDesignData = testManagerDesignApi.apiGetTestDesignByItem({
		loginRes: runtime.loginRes,
		itemId: runtime.testDesignItemId,
		workspaceKey: runtime.workspaceKey,
		returnRaw: true,
		group,
		casename: '查询测试设计数据对象',
	});
	const testDesignObjectId = findTestDesignObjectId(testDesignData, runtime.testDesignItemId);
	if (!testDesignObjectId) {
		throw new Error(`没有查询到测试设计数据对象，事项ID: ${runtime.testDesignItemId}`);
	}

	const tagResult = testManagerDesignApi.apiQueryTestTag({
		loginRes: runtime.loginRes,
		body: {
			isWorkspace: true,
			workspaceKey: runtime.workspaceKey,
		},
		returnRaw: true,
		group,
		casename: '获取系统标签',
	});
	const tags = findTagList(tagResult);
	const design = buildDesignPayload(tags, products, runtime.userId, {
		dataFactorRange,
		validValueRange,
		invalidValueRange,
	});
	design.productValues = products;
	const draft = buildDraft(design);

	const draftIssues = validateDraftConsistency(draft, design);
	if (draftIssues.length > 0) {
		throw new Error(`测试设计草稿数据结构异常：${draftIssues.join('; ')}`);
	}

	const saveMindData = () => {
		testManagerDesignApi.apiUpdateTestDesign({
			loginRes: runtime.loginRes,
			body: {
				objectId: testDesignObjectId,
				data: {
					mindData: {
						data: design.root.data,
						children: design.root.children,
						smmVersion: '0.14.0-fix.1',
					},
					designData: design.designData,
				},
				userId: runtime.userId,
			},
			group,
			casename: '编辑保存测试脑图数据',
		});
	};
	saveMindData();

	const savedDesignData = testManagerDesignApi.apiGetTestDesignByItem({
		loginRes: runtime.loginRes,
		itemId: runtime.testDesignItemId,
		workspaceKey: runtime.workspaceKey,
		returnRaw: true,
		group,
		casename: '回查测试设计脑图数据',
	});
	if (!hasMindDataChildren(savedDesignData)) {
		throw new Error(`测试设计脑图数据回查为空，测试设计对象ID: ${testDesignObjectId}`);
	}
	// 脑图结构校验：数据因子必须是 产品 -> 有效值/无效值 三层，异常时重新保存正确结构修复
	const expectedStructure = {
		products,
		validCount: validValueRange[1] - validValueRange[0] + 1,
		invalidCount: invalidValueRange[1] - invalidValueRange[0] + 1,
	};
	let savedTree = findMindDataTree(savedDesignData);
	let structureIssues = savedTree
		? validateMindDataStructure(savedTree, expectedStructure)
		: ['回查结果中未找到脑图树结构(mindData)'];
	if (structureIssues.length > 0) {
		console.log(`[测试设计脑图结构校验] 保存结果结构异常（${structureIssues.length} 处），重新保存正确结构进行修复`);
		structureIssues.forEach((issue) => console.log(`  - ${issue}`));
		saveMindData();
		const repairedDesignData = testManagerDesignApi.apiGetTestDesignByItem({
			loginRes: runtime.loginRes,
			itemId: runtime.testDesignItemId,
			workspaceKey: runtime.workspaceKey,
			returnRaw: true,
			group,
			casename: '回查测试设计脑图数据(修复后)',
		});
		const repairedTree = findMindDataTree(repairedDesignData);
		structureIssues = repairedTree
			? validateMindDataStructure(repairedTree, expectedStructure)
			: ['修复后回查仍未找到脑图树结构(mindData)'];
		if (structureIssues.length > 0) {
			throw new Error(`测试设计脑图结构修复失败：${structureIssues.join('; ')}`);
		}
		console.log('[测试设计脑图结构校验] 修复成功，结构符合预期');
	}

	testManagerDesignApi.apiUpdateTestDesignNode({
		loginRes: runtime.loginRes,
		body: {
			objectId: testDesignObjectId,
			operation: 'generateCombineCaseDraft',
			parentId: design.caseNode.data.uid,
			userId: runtime.userId,
			data: draft,
		},
		group,
		casename: '生成用例草稿数据',
	});

	let draftResult = null;
	if (createCaseFromDraft) {
		draftResult = testManagerDesignApi.apiBatchCreateCaseFromDraft({
			loginRes: runtime.loginRes,
			body: {
				repository: 'root',
				drafts: [{
					uid: draft.uid,
					detail: draft.detail,
					title: draft.name,
					combinationAlgorithm: draft.method,
					dataFactors: draft.dataFactors,
					actionFactors: draft.actionFactors,
					group: '',
				}],
				folderPath: '',
				createFolderFromTree: false,
				workspaceKey: runtime.workspaceKey,
				objectId: testDesignObjectId,
				userId: runtime.userId,
			},
			group,
			casename: '保存草稿用例入库',
		});
	}


	// ============ CLEANUP: 删除测试设计事项 ============
	if (options.cleanup) {
		itemApi.apideleteItems({
			loginRes: runtime.loginRes,
			itemIds: [runtime.testDesignItemId],
			group,
			casename: '清理：删除测试设计事项',
		});
	}

	return {
		testDesignItemId: runtime.testDesignItemId,
		testDesignObjectId,
		draft,
		productValues: products,
		dataFactors: design.dataFactors,
		design,
	};
}

const testmanager_designFlow = {
	createDesignMindData,
};

export default testmanager_designFlow;
