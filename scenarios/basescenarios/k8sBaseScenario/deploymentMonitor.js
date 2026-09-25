import file from 'k6/x/file';
import { k8s } from '../../../capabilities/k8s/index.js';
import { outputPath, timeText } from '../../../tool/outputPath.js';

function defaultMonitorLogPath() {
	return outputPath('monitor', `deployment-${timeText()}.log`);
}

function dirname(filePath) {
	const index = filePath.lastIndexOf('/');
	return index > 0 ? filePath.slice(0, index) : '.';
}

function writeMonitorLog(options, result) {
	// writeLog 默认 false，显式传 true 才落盘
	if (options.writeLog !== true) {
		return result;
	}

	const logPath = options.logPath || defaultMonitorLogPath();
	const lines = result.samples.map((sample) => JSON.stringify(sample));
	lines.push(JSON.stringify({
		type: 'summary',
		namespace: result.namespace,
		samplesCount: result.samplesCount,
		healthyCount: result.healthyCount,
		cpuUsageMillicores: result.summary.cpuUsageMillicores,
		memoryMiB: result.summary.memoryMiB,
	}));

	try {
		file.createDirectory(dirname(logPath));
		file.writeString(logPath, lines.join('\n') + '\n');
		console.log(`monitorDeploymentsPeriodic logPath=${logPath}`);
	} catch (error) {
		console.error(`写入 monitor 日志失败: path=${logPath}, message=${error && error.message ? error.message : String(error)}`);
	}

	return result;
}

export function monitorK8sDeployment(options = {}) {
	const deploymentKeyword = options.deploymentKeyword !== undefined ? options.deploymentKeyword : 'k6';

	const monitorResult = k8s.monitorDeployment({
		deploymentKeyword,
	});

	console.log(`monitorDeployment ok=${monitorResult.ok}, namespace=${monitorResult.namespace}, total=${monitorResult.total}, matched=${monitorResult.matched}`);
	console.log(`monitorDeployment metrics ok=${monitorResult.metrics.ok}, status=${monitorResult.metrics.status}`);

	monitorResult.deployments.forEach((deployment) => {
		console.log(`deployment: ${deployment.name} | replicas=${deployment.replicas}/${deployment.availableReplicas} ready=${deployment.readyReplicas} updated=${deployment.updatedReplicas} unavailable=${deployment.unavailableReplicas} ok=${deployment.ok}`);
		deployment.conditions.forEach((condition) => {
			console.log(`  condition: ${condition.type}=${condition.status} reason=${condition.reason} message=${condition.message}`);
		});
		if (deployment.metrics && deployment.metrics.ok) {
			console.log(`  metrics: pods=${deployment.metrics.podCount} cpu=${deployment.metrics.cpuUsageMillicores}m memory=${deployment.metrics.memoryMiB}Mi`);
		} else {
			console.log(`  metrics: unavailable status=${deployment.metrics && deployment.metrics.status}`);
		}
	});

	return monitorResult;
}

export function monitorK8sDeploymentsPeriodic(options = {}) {
	const deploymentKeyword = options.deploymentKeyword !== undefined ? options.deploymentKeyword : 'k6';
	const samplesCount = options.samples !== undefined ? options.samples : 2;
	const intervalSeconds = options.intervalSeconds !== undefined ? options.intervalSeconds : 1;

	const result = k8s.monitorDeploymentsPeriodic({
		deploymentKeyword,
		samples: samplesCount,
		intervalSeconds,
	});

	console.log(`monitorDeploymentsPeriodic ok=${result.ok}, samples=${result.samplesCount}, healthy=${result.healthyCount}`);
	console.log(`monitorDeploymentsPeriodic cpuSummary=${JSON.stringify(result.summary.cpuUsageMillicores)}`);
	console.log(`monitorDeploymentsPeriodic memSummary=${JSON.stringify(result.summary.memoryMiB)}`);

	return writeMonitorLog(options, result);
}
