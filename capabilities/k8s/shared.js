import file from 'k6/x/file';
import { Kubernetes } from 'k6/x/kubernetes';
import { K8sOptions } from '../../config/current.js';

const defaultKubeconfigContent = (() => {
	try {
		return open(K8sOptions.kubeconfig);
	} catch (error) {
		return '';
	}
})();

const DEFAULT_LOG_OPTIONS = {
	enabled: false,
	container: '',
	tailLines: 200,
	timestamps: false,
	previous: false,
	previewChars: 2000,
};

function envInt(value, defaultValue) {
	const parsed = parseInt(value, 10);
	return Number.isNaN(parsed) ? defaultValue : parsed;
}

function getConfig(overrides = {}) {
	return {
		kubeconfig: overrides.kubeconfig || __ENV.K8S_KUBECONFIG || K8sOptions.kubeconfig,
		namespace: overrides.namespace || __ENV.K8S_NAMESPACE || K8sOptions.namespace,
		log: {
			enabled: overrides.logEnabled !== undefined
				? overrides.logEnabled
				: DEFAULT_LOG_OPTIONS.enabled,
			container: overrides.container || DEFAULT_LOG_OPTIONS.container,
			tailLines: envInt(overrides.tailLines, DEFAULT_LOG_OPTIONS.tailLines),
			timestamps: overrides.timestamps !== undefined
				? overrides.timestamps
				: DEFAULT_LOG_OPTIONS.timestamps,
			previous: overrides.previous !== undefined
				? overrides.previous
				: DEFAULT_LOG_OPTIONS.previous,
			previewChars: envInt(overrides.previewChars, DEFAULT_LOG_OPTIONS.previewChars),
		},
	};
}

function connect(options = {}) {
	const config = getConfig(options);

	return new Kubernetes({
		config_path: config.kubeconfig,
	});
}

function readTextFile(path) {
	if (path === K8sOptions.kubeconfig && defaultKubeconfigContent) {
		return defaultKubeconfigContent;
	}

	try {
		return file.readFile(path);
	} catch (error) {
		console.error(`读取文件失败: path=${path}, message=${error && error.message ? error.message : String(error)}`);
		return '';
	}
}

function scalarValue(line) {
	const index = line.indexOf(':');
	if (index < 0) {
		return '';
	}

	return line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
}

function findTopLevelValue(lines, key) {
	const prefix = `${key}:`;
	const line = lines.find((item) => item.startsWith(prefix));
	return line ? scalarValue(line) : '';
}

function findNamedListItem(lines, sectionName, itemName) {
	let inSection = false;
	let current = null;
	const items = [];

	for (const line of lines) {
		const trimmedLine = line.trim();
		if (!trimmedLine) {
			continue;
		}

		if (!line.startsWith(' ') && !line.startsWith('-')) {
			if (line.endsWith(':')) {
				inSection = line === `${sectionName}:`;
			} else {
				inSection = false;
			}
			if (current) {
				items.push(current);
			}
			current = null;
			continue;
		}

		if (!inSection) {
			continue;
		}

		if (trimmedLine.startsWith('- ')) {
			if (current) {
				items.push(current);
			}
			current = {
				lines: [line],
			};
			continue;
		}

		if (current) {
			current.lines.push(line);
		}
	}

	if (current) {
		items.push(current);
	}

	const matchedItem = items.find((item) => {
		const nameLine = item.lines.find((line) => line.trim().startsWith('name:') || line.trim().startsWith('- name:'));
		return nameLine && scalarValue(nameLine.trim().replace(/^- /, '')) === itemName;
	});

	return matchedItem ? matchedItem.lines : [];
}

function findNestedValue(lines, key) {
	const pattern = `${key}:`;
	const line = lines.find((item) => item.trim().startsWith(pattern));
	return line ? scalarValue(line) : '';
}

function parseKubeconfig(content) {
	const lines = content.split(/\r?\n/);
	const currentContext = findTopLevelValue(lines, 'current-context');
	if (!currentContext) {
		return {};
	}

	const contextLines = findNamedListItem(lines, 'contexts', currentContext);
	const clusterName = findNestedValue(contextLines, 'cluster');
	const userName = findNestedValue(contextLines, 'user');

	const clusterLines = findNamedListItem(lines, 'clusters', clusterName);
	const userLines = findNamedListItem(lines, 'users', userName);
	const apiServer = findNestedValue(clusterLines, 'server');
	const token = findNestedValue(userLines, 'token');

	return {
		apiServer,
		token,
	};
}

function readKubeconfig(options = {}) {
	const config = getConfig(options);
	const content = readTextFile(config.kubeconfig);

	return content ? parseKubeconfig(content) : {};
}

function buildLogUrl(apiServer, namespace, targetPodName, logConfig = {}, extraQuery = {}) {
	const query = [];

	if (logConfig.tailLines !== undefined && logConfig.tailLines !== null) {
		query.push(`tailLines=${encodeURIComponent(logConfig.tailLines)}`);
	}

	if (logConfig.timestamps !== undefined && logConfig.timestamps !== null) {
		query.push(`timestamps=${encodeURIComponent(logConfig.timestamps)}`);
	}

	if (logConfig.previous !== undefined && logConfig.previous !== null) {
		query.push(`previous=${encodeURIComponent(logConfig.previous)}`);
	}

	if (logConfig.container) {
		query.push(`container=${encodeURIComponent(logConfig.container)}`);
	}

	if (extraQuery.sinceSeconds !== undefined && extraQuery.sinceSeconds !== null) {
		query.push(`sinceSeconds=${encodeURIComponent(extraQuery.sinceSeconds)}`);
	}

	if (extraQuery.follow !== undefined && extraQuery.follow !== null) {
		query.push(`follow=${encodeURIComponent(extraQuery.follow)}`);
	}

	return `${apiServer.replace(/\/+$/, '')}/api/v1/namespaces/${encodeURIComponent(namespace)}/pods/${encodeURIComponent(targetPodName)}/log?${query.join('&')}`;
}

export {
	DEFAULT_LOG_OPTIONS,
	buildLogUrl,
	connect,
	getConfig,
	readKubeconfig,
};
