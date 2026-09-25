import http from 'k6/http';
import file from 'k6/x/file';
import { buildLogUrl, getConfig, readKubeconfig } from './shared.js';
import { outputPath, timeText } from '../../tool/outputPath.js';

function normalizePodNames(podNames) {
	if (!Array.isArray(podNames)) {
		return [];
	}

	return podNames
		.map((podName) => (podName === undefined || podName === null ? '' : String(podName).trim()))
		.filter(Boolean);
}

function buildAuthHeaders(token) {
	return {
		Accept: 'application/json',
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
}

function summarizeLogBody(body) {
	const text = body || '';
	const lines = text ? text.split(/\r?\n/).filter((line) => line.length > 0) : [];

	return {
		body: text,
		lineCount: lines.length,
		bytes: text.length,
	};
}

function defaultOutputPath() {
	// 每次运行一个独立文件，避免同一天多次运行互相覆盖
	return outputPath('pods', `pods-${timeText()}.log`);
}

function dirname(filePath) {
	const index = filePath.lastIndexOf('/');
	return index > 0 ? filePath.slice(0, index) : '.';
}

function formatPodsLogs(results) {
	return results
		.map((item) => {
			const header = `===== pod: ${item.podName} =====`;
			if (!item.ok) {
				return `${header}\n[failed] status=${item.status} message=${item.message || ''}`;
			}

			return `${header}\n${item.body || ''}`;
		})
		.join('\n\n');
}

function writePodsLogs(options, result) {
	if (options.writeLog === false || options.writeToFile === false) {
		return result;
	}

	const outputPath = options.outputPath || options.logPath || defaultOutputPath();
	const logText = formatPodsLogs(result.results);

	try {
		file.createDirectory(dirname(outputPath));
		file.writeString(outputPath, logText);
		return {
			...result,
			outputPath,
		};
	} catch (error) {
		const writeError = error && error.message ? error.message : String(error);
		console.error(`写入 Pod 日志失败: path=${outputPath}, message=${writeError}`);
		return {
			...result,
			ok: false,
			outputPath,
			writeError,
			message: `${result.message}; pod logs file write failed`,
		};
	}
}

function getPodsLogsSince(options = {}) {
	const config = getConfig(options);
	const podNames = normalizePodNames(options.podNames);
	const sinceSeconds = options.sinceSeconds === undefined ? 600 : parseInt(options.sinceSeconds, 10);
	const hasTailLines = Object.prototype.hasOwnProperty.call(options, 'tailLines');
	const logConfig = {
		...config.log,
		tailLines: hasTailLines ? config.log.tailLines : undefined,
	};

	if (podNames.length === 0) {
		return {
			ok: false,
			namespace: config.namespace,
			sinceSeconds,
			results: [],
			message: 'podNames is required',
		};
	}

	const kubeconfig = readKubeconfig(config);
	if (!kubeconfig.apiServer || !kubeconfig.token) {
		return {
			ok: false,
			namespace: config.namespace,
			sinceSeconds,
			results: [],
			message: 'kubeconfig server or token is missing',
		};
	}

	const requests = podNames.map((podName) => ({
		method: 'GET',
		url: buildLogUrl(kubeconfig.apiServer, config.namespace, podName, logConfig, {
			sinceSeconds,
		}),
		params: {
			headers: buildAuthHeaders(kubeconfig.token),
			timeout: '30s',
		},
	}));

	const responses = http.batch(requests);
	const results = responses.map((res, index) => {
		const podName = podNames[index];
		const summary = summarizeLogBody(res && res.body);
		const ok = !!res && res.status === 200;

		if (ok && summary.body) {
			console.log(`[pod:${podName}] last ${sinceSeconds}s logs`);
			console.log(summary.body);
		} else if (ok) {
			console.log(`[pod:${podName}] no logs in last ${sinceSeconds}s`);
		} else {
			console.error(`[pod:${podName}] 获取 Pod 日志失败: status=${res ? res.status : 0}, message=${res && res.body ? res.body : ''}`);
		}

		return {
			ok,
			status: res ? res.status : 0,
			podName,
			namespace: config.namespace,
			sinceSeconds,
			body: summary.body,
			lineCount: summary.lineCount,
			bytes: summary.bytes,
			message: ok ? 'pod logs fetched' : (res && res.body ? res.body : 'request failed'),
		};
	});

	const result = {
		ok: results.every((item) => item.ok),
		namespace: config.namespace,
		sinceSeconds,
		results,
		message: results.every((item) => item.ok) ? 'pods logs fetched' : 'some pod logs requests failed',
	};

	return writePodsLogs(options, result);
}

export {
	getPodsLogsSince,
};
