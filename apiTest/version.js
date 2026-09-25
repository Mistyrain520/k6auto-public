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

const versionRoutes = {
	queryVersion: {
		description: 'Query Version schema.',
		method: 'POST',
		path: () => `${ApiOptions.team}/parse/api/apps/schema/Version`,
		headers: schemaHeaders,
		// 真实返回：{ results: [{ objectId, name }, ...] }
		parseResponse: (res) => (res.res.json() || {}).results || [],
		buildPayload: (params = {}) => ({
			where: {
				$or: [{ released: false, archived: false }, { objectId: { $in: [] } }],
				workspace: { __type: 'Pointer', className: 'Workspace', objectId: params.workspaceObjectId },
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

function queryVersion(params = {}) {
	return callApi(versionRoutes.queryVersion, params);
}

export const versionApi = {
	queryVersion,
};
