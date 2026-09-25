import { ApiOptions } from '../../config/apiOptions.js';

function compactHeaders(headers = {}) {
	const result = {};
	for (const key in headers) {
		if (headers[key] !== undefined) {
			result[key] = headers[key];
		}
	}
	return result;
}

export function jsonRequestParams(params = {}, options = {}) {
	const loginRes = params.loginRes || {};
	const sessionHeaderName = options.sessionHeaderName || 'x-parse-session-token';
	const headers = {
		'Content-Type': options.contentType || params.contentType || 'application/json',
		'Cookie': loginRes.Cookie,
		[sessionHeaderName]: loginRes.sessionToken,
		...(options.addApplicationId === false
			? {}
			: { 'X-Parse-Application-Id': options.applicationId || params.applicationId || ApiOptions.tenant }),
		...(options.headers || {}),
	};
	return {
		timeout: options.timeout || '120s',
		headers: compactHeaders(headers),
	};
}

export function textRequestParams(params = {}, options = {}) {
	const loginRes = params.loginRes || {};
	const sessionHeaderName = options.sessionHeaderName || 'X-Parse-Session-Token';
	const headers = {
		'Content-Type': options.contentType || params.contentType || 'text/plain',
		'Cookie': loginRes.Cookie,
		[sessionHeaderName]: loginRes.sessionToken,
		...(options.addApplicationId === false
			? {}
			: { 'X-Parse-Application-Id': options.applicationId || params.applicationId || ApiOptions.tenant }),
		...(options.headers || {}),
	};
	return {
		timeout: options.timeout || '120s',
		headers: compactHeaders(headers),
	};
}

export function oneRequestParams(params = {}, options = {}) {
	const loginRes = params.loginRes || {};
	const headers = {
		'Accept': options.accept || 'application/json, text/plain, */*',
		'Content-Type': options.contentType || params.contentType || 'application/json',
		'Cookie': loginRes.Cookie,
		'lang': options.lang || 'zh-CN',
		...(options.headers || {}),
	};
	return {
		timeout: options.timeout || '120s',
		headers: compactHeaders(headers),
	};
}
