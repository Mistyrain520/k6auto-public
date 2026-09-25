import { request } from '../../k6http/k6http.js';
import { dealrespon, consoleLog } from '../../tool/allTool.js';
import { jsonRequestParams } from './headers.js';
import { buildApiAssertions } from './assertions.js';

export function parseApiResult(res, params = {}) {
	try {
		return dealrespon(res.res.json(), params.params);
	} catch (err) {
		return dealrespon(res.res.body, params.params);
	}
}

export function callApi(route, params = {}) {
	const payloadBody = route.buildPayload ? route.buildPayload(params) : undefined;
	const payload = route.stringifyPayload === false ? payloadBody : JSON.stringify(payloadBody);
	params.payload = payload;

	const res = request(
		params,
		route.method,
		route.path(params),
		payload,
		route.headers ? route.headers(params) : jsonRequestParams(params)
	);
	const result = route.parseResponse ? route.parseResponse(res, params) : parseApiResult(res, params);

	if (!params.isNotLog) {
		res.report.steps = buildApiAssertions({
			res,
			result,
			params,
			extraAssertions: route.extraAssertions || [],
		});
		consoleLog(res.report);
	}

	return result;
}
