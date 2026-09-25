import { sleep } from 'k6';
import file from 'k6/x/file';
import { k8s } from '../../capabilities/k8s/index.js';

// ============ K8s deployment 监控 ============
// 独立运行，持续采样指定 deployment 的 replicas / CPU / 内存
// 参数（通过 -e 传入）：
//   K8S_DEPLOYMENT_KEYWORD  - deployment 名称关键字，默认 core,runtime
//   K8S_MONITOR_SAMPLES     - 采样次数，默认 60
//   K8S_MONITOR_INTERVAL    - 采样间隔秒数，默认 2
const GROUP = 'K8s监控';

export const options = {
  discardResponseBodies: false,
  scenarios: {
    monitor: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '30m',
      exec: 'monitor_deployment',
      tags: { scene: 'k8s监控' },
    },
  },
};

export function monitor_deployment() {
  const keyword = __ENV.K8S_DEPLOYMENT_KEYWORD
    ? __ENV.K8S_DEPLOYMENT_KEYWORD.split(',').map((k) => k.trim()).filter(Boolean)
    : ['core', 'runtime'];
  const maxSamples = parseInt(__ENV.K8S_MONITOR_SAMPLES || '60', 10);
  const intervalSeconds = parseInt(__ENV.K8S_MONITOR_INTERVAL || '2', 10);

  for (let i = 0; i < maxSamples; i++) {
    const result = k8s.monitorDeployment({ deploymentKeyword: keyword });
    console.log(`[监控 ${i + 1}/${maxSamples}] namespace=${result.namespace} total=${result.total} matched=${result.matched}`);

    result.deployments.forEach((d) => {
      console.log(`  ${d.name}: replicas=${d.replicas}/${d.availableReplicas} ready=${d.readyReplicas} cpu=${d.metrics?.cpuUsageMillicores || 0}m mem=${d.metrics?.memoryMiB || 0}Mi`);
    });

    if (i < maxSamples - 1) {
      sleep(intervalSeconds);
    }
  }
  console.log('监控结束');
}

export default monitor_deployment;
