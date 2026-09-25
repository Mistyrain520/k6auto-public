import { ApiOptions } from '../config/apiOptions.js';
import Assertions from '../tool/assertion.js';
import { callApi } from './core/apiCaller.js';
import { jsonRequestParams } from './core/headers.js';

function schemaHeaders(params = {}) {
	return jsonRequestParams(params, {
		applicationId: params.applicationId,
		headers: {
			'Accept': 'application/json, text/plain, */*',
			'x-proxima-in-settings': 'false',
		},
	});
}

const sprintRoutes = {
	querySprint: {
		description: 'Query Sprint schema.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/api/apps/schema/Sprint`,
		headers: schemaHeaders,
		// 真实返回：{ results: [{ objectId, name }, ...] }
		parseResponse: (res) => (res.res.json() || {}).results || [],
		buildPayload: (params = {}) => ({
			where: {
				workspace: { __type: 'Pointer', className: 'Workspace', objectId: params.workspaceObjectId },
				completed: false,
			},
			include: 'workspace',
			order: '-createdAt',
		}),
		extraAssertions: [
			({ result, params }) =>
				params.params?.arrayLength
					? [Assertions.arrayLength(result || [], params.params.arrayLength[1], params.params.arrayLength[0])]
					: [],
		],
	},
};

function querySprint(params = {}) {
	return callApi(sprintRoutes.querySprint, params);
}

export const sprintApi = {
	querySprint,
};
