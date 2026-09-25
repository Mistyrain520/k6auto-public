import http from 'k6/http';
import { sleep } from 'k6';
import { connect, getConfig, readKubeconfig } from './shared.js';

function normalizeKeywords(keywords) {
	if (Array.isArray(keywords)) {
		return keywords
			.map((keyword) => (keyword === undefined || keyword === null ? '' : String(keyword).trim()))
			.filter(Boolean);
	}

	const normalized = keywords === undefined || keywords === null ? '' : String(keywords).trim();
	return normalized ? [normalized] : [];
}

function filterDeploymentsByName(deployments, keywords) {
	const normalized = normalizeKeywords(keywords);
	if (normalized.length === 0) {
		return deployments;
	}

	return deployments.filter((deployment) => {
		const name = deployment && deployment.metadata && deployment.metadata.name ? deployment.metadata.name : '';
		return normalized.some((keyword) => name.includes(keyword));
	});
}

function buildAuthHeaders(token) {
	return {
		Accept: 'application/json',
		...(token ? { Authorization: `Bearer ${token}` } : {}),
	};
}

function buildMetricsUrl(apiServer, namespace) {
	return `${apiServer.replace(/\/+$/, '')}/apis/metrics.k8s.io/v1beta1/namespaces/${encodeURIComponent(namespace)}/pods`;
}

function normalizeCondition(condition) {
	if (!condition || typeof condition !== 'object') {
		return null;
	}

	return {
		type: condition.type || '',
		status: condition.status || '',
		reason: condition.reason || '',
		message: condition.message || '',
	};
}

function formatAge(dateText) {
	if (!dateText) {
		return '';
	}

	const start = new Date(dateText);
	if (Number.isNaN(start.getTime())) {
		return dateText;
	}

	const seconds = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
	if (seconds < 60) {
		return `${seconds}s`;
	}

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return `${minutes}m`;
	}

	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `${hours}h`;
	}

	return `${Math.floor(hours / 24)}d${hours % 24}h`;
}

function parseCpuNanocores(value) {
	if (value === undefined || value === null || value === '') {
		return 0;
	}

	const text = String(value);
	const match = text.match(/^([0-9]+(?:\.\d+)?)(n|u|m)?$/);
	if (!match) {
		return 0;
	}

	const amount = parseFloat(match[1]);
	if (Number.isNaN(amount)) {
		return 0;
	}

	const unit = match[2] || '';
	switch (unit) {
		case 'n':
			return amount;
		case 'u':
			return amount * 1000;
		case 'm':
			return amount * 1000 * 1000;
		default:
			return amount * 1000 * 1000 * 1000;
	}
}

function parseMemoryBytes(value) {
	if (value === undefined || value === null || value === '') {
		return 0;
	}

	const text = String(value);
	const match = text.match(/^([0-9]+(?:\.\d+)?)([KMGTPE]i?)?$/);
	if (!match) {
		return 0;
	}

	const amount = parseFloat(match[1]);
	if (Number.isNaN(amount)) {
		return 0;
	}

	const unit = match[2] || '';
	const key = unit.charAt(0);
	const exponent = { K: 1, M: 2, G: 3, T: 4, P: 5, E: 6 }[key] || 0;
	const base = unit.endsWith('i') ? 1024 : 1000;

	return Math.round(amount * Math.pow(base, exponent));
}

function normalizeContainerMetrics(containers) {
	if (!Array.isArray(containers)) {
		return [];
	}

	return containers.map((container) => {
		const cpuNanocores = parseCpuNanocores(container && container.usage && container.usage.cpu);
		const memoryBytes = parseMemoryBytes(container && container.usage && container.usage.memory);

		return {
			name: container && container.name ? container.name : '',
			cpuUsageNanocores: cpuNanocores,
			cpuUsageMillicores: Math.round(cpuNanocores / 1000 / 1000),
			memoryBytes,
			memoryMiB: Math.round(memoryBytes / 1024 / 1024),
		};
	});
}

function summarizePodMetric(podMetric) {
	const containers = normalizeContainerMetrics(podMetric && podMetric.containers);

	return {
		podName: podMetric && podMetric.metadata && podMetric.metadata.name ? podMetric.metadata.name : '',
		cpuUsageNanocores: containers.reduce((sum, container) => sum + container.cpuUsageNanocores, 0),
		cpuUsageMillicores: containers.reduce((sum, container) => sum + container.cpuUsageMillicores, 0),
		memoryBytes: containers.reduce((sum, container) => sum + container.memoryBytes, 0),
		memoryMiB: containers.reduce((sum, container) => sum + container.memoryMiB, 0),
		containers,
	};
}

function deploymentMatchesPod(deployment, podName) {
	const deploymentName = deployment && deployment.metadata && deployment.metadata.name ? deployment.metadata.name : '';
	if (deploymentName && podName.startsWith(`${deploymentName}-`)) {
		return true;
	}

	return false;
}

function aggregateDeploymentMetrics(deployment, podMetrics) {
	const matched = podMetrics.filter((podMetric) => deploymentMatchesPod(deployment, podMetric && podMetric.metadata && podMetric.metadata.name));

	if (matched.length === 0) {
		return {
			ok: true,
			podCount: 0,
			cpuUsageCores: 0,
			cpuUsageMillicores: 0,
			memoryBytes: 0,
			memoryMiB: 0,
			pods: [],
		};
	}

	const pods = matched.map((podMetric) => summarizePodMetric(podMetric));

	return {
		ok: true,
		podCount: pods.length,
		cpuUsageCores: pods.reduce((sum, pod) => sum + pod.cpuUsageNanocores, 0) / 1000 / 1000 / 1000,
		cpuUsageMillicores: pods.reduce((sum, pod) => sum + pod.cpuUsageMillicores, 0),
		memoryBytes: pods.reduce((sum, pod) => sum + pod.memoryBytes, 0),
		memoryMiB: pods.reduce((sum, pod) => sum + pod.memoryMiB, 0),
		pods,
	};
}

function getDeploymentConditions(deployment) {
	const conditions = deployment && deployment.status && Array.isArray(deployment.status.conditions)
		? deployment.status.conditions
		: [];

	return conditions.map(normalizeCondition).filter(Boolean);
}

function summarizeDeployment(deployment, namespace) {
	const metadata = deployment && deployment.metadata ? deployment.metadata : {};
	const status = deployment && deployment.status ? deployment.status : {};
	const spec = deployment && deployment.spec ? deployment.spec : {};

	const replicas = spec.replicas === undefined || spec.replicas === null ? 1 : spec.replicas;
	const availableReplicas = status.availableReplicas || 0;
	const conditions = getDeploymentConditions(deployment);
	const abnormalCondition = conditions.find((condition) => {
		const failedStatus = condition.status !== 'True';
		return (condition.type === 'Available' && failedStatus) || (condition.type === 'Progressing' && failedStatus);
	});

	return {
		name: metadata.name || '',
		namespace: metadata.namespace || namespace,
		replicas,
		readyReplicas: status.readyReplicas || 0,
		availableReplicas,
		updatedReplicas: status.updatedReplicas || 0,
		unavailableReplicas: status.unavailableReplicas || 0,
		generation: metadata.generation || 0,
		observedGeneration: status.observedGeneration || 0,
		age: formatAge(metadata.creationTimestamp),
		conditions,
		ok: availableReplicas >= replicas && !abnormalCondition,
	};
}

function listDeployments(client, namespace) {
	// Deployment 属于 apps 组，xk6-kubernetes 按 "Kind.Group" 格式解析，裸 kind 会落到 core 组（group=""）导致 no matches
	return client.list('Deployment.apps', namespace);
}

function getPodMetrics(config, kubeconfig) {
	if (!kubeconfig.apiServer || !kubeconfig.token) {
		return {
			ok: false,
			status: 0,
			message: 'kubeconfig server or token is missing',
		};
	}

	const url = buildMetricsUrl(kubeconfig.apiServer, config.namespace);
	const res = http.get(url, {
		headers: buildAuthHeaders(kubeconfig.token),
		timeout: '30s',
	});

	if (res.status !== 200) {
		return {
			ok: false,
			status: res.status,
			message: res.body || 'metrics request failed',
		};
	}

	let body = {};
	try {
		body = res.json();
	} catch (error) {
		return {
			ok: false,
			status: res.status,
			message: `metrics response is not valid JSON: ${error && error.message ? error.message : String(error)}`,
		};
	}

	return {
		ok: true,
		status: res.status,
		items: Array.isArray(body.items) ? body.items : [],
	};
}

function monitorDeployment(options = {}) {
	const config = getConfig(options);
	const client = options.client || connect(config);
	const deployments = listDeployments(client, config.namespace);

	const kubeconfig = readKubeconfig(config);
	const metricsResult = getPodMetrics(config, kubeconfig);
	const keyword = options.deploymentKeyword === undefined ? '' : options.deploymentKeyword;
	const filteredDeployments = filterDeploymentsByName(deployments, keyword);

	const result = {
		ok: true,
		namespace: config.namespace,
		total: deployments.length,
		matched: filteredDeployments.length,
		deployments: filteredDeployments.map((deployment) => {
			// 不要用 deployments.indexOf(deployment) 反查摘要：xk6 返回的元素引用不稳定，indexOf 可能返回 -1
			const deploymentStats = summarizeDeployment(deployment, config.namespace);
			const metrics = metricsResult.ok
				? aggregateDeploymentMetrics(deployment, metricsResult.items)
				: null;
			return {
				...deploymentStats,
				metrics,
			};
		}),
		metrics: {
			ok: metricsResult.ok,
			status: metricsResult.status,
			...(metricsResult.ok ? {} : { message: metricsResult.message }),
		},
	};

	return result;
}

function formatCpu(millicores) {
	return `${Math.round(millicores)}m`;
}

function formatMemory(miB) {
	return `${Math.round(miB)}Mi`;
}

function printDeploymentSnapshot(snapshot) {
	const deployment = snapshot.deployment || {};
	const metrics = snapshot.metrics || {};

	const header = `deployment: ${deployment.name} | replicas=${deployment.replicas}/${deployment.availableReplicas} ready=${deployment.readyReplicas} updated=${deployment.updatedReplicas} unavailable=${deployment.unavailableReplicas} ok=${deployment.ok}`;
	console.log(header);

	if (deployment.conditions && deployment.conditions.length > 0) {
		deployment.conditions.forEach((condition) => {
			console.log(`  condition: ${condition.type}=${condition.status} reason=${condition.reason} message=${condition.message}`);
		});
	}

	if (metrics && metrics.ok) {
		console.log(`  metrics: pods=${metrics.podCount} cpu=${formatCpu(metrics.cpuUsageMillicores)} memory=${formatMemory(metrics.memoryMiB)}`);
		metrics.pods.forEach((pod) => {
			console.log(`    pod: ${pod.podName} cpu=${formatCpu(pod.cpuUsageMillicores)} memory=${formatMemory(pod.memoryMiB)}`);
		});
	} else {
		console.log(`  metrics: unavailable status=${metrics && metrics.status} message=${metrics && metrics.message}`);
	}
}

function summarizeSamples(samples, key) {
	const values = samples
		.map((sample, index) => {
			const value = sample && sample.deployment && sample.deployment.metrics && sample.deployment.metrics[key];
			return value === undefined || value === null ? null : { index, value };
		})
		.filter((item) => item !== null);

	if (values.length === 0) {
		return {
			min: 0,
			max: 0,
			avg: 0,
			last: 0,
			count: 0,
		};
	}

	const min = Math.min(...values.map((item) => item.value));
	const max = Math.max(...values.map((item) => item.value));
	const avg = values.reduce((sum, item) => sum + item.value, 0) / values.length;

	return {
		min,
		max,
		avg,
		last: values[values.length - 1].value,
		count: values.length,
	};
}

function monitorDeploymentsPeriodic(options = {}) {
	const config = getConfig(options);
	const intervalSeconds = options.intervalSeconds === undefined
		? (__ENV.K8S_MONITOR_INTERVAL ? parseInt(__ENV.K8S_MONITOR_INTERVAL, 10) : 60)
		: parseInt(options.intervalSeconds, 10);
	const samplesCount = options.samples === undefined
		? (__ENV.K8S_MONITOR_SAMPLES ? parseInt(__ENV.K8S_MONITOR_SAMPLES, 10) : 60)
		: parseInt(options.samples, 10);

	const samples = [];
	const keyword = options.deploymentKeyword === undefined ? 'k6' : options.deploymentKeyword;
	let healthyCount = 0;

	for (let i = 0; i < samplesCount; i += 1) {
		const monitorResult = monitorDeployment({
			...options,
			deploymentKeyword: keyword,
		});

		const targetDeployments = monitorResult.deployments.filter((deployment) => {
			if (keyword === '' || keyword === undefined || keyword === null) {
				return true;
			}

			const normalizedKeyword = Array.isArray(keyword) ? keyword : [String(keyword).trim()];
			return normalizedKeyword.some((item) => deployment.name.includes(item));
		});

		const deployment = targetDeployments.length > 0 ? targetDeployments[0] : null;
		const snapshot = {
			index: i + 1,
			timestamp: new Date().toISOString(),
			namespace: monitorResult.namespace,
			total: monitorResult.total,
			deployment,
			metrics: deployment && deployment.metrics ? deployment.metrics : monitorResult.metrics,
		};

		samples.push(snapshot);
		console.log(`sample ${i + 1}/${samplesCount} namespace=${snapshot.namespace}`);

		if (deployment && deployment.ok) {
			healthyCount += 1;
		}

		if (deployment) {
			printDeploymentSnapshot(snapshot);
		} else {
			console.log(`deployment: [not found] namespace=${snapshot.namespace}`);
		}

		if (i < samplesCount - 1) {
			sleep(intervalSeconds);
		}
	}

	return {
		ok: true,
		namespace: config.namespace,
		samplesCount: samples.length,
		healthyCount,
		samples,
		summary: {
			cpuUsageMillicores: summarizeSamples(samples, 'cpuUsageMillicores'),
			memoryMiB: summarizeSamples(samples, 'memoryMiB'),
		},
	};
}

export {
	monitorDeployment,
	monitorDeploymentsPeriodic,
};
