import file from 'k6/x/file';
import encoding from 'k6/encoding';
import { ApiOptions } from '../config/apiOptions.js';
import { callApi } from './core/apiCaller.js';
import { jsonRequestParams, textRequestParams } from './core/headers.js';

function fileToBase64(filePath) {
	const content = file.readFile(filePath);
	if (!content) {
		console.error('无法读取文件:', filePath);
		return null;
	}
	return encoding.b64encode(content);
}

function buildExecuteImportPayload(params = {}) {
	return {
		url: params.url,
		processBarKey: params.processBarKey || 'rc-upload-' + Date.now() + '-import',
		workspaceId: params.workspaceId,
		fieldMappings: params.fieldMappings || [{
			sheet: '事项列表',
			fieldMapping: {
				'标题': 'name',
				'类型': 'itemType',
				'负责人': 'assignee',
				'优先级': 'priority',
				'前置条件': 'precondition',
				'步骤': 'action',
				'预期结果': 'result',
				'数据': 'data',
				'所属目录': 'group',
				'自动化脚本': 'r_test_manager_automationScripts'
			},
		}],
		app: params.app || 'test_manager',
		applicationId: ApiOptions.tenant,
		extraParams: params.extraParams || {},
		repositoryType: params.repositoryType || 'case',
	};
}

const fileRoutes = {
	importTestCaseFile: {
		description: 'Upload an import file for test cases.',
		method: 'POST',
		path: (params = {}) => `${ApiOptions.team}/parse/files/${encodeURIComponent(params.fileName)}`,
		headers: (params) => textRequestParams(params, {
			contentType: 'text/plain',
			addApplicationId: false,
			sessionHeaderName: 'x-parse-session-token',
		}),
		buildPayload: (params = {}) => ({
			base64: params.base64,
			fileData: params.fileData || { metadata: {}, tags: { FileSource: 'ItemImport' } },
			_ContentType: params.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			_ApplicationId: params.applicationId || ApiOptions.tenant,
			_SessionToken: params.loginRes && params.loginRes.sessionToken,
		}),
	},
	executeImport: {
		description: 'Execute test case import.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/api/v2/items/import`,
		headers: (params) => jsonRequestParams(params, {
			timeout: '300s',
			sessionHeaderName: 'X-Parse-Session-Token',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'X-PROXIMA-IN-SETTINGS': 'false',
			},
		}),
		buildPayload: buildExecuteImportPayload,
	},
};

function importTestCaseFile(params = {}) {
	return callApi(fileRoutes.importTestCaseFile, params);
}

function importTestCaseFileFromPath(params = {}) {
	const actualFileName = params.fileName || params.filePath.split('/').pop().split('\\').pop();
	const base64 = fileToBase64(params.filePath);
	if (!base64) {
		console.error('文件转 Base64 失败');
		return null;
	}

	console.log('文件读取成功:', actualFileName, 'Base64 长度:', base64.length);

	return importTestCaseFile({
		loginRes: params.loginRes,
		domainName: params.domainName,
		applicationId: params.applicationId,
		fileName: actualFileName,
		base64,
		fileData: params.fileData,
		contentType: params.contentType,
		group: params.group,
		casename: params.casename,
		isNotLog: params.isNotLog,
		params: params.params,
	});
}

function executeImport(params = {}) {
	return callApi(fileRoutes.executeImport, params);
}

export const fileApi = {
	importTestCaseFile,
	importTestCaseFileFromPath,
	executeImport,
};
