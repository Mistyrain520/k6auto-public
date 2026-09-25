import { ApiOptions } from '../config/apiOptions.js';
import { generateUUID } from '../tool/allTool.js';
import { callApi } from './core/apiCaller.js';
import { jsonRequestParams, oneRequestParams, textRequestParams } from './core/headers.js';

const screenRoutes = {
	apicreateField: {
		description: 'Create a custom field.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/classes/CustomField`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: (params = {}) => ({
			property: params.property || {},
			name: params.name,
			key: params.key,
			fieldType: {
				__type: 'Pointer',
				className: 'FieldType',
				objectId: params.objectId,
			},
			_ApplicationId: ApiOptions.tenant,
			_SessionToken: params.loginRes.sessionToken,
		}),
	},
	apiEditField: {
		description: 'Edit a custom field.',
		method: 'POST',
		path: (params = {}) => `${ApiOptions.team}/parse/classes/CustomField/${params.objectId}`,
		headers: (params) => textRequestParams(params, {
			contentType: 'text/plain',
			addApplicationId: false,
			sessionHeaderName: 'x-parse-session-token',
			headers: {
				'Accept': '*/*',
			},
		}),
		buildPayload: (params = {}) => {
			const payload = {
				_method: params.method || 'PUT',
				_ApplicationId: params.applicationId || ApiOptions.tenant,
				_SessionToken: params.loginRes && params.loginRes.sessionToken,
			};
			if (params.property !== undefined) {
				payload.property = params.property;
				return payload;
			}
			payload.data = params.data || {
				customData: params.customData || [],
			};
			return payload;
		},
	},
	apiDeleteField: {
		description: 'Delete a custom field.',
		method: 'POST',
		path: (params = {}) => `${ApiOptions.team}/parse/classes/CustomField/${params.objectId}`,
		headers: (params) => textRequestParams(params, {
			contentType: 'text/plain',
			addApplicationId: false,
			sessionHeaderName: 'x-parse-session-token',
			headers: {
				'Accept': '*/*',
			},
		}),
		buildPayload: (params = {}) => ({
			_method: 'DELETE',
			_ApplicationId: params.applicationId || ApiOptions.tenant,
			_SessionToken: params.loginRes && params.loginRes.sessionToken,
		}),
	},
	apiEditTagFieldCustomData: {
		description: 'Edit tag field custom data.',
		method: 'POST',
		path: (params = {}) => `${ApiOptions.team}/parse/api/fields/tag/${params.objectId}/customData`,
		headers: (params) => oneRequestParams(params, {
			contentType: 'application/json',
			headers: {
				'X-PROXIMA-IN-SETTINGS': 'true',
				'X-Parse-Application-Id': ApiOptions.tenant,
				'X-Parse-Session-Token': params.loginRes && params.loginRes.sessionToken,
			},
		}),
		buildPayload: (params = {}) => params.data || {
			item: params.item,
		},
	},
	apicreateScreen: {
		description: 'Create a screen.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/classes/Screen`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: (params = {}) => ({
			layout: {
				_id: generateUUID(),
				component: '_c_root',
				children: params.children,
			},
			config: {
				labelAlign: 'left',
				labelWidth: 120,
				columnsPadding: 0,
			},
			name: params.name,
			_ApplicationId: ApiOptions.tenant,
			_SessionToken: params.loginRes.sessionToken,
		}),
	},
	apicreateScreenScheme: {
		description: 'Create a screen scheme.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/classes/ScreenScheme`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: (params = {}) => ({
			name: params.name,
			defaultScreen: {
				__type: 'Pointer',
				className: 'Screen',
				objectId: params.objectId,
			},
			_ApplicationId: ApiOptions.tenant,
			_SessionToken: params.loginRes.sessionToken,
		}),
	},
	apicreateItemTypeScreenScheme: {
		description: 'Create an item type screen scheme.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/classes/ItemTypeScreenScheme`,
		headers: (params) => jsonRequestParams(params, { sessionHeaderName: 'X-Parse-Session-Token' }),
		buildPayload: (params = {}) => ({
			defaultScreenScheme: {
				__type: 'Pointer',
				className: 'ScreenScheme',
				objectId: params.objectId,
			},
			name: params.name,
			_ApplicationId: ApiOptions.tenant,
			_SessionToken: params.loginRes.sessionToken,
		}),
	},
};

function apicreateField(params = {}) {
	return callApi(screenRoutes.apicreateField, params);
}

function apiEditField(params = {}) {
	return callApi(screenRoutes.apiEditField, params);
}

function apiDeleteField(params = {}) {
	return callApi(screenRoutes.apiDeleteField, params);
}

function apiEditTagFieldCustomData(params = {}) {
	return callApi(screenRoutes.apiEditTagFieldCustomData, params);
}

function apicreateScreen(params = {}) {
	return callApi(screenRoutes.apicreateScreen, params);
}

function apicreateScreenScheme(params = {}) {
	return callApi(screenRoutes.apicreateScreenScheme, params);
}

function apicreateItemTypeScreenScheme(params = {}) {
	return callApi(screenRoutes.apicreateItemTypeScreenScheme, params);
}

export const screenApi = {
	apicreateField,
	apiEditField,
	apiDeleteField,
	apiEditTagFieldCustomData,
	apicreateScreen,
	apicreateScreenScheme,
	apicreateItemTypeScreenScheme,
};
