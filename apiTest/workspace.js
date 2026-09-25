import { ApiOptions } from '../config/apiOptions.js';
import Assertions from '../tool/assertion.js';
import { callApi } from './core/apiCaller.js';
import { oneRequestParams } from './core/headers.js';

function workspaceTextRequestParams(params = {}) {
	const loginRes = params.loginRes || {};
	return {
		timeout: '120s',
		headers: {
			'Content-Type': 'text/plain',
			'Cookie': loginRes.Cookie || ApiOptions.token,
			'X-Parse-Application-Id': ApiOptions.tenant,
			'X-Parse-Session-Token': loginRes.sessionToken || ApiOptions.token,
		},
	};
}

function buildWorkspacePayload(params = {}) {
	return {
		name: params.name + ApiOptions.projectuuid,
		key: params.key + ApiOptions.projectuuid,
		icon: '/icons/RedFlagIcon.svg',
		permissionScheme: {
			__type: 'Pointer',
			className: 'PermissionScheme',
			objectId: 'K8e9HweEcy',
		},
		itemTypeScheme: {
			__type: 'Pointer',
			className: 'ItemTypeScheme',
			objectId: params.itemTypeScheme,
		},
		itemTypeScreenScheme: {
			__type: 'Pointer',
			className: 'ItemTypeScreenScheme',
			objectId: params.itemTypeScreenScheme,
		},
		workflowScheme: {
			__type: 'Pointer',
			className: 'WorkflowScheme',
			objectId: params.workflowScheme,
		},
		_context: {
			noSkipLog: true,
		},
		_ApplicationId: ApiOptions.tenant,
		_SessionToken: (params.loginRes && params.loginRes.sessionToken) || ApiOptions.token,
	};
}

function buildOneWorkspacePayload(params = {}) {
	return {
		status: 'PRIVATE',
		companyUuid: ApiOptions.tenant,
		spaceType: '',
		templateSpaceUuid: '',
		name: params.name,
		uuid: params.uuid,
		schemeId: params.schemeId || '',
		itemTypeScheme: params.itemTypeScheme,
		itemTypeScreenScheme: params.itemTypeScreenScheme,
		workflowScheme: params.workflowScheme,
		xlyProjectComponentBeans: [
			{ componentUuid: 'IPIPE_COMPONENT' },
			{ componentUuid: 'wiki' },
			{ componentUuid: 'GITEE_COMPONENT' },
			{ componentUuid: 'PROXIMA_COMPONENT' },
		],
		customs: [],
	};
}

const baselineCustoms = [
	{ data: '', customId: 84, type: 'RADIO_FIELD' },
	{ data: '', customId: 193, type: 'FREE_TEXT_FIELD' },
	{ data: '', customId: 204, type: 'DATE_TIME' },
	{ data: '', customId: 206, type: 'RADIO_FIELD' },
	{ data: '', customId: 210, type: 'NUMBER_FIELD' },
	{ data: '', customId: 211, type: 'FREE_TEXT_FIELD' },
	{ data: '', customId: 212, type: 'TEXT_AREA_FIELD' },
	{ data: '', customId: 213, type: 'FREE_TEXT_FIELD' },
	{ data: '', customId: 215, type: 'FREE_TEXT_FIELD' },
	{ data: '', customId: 86, type: 'RADIO_FIELD' },
	{ data: '', customId: 81, type: 'TEXT_AREA_FIELD' },
	{ data: '', customId: 82, type: 'FREE_TEXT_FIELD' },
	{ data: '', customId: 83, type: 'FREE_TEXT_FIELD' },
	{ data: '', customId: 85, type: 'FREE_TEXT_FIELD' },
];

function buildOneBaselineWorkspacePayload(params = {}) {
	return {
		status: 'PRIVATE',
		companyUuid: ApiOptions.tenant,
		spaceType: '',
		templateSpaceUuid: '',
		name: params.name,
		uuid: params.uuid,
		description: params.description || '',
		schemeId: params.schemeId || '',
		itemTypeScheme: params.itemTypeScheme,
		itemTypeScreenScheme: params.itemTypeScreenScheme,
		workflowScheme: params.workflowScheme,
		xlyProjectComponentBeans: params.xlyProjectComponentBeans || [
			{ componentUuid: 'PROXIMA_COMPONENT' },
			{ componentUuid: 'GITEE_COMPONENT' },
			{ componentUuid: 'ISCAN_COMPONENT' },
		],
		parentType: params.parentType || 'child',
		parentUuidList: params.parentUuidList || [],
		baseLineProjectType: params.baseLineProjectType || '1',
		customs: params.customs || baselineCustoms,
	};
}

function findPermissionScheme(res, params = {}) {
	const body = res.res.json();
	if (body && body.payload && body.payload.list) {
		for (const item of body.payload.list) {
			if (item.name === params.name) {
				return item;
			}
		}
	}
	return null;
}

const workspaceRoutes = {
	apiWorkspace: {
		description: 'Create a workspace by Parse class API.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/classes/Workspace`,
		headers: workspaceTextRequestParams,
		buildPayload: buildWorkspacePayload,
	},
	apiQueryPermissionScheme: {
		description: 'Query a permission scheme by name.',
		method: 'GET',
		path: (params = {}) => {
			const name = encodeURIComponent(params.name);
			return `/api/one/${ApiOptions.tenant}/rest/v1/companies/${ApiOptions.tenant}/permissions/schemes?name=${name}&page=1&pageSize=20`;
		},
		headers: oneRequestParams,
		parseResponse: findPermissionScheme,
	},
	apiCreateOneWorkspace: {
		description: 'Create a One workspace.',
		method: 'POST',
		path: () => `/api/one/${ApiOptions.tenant}/rest/v2/companies/${ApiOptions.tenant}/projects`,
		headers: oneRequestParams,
		buildPayload: buildOneWorkspacePayload,
	},
	apiCreateBaseLineOneWorkspace: {
		description: 'Create a One baseline workspace.',
		method: 'POST',
		path: () => `/api/one/${ApiOptions.tenant}/rest/v2/companies/${ApiOptions.tenant}/projects`,
		headers: oneRequestParams,
		buildPayload: buildOneBaselineWorkspacePayload,
		extraAssertions: [
			({ result }) => Assertions.equals(result?.code, 0),
		],
	},
	apiCreatePermissionScheme: {
		description: 'Create a permission scheme.',
		method: 'POST',
		path: () => `/api/one/${ApiOptions.tenant}/rest/v1/companies/${ApiOptions.tenant}/permissions/schemes`,
		headers: oneRequestParams,
		buildPayload: (params = {}) => ({
			name: params.name,
		}),
	},
	apiDeleteWorkspace: {
		description: 'Delete a workspace.',
		method: 'DELETE',
		path: (params = {}) => `/api/one/${ApiOptions.tenant}/rest/v1/companies/${ApiOptions.tenant}/projects/${params.projectId}`,
		headers: oneRequestParams,
		buildPayload: (params = {}) => ({
			password: params.password,
		}),
	},
};

function apiWorkspace(params = {}) {
	return callApi(workspaceRoutes.apiWorkspace, params);
}

function apiQueryPermissionScheme(params = {}) {
	return callApi(workspaceRoutes.apiQueryPermissionScheme, params);
}

function apiCreateOneWorkspace(params = {}) {
	return callApi(workspaceRoutes.apiCreateOneWorkspace, params);
}

function apiCreateBaseLineOneWorkspace(params = {}) {
	return callApi(workspaceRoutes.apiCreateBaseLineOneWorkspace, params);
}

function apiCreatePermissionScheme(params = {}) {
	return callApi(workspaceRoutes.apiCreatePermissionScheme, params);
}

function apiDeleteWorkspace(params = {}) {
	return callApi(workspaceRoutes.apiDeleteWorkspace, params);
}

export const workspaceApi = {
	apiWorkspace,
	apiQueryPermissionScheme,
	apiCreateOneWorkspace,
	apiCreateBaseLineOneWorkspace,
	apiCreatePermissionScheme,
	apiDeleteWorkspace,
};
