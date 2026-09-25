import k8sBaseScenario from './scenarios/basescenarios/k8sBaseScenario/baseScenario.js'

export function debug() {
	k8sBaseScenario.monitorK8sDeploymentsPeriodic({'deploymentKeyword':'core', samples: 30, intervalSeconds: 1})
}

export default function() {
	debug()
}
