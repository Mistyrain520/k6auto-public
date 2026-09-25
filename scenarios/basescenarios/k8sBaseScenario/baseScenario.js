import { k8s } from '../../../capabilities/k8s/index.js';
import { monitorK8sDeployment, monitorK8sDeploymentsPeriodic } from './deploymentMonitor.js';

export function queryK8sPods(options = {}) {
	const client = k8s.connect();

	const connection = k8s.checkConnection({ client });
	const pods = k8s.listPods({ client });

	const podKeyword = options.podKeyword !== undefined ? options.podKeyword : 'core';
	const result = k8s.queryPods(podKeyword);
	// console.log(`queryPods total=${result.pods.length}, matched=${result.matchedPods.length}`);
	// console.log(`queryPods health=${JSON.stringify(result.health)}`);
	result.summaries.forEach((summary) => {
		console.log(`queryPods summary=${JSON.stringify(summary)}`);
		if (summary.phase !== 'Running') {
			console.error({
				'group': 'k8s检查',
				'casename': '查询Pod状态',
				'errorMessage': 'Pod状态异常，请检查k8s集群，podName=' + summary.name + ', phase=' + summary.phase,
			});
		}
		return;
	});

	if (connection.ok && result.matchedPods.length > 0) {
		const podsLogsResult = k8s.getPodsLogsSince({
			podNames: result.matchedPods.map((pod) => pod.metadata.name),
			sinceSeconds: 600,
			timestamps: false,
			previous: false,
			// 默认 true；传 false 就不写文件
			// writeLog: false,
		});
		// console.log(`getPodsLogsSince ok=${podsLogsResult.ok}, count=${podsLogsResult.results.length}`);
		// console.log(`getPodsLogsSince outputPath=${podsLogsResult.outputPath || ''}`);
	}

	return {
		connection,
		pods,
		result,
	};
}

export function monitorK8sDeploymentScenario(options = {}) {
	return monitorK8sDeployment(options);
}

const k8sBaseScenario = {
	queryK8sPods,
	monitorK8sDeployment,
	monitorK8sDeploymentsPeriodic,
};

export default k8sBaseScenario;
