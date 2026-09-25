import { check } from 'k6';
import http from 'k6/http';
import { getPodsLogsSince } from './podLogs.js';
import { monitorDeployment, monitorDeploymentsPeriodic } from './deploymentMonitor.js';
import { buildLogUrl, connect, getConfig, readKubeconfig } from './shared.js';

function podName(pod) {
	return pod && pod.metadata && pod.metadata.name ? pod.metadata.name : '';
}

function podPhase(pod) {
	return pod && pod.status && pod.status.phase ? pod.status.phase : 'Unknown';
}

function podReady(pod) {
	const statuses = pod && pod.status && Array.isArray(pod.status.containerStatuses)
		? pod.status.containerStatuses
		: [];
	const ready = statuses.filter((container) => container.ready).length;

	return `${ready}/${statuses.length}`;
}

function listPods(options = {}) {
	const config = getConfig(options);
	const client = options.client || connect(config);

	return client.list('Pod', config.namespace);
}

function normalizePodKeywords(keywords) {
	if (Array.isArray(keywords)) {
		return keywords
			.map((keyword) => (keyword === undefined || keyword === null ? '' : String(keyword).trim()))
			.filter(Boolean);
	}

	const normalizedKeyword = keywords === undefined || keywords === null ? '' : String(keywords).trim();
	return normalizedKeyword ? [normalizedKeyword] : [];
}

function filterPodsByName(pods, keywords) {
	const normalizedKeywords = normalizePodKeywords(keywords);

	return pods.filter((pod) => {
		const name = podName(pod);
		return normalizedKeywords.length === 0 || normalizedKeywords.some((keyword) => name.includes(keyword));
	});
}

function summarizePod(pod, index = 0) {
	const metadata = pod.metadata || {};
	const status = pod.status || {};
	const spec = pod.spec || {};

	return {
		index: index + 1,
		name: metadata.name || '',
		namespace: metadata.namespace || '',
		phase: podPhase(pod),
		ready: podReady(pod),
		podIP: status.podIP || '',
		hostIP: status.hostIP || '',
		nodeName: spec.nodeName || '',
		startTime: status.startTime || '',
	};
}

function summarizePods(pods) {
	return pods.map((pod, index) => summarizePod(pod, index));
}

function getPodsHealth(pods) {
	const result = {
		ok: true,
		total: pods.length,
		running: 0,
		failed: 0,
		pending: 0,
		unknown: 0,
		notReady: 0,
	};

	pods.forEach((pod) => {
		const phase = podPhase(pod);
		const ready = podReady(pod);

		if (phase === 'Running') {
			result.running += 1;
		} else if (phase === 'Failed') {
			result.failed += 1;
		} else if (phase === 'Pending') {
			result.pending += 1;
		} else {
			result.unknown += 1;
		}

		if (!ready.startsWith('1/') && ready !== '0/0') {
			result.notReady += 1;
		}
	});

	result.ok = result.failed === 0 && result.pending === 0 && result.notReady === 0;
	return result;
}

function queryPods(podKeyword = '') {
	const config = getConfig();
	const pods = listPods({
		namespace: config.namespace,
	});
	const matchedPods = filterPodsByName(pods, podKeyword);

	return {
		config,
		pods,
		matchedPods,
		summaries: summarizePods(matchedPods),
		health: getPodsHealth(matchedPods),
	};
}

function checkConnection(options = {}) {
	const config = getConfig(options);

	try {
		const pods = listPods(options);
		return {
			ok: true,
			namespace: config.namespace,
			totalPods: pods.length,
			message: 'Kubernetes API is reachable',
		};
	} catch (error) {
		return {
			ok: false,
			namespace: config.namespace,
			totalPods: 0,
			message: error && error.message ? error.message : String(error),
		};
	}
}

function getPodLogs(options = {}) {
	const config = getConfig(options);
	const targetPodName = options.podName || options.name;

	if (!targetPodName) {
		return {
			ok: false,
			status: 0,
			body: '',
			namespace: config.namespace,
			message: 'podName is required',
		};
	}

	const kubeconfig = readKubeconfig(config);

	if (!kubeconfig.apiServer || !kubeconfig.token) {
		return {
			ok: false,
			status: 0,
			body: '',
			podName: targetPodName,
			namespace: config.namespace,
			message: 'kubeconfig server or token is missing',
		};
	}

	const url = buildLogUrl(kubeconfig.apiServer, config.namespace, targetPodName, config.log);
	const res = http.get(url, {
		headers: {
			Accept: 'application/json',
			...(kubeconfig.token ? { Authorization: `Bearer ${kubeconfig.token}` } : {}),
		},
		timeout: '30s',
	});

	return {
		ok: res.status === 200,
		status: res.status,
		body: res.body || '',
		podName: targetPodName,
		namespace: config.namespace,
		message: res.status === 200 ? 'pod logs fetched' : res.body,
	};
}

function printPodSummaries(summaries) {
	summaries.forEach((summary) => {
		console.log(JSON.stringify(summary));
	});
}

function selectPodForLogs(pods) {
	const runningPod = pods.find((pod) => podPhase(pod) === 'Running');
	return runningPod || pods[0] || null;
}

function printLogPreview(logResult, previewChars) {
	if (!logResult.ok) {
		console.error(`获取 Pod 日志失败: pod=${logResult.podName || ''}, status=${logResult.status}, message=${logResult.message}`);
		return;
	}

	const preview = logResult.body.length > previewChars
		? logResult.body.slice(0, previewChars)
		: logResult.body;

	console.log(`Pod 日志获取成功: pod=${logResult.podName}, length=${logResult.body.length}`);
	console.log(preview);
}

function emptyScenarioResult(config, connection) {
	return {
		config,
		connection,
		pods: [],
		matchedPods: [],
		summaries: [],
		health: getPodsHealth([]),
		logResult: null,
	};
}


export const k8s = {
	connect,
	checkConnection,
	listPods,
	queryPods,
	getPodLogs,
	getPodsLogsSince,
	monitorDeployment,
	monitorDeploymentsPeriodic,
};
