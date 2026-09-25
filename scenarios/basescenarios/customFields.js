import { commonApi } from '../../apiTest/common.js';
import { screenApi } from '../../apiTest/screen.js';
import { generateUUID, getNowString, readEnvData } from '../../tool/allTool.js';

const FIELD_TYPE_KEYS = ['Radio', 'Text', 'LongText', 'Tag', 'Tree', 'User', 'DataQuote', 'Date', 'Checkbox', 'FieldCollection', 'Dropdown', 'BindWorkspace', 'Number'];

const DEFAULT_FIELD_BUILDERS = {
	Text: (suffix) => ({
		name: `crt文本${suffix}`,
		key: `Textcrt${suffix}`,
		fieldTypeKey: 'Text',
		shouldEdit: false,
	}),
	LongText: (suffix) => ({
		name: `crt长文本${suffix}`,
		key: `LongTextcrt${suffix}`,
		fieldTypeKey: 'LongText',
		shouldEdit: false,
	}),
	Radio: (suffix) => ({
		name: `crt单选${suffix}`,
		key: `Radiocrt${suffix}`,
		fieldTypeKey: 'Radio',
		shouldEdit: true,
		editMode: 'field',
		customData: Array.from({ length: 10 }, (_, index) => ({
			label: `label${index + 1}`,
			value: `label${index + 1}`,
		})),
	}),
	Tag: (suffix) => ({
		name: `crt标签${suffix}`,
		key: `Tagcrt${suffix}`,
		fieldTypeKey: 'Tag',
		shouldEdit: true,
		editMode: 'tag',
		data: {
			items: Array.from({ length: 10 }, (_, index) => `标签${index + 1}`),
		},
	}),
	Tree: (suffix) => ({
		name: `crt树形${suffix}`,
		key: `Treecrt${suffix}`,
		fieldTypeKey: 'Tree',
		shouldEdit: true,
		editMode: 'field',
		property: {
			multiple: true,
		},
		customData: Array.from({ length: 10 }, (_, index) => ({
			title: `树形组件${index + 1}`,
			value: `树形组件${index + 1}`,
			id: generateUUID(),
			parentId: null,
		})),
	}),
	User: (suffix) => ({
		name: `crt用户${suffix}`,
		key: `Usercrt${suffix}`,
		fieldTypeKey: 'User',
		shouldEdit: false,
		property: {
			mode: 'multiple',
		},
	}),
	DataQuote: (suffix) => ({
		name: `crt数据引用${suffix}`,
		key: `DataQuotecrt${suffix}`,
		fieldTypeKey: 'DataQuote',
		shouldEdit: false,
	}),
	Date: (suffix) => ({
		name: `crt日期${suffix}`,
		key: `Datecrt${suffix}`,
		fieldTypeKey: 'Date',
		shouldEdit: false,
	}),
	Checkbox: (suffix) => ({
		name: `crt复选${suffix}`,
		key: `Checkboxcrt${suffix}`,
		fieldTypeKey: 'Checkbox',
		shouldEdit: true,
		editMode: 'field',
		customData: Array.from({ length: 10 }, (_, index) => ({
			label: `复选${index + 1}`,
			value: `复选${index + 1}`,
		})),
	}),
	FieldCollection: (suffix) => ({
		name: `crt字段集合${suffix}`,
		key: `FieldCollectioncrt${suffix}`,
		fieldTypeKey: 'FieldCollection',
		shouldEdit: true,
		editMode: 'property',
		property: {
			defaultValue: [{
				recordId: Date.now(),
			}],
			fieldTypes: [{
				fieldId: generateUUID(),
				fieldName: '列1',
				fieldType: 'PURE_TEXT',
			}],
		},
	}),
	Dropdown: (suffix) => ({
		name: `crt下拉${suffix}`,
		key: `Dropdowncrt${suffix}`,
		fieldTypeKey: 'Dropdown',
		shouldEdit: true,
		editMode: 'field',
		customData: Array.from({ length: 10 }, (_, index) => ({
			label: `下拉选项${index + 1}`,
			value: `下拉数据${index + 1}`,
		})),
	}),
	BindWorkspace: (suffix) => ({
		name: `crt绑定空间${suffix}`,
		key: `BindWorkspacecrt${suffix}`,
		fieldTypeKey: 'BindWorkspace',
		shouldEdit: false,
	}),
	Number: (suffix) => ({
		name: `crt数值${suffix}`,
		key: `Numbercrt${suffix}`,
		fieldTypeKey: 'Number',
		shouldEdit: false,
	}),
};

function queryFieldTypeIds(loginRes, fieldTypeKeys = FIELD_TYPE_KEYS) {
	let fieldTypes = commonApi.apiqueryByParse({
		tablename: 'FieldType',
		where: {
			key: {
				'$in': fieldTypeKeys,
			},
		},
		params: {},
		limit: fieldTypeKeys.length,
		keys: 'key,objectId',
		loginRes,
		group: '造数场景.创建字段',
		casename: '查询字段类型',
	});
	let fieldTypeIds = {};
	fieldTypes.results.forEach(fieldType => {
		fieldTypeIds[fieldType.key] = fieldType.objectId;
	});
	return fieldTypeIds;
}

function readLoginRes() {
	const data = readEnvData('data.json');
	return data.loginRes;
}

function buildDefaultEditData(fieldDefinition = {}) {
	if (fieldDefinition.data !== undefined) {
		return fieldDefinition.data;
	}
	if (fieldDefinition.customData !== undefined) {
		return {
			customData: fieldDefinition.customData,
		};
	}
	return {};
}

function editFieldByType(fieldDefinition = {}, createdField = {}, options = {}) {
	const { loginRes, group, casenamePrefix } = options;
	const editData = buildDefaultEditData(fieldDefinition);

	if (fieldDefinition.editMode === 'tag') {
		const tagItems = Array.isArray(editData.items)
			? editData.items
			: (editData.item !== undefined ? [editData.item] : []);
		tagItems.forEach((item, index) => {
			screenApi.apiEditTagFieldCustomData({
				objectId: createdField.objectId,
				data: {
					item,
				},
				loginRes,
				group,
				casename: `${casenamePrefix || fieldDefinition.name}.编辑字段.${index + 1}`,
			});
		});
		return editData;
	}

	if (fieldDefinition.editMode === 'property') {
		screenApi.apiEditField({
			objectId: createdField.objectId,
			property: fieldDefinition.property,
			loginRes,
			group,
			casename: `${casenamePrefix || fieldDefinition.name}.编辑字段`,
		});
		return fieldDefinition.property;
	}

	screenApi.apiEditField({
		objectId: createdField.objectId,
		data: editData,
		loginRes,
		group,
		casename: `${casenamePrefix || fieldDefinition.name}.编辑字段`,
	});
	return editData;
}

function buildFieldDefinition(type = 'Radio', overrides = {}) {
	const suffix = getNowString();
	const builder = DEFAULT_FIELD_BUILDERS[type];
	if (!builder) {
		throw new Error(`Unsupported custom field type: ${type}`);
	}
	return {
		...builder(suffix),
		...overrides,
		fieldTypeKey: overrides.fieldTypeKey || type,
	};
}

// Create one custom field and edit its default options when needed.
export function createAndEditField(options = {}) {
	const {
		type = 'Radio',
		loginRes = readLoginRes(),
		group = '造数场景.创建字段',
		casenamePrefix,
		fieldTypeIds = queryFieldTypeIds(loginRes, FIELD_TYPE_KEYS),
		...overrides
	} = options;
	const fieldDefinition = buildFieldDefinition(type, overrides);
	const fieldTypeId = fieldTypeIds[fieldDefinition.fieldTypeKey];

	if (!fieldTypeId) {
		throw new Error(`Field type id not found: ${fieldDefinition.fieldTypeKey}`);
	}

	const createdField = screenApi.apicreateField({
		params: {
			returnBykey: ['objectId'],
		},
		name: fieldDefinition.name,
		key: fieldDefinition.key,
		property: fieldDefinition.property,
		objectId: fieldTypeId,
		loginRes,
		group,
		casename: `${casenamePrefix || fieldDefinition.name}.创建字段`,
	});

	const shouldEdit = fieldDefinition.shouldEdit === true;
	let editData = null;

	if (shouldEdit) {
		editData = editFieldByType(fieldDefinition, createdField, {
			loginRes,
			group,
			casenamePrefix,
		});
	}

	return {
		objectId: createdField.objectId,
		name: fieldDefinition.name,
		key: fieldDefinition.key,
		fieldTypeKey: fieldDefinition.fieldTypeKey,
		shouldEdit,
		data: editData,
	};
}

// Create multiple custom fields from field definitions.
export function createAndEditFields(fieldDefinitions = [], options = {}) {
	const {
		loginRes = readLoginRes(),
		group = '造数场景.创建字段',
		fieldTypeIds = queryFieldTypeIds(loginRes, FIELD_TYPE_KEYS),
	} = options;

	return fieldDefinitions.map((fieldDefinition, index) => createAndEditField({
		loginRes,
		group,
		fieldTypeIds,
		...fieldDefinition,
		casenamePrefix: fieldDefinition.casenamePrefix || `字段${index + 1}.${fieldDefinition.type || fieldDefinition.fieldTypeKey || 'Radio'}`,
	}));
}

// Delete one custom field by objectId.
export function deleteCustomField(field = {}, options = {}) {
	const {
		loginRes = readLoginRes(),
		group = '造数场景.删除字段',
		casenamePrefix,
	} = options;

	return screenApi.apiDeleteField({
		objectId: field.objectId,
		loginRes,
		group,
		casename: `${casenamePrefix || field.name || field.key || field.objectId}.删除字段`,
	});
}

// Delete multiple custom fields.
export function deleteCustomFields(fields = [], options = {}) {
	const {
		loginRes = readLoginRes(),
		group = '造数场景.删除字段',
	} = options;

	return fields.map((field, index) => deleteCustomField(field, {
		loginRes,
		group,
		casenamePrefix: field.casenamePrefix || `字段${index + 1}.${field.fieldTypeKey || field.type || 'CustomField'}`,
	}));
}

// Create a text custom field.
export function createTextField(group = '造数场景.创建字段', overrides = {}) {
	return createAndEditField({
		type: 'Text',
		group,
		...overrides,
	});
}

// Create a long text custom field.
export function createLongTextField(group = '造数场景.创建字段', overrides = {}) {
	return createAndEditField({
		type: 'LongText',
		group,
		...overrides,
	});
}

// Create a radio custom field.
export function createRadioField(group = '造数场景.创建字段', overrides = {}) {
	return createAndEditField({
		type: 'Radio',
		group,
		...overrides,
	});
}

// Create a tag custom field.
export function createTagField(group = '造数场景.创建字段', overrides = {}) {
	return createAndEditField({
		type: 'Tag',
		group,
		...overrides,
	});
}

// Create a tree custom field.
export function createTreeField(group = '造数场景.创建字段', overrides = {}) {
	return createAndEditField({
		type: 'Tree',
		group,
		...overrides,
	});
}

// Create a user custom field.
export function createUserField(group = '造数场景.创建字段', overrides = {}) {
	return createAndEditField({
		type: 'User',
		group,
		...overrides,
	});
}

// Create a data quote custom field.
export function createDataQuoteField(group = '造数场景.创建字段', overrides = {}) {
	return createAndEditField({
		type: 'DataQuote',
		group,
		...overrides,
	});
}

// Create a date custom field.
export function createDateField(group = '造数场景.创建字段', overrides = {}) {
	return createAndEditField({
		type: 'Date',
		group,
		...overrides,
	});
}

// Create a checkbox custom field.
export function createCheckboxField(group = '造数场景.创建字段', overrides = {}) {
	return createAndEditField({
		type: 'Checkbox',
		group,
		...overrides,
	});
}

// Create a field collection custom field.
export function createFieldCollectionsField(group = '造数场景.创建字段', overrides = {}) {
	return createAndEditField({
		type: 'FieldCollection',
		group,
		...overrides,
	});
}

// Create a dropdown custom field.
export function createDropdownField(group = '造数场景.创建字段', overrides = {}) {
	return createAndEditField({
		type: 'Dropdown',
		group,
		...overrides,
	});
}

// Create a bind workspace custom field.
export function createBindWorkspaceField(group = '造数场景.创建字段', overrides = {}) {
	return createAndEditField({
		type: 'BindWorkspace',
		group,
		...overrides,
	});
}

// Create a number custom field.
export function createNumberField(group = '造数场景.创建字段', overrides = {}) {
	return createAndEditField({
		type: 'Number',
		group,
		...overrides,
	});
}

// Create the default set of supported custom fields.
export function createCustomFields() {
	return createAndEditFields([
		{ type: 'Text' },
		{ type: 'LongText' },
		{ type: 'Radio' },
		{ type: 'Tag' },
		{ type: 'Tree' },
		{ type: 'User' },
		{ type: 'DataQuote' },
		{ type: 'Date' },
		{ type: 'Checkbox' },
		{ type: 'FieldCollection' },
		{ type: 'Dropdown' },
		{ type: 'BindWorkspace' },
		{ type: 'Number' },
	]);
}

// Group custom field helpers for shared scenario reuse.
export const customFields = {
	createAndEditField,
	createAndEditFields,
	deleteCustomField,
	deleteCustomFields,
	createTextField,
	createLongTextField,
	createRadioField,
	createTagField,
	createTreeField,
	createUserField,
	createDataQuoteField,
	createDateField,
	createCheckboxField,
	createFieldCollectionsField,
	createDropdownField,
	createBindWorkspaceField,
	createNumberField,
	createCustomFields,
};

// Default scenario entry for creating the standard custom field set.
export default function () {
	const fields = customFields.createCustomFields();
	// customFields.deleteCustomFields(fields);
}
