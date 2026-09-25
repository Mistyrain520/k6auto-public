# 性能压测场景

把单个 curl 或完整业务场景改写成 k6 性能压测代码。

## 必做流程

1. 先判断压测对象是单个 curl，还是一整段业务场景。
2. 如果是 curl，先按 `references/curl-to-api.md` 处理。
3. 如果是业务流程，先按 `references/scenario-authoring.md` 处理。
4. 向用户介绍 k6 支持的压测模型（详见 [k6 scenarios 文档](https://grafana.com/docs/k6/latest/using-k6/scenarios/)），并询问用户使用哪种：
   - `shared-iterations`：固定总迭代次数，所有 VU 共享
   - `per-vu-iterations`：每个 VU 固定迭代次数（现有 `scenarios/performace/search_perf.js` 用的这种）
   - `constant-vus`：固定 VU 数，持续压测一段时间
   - `ramping-vus`：VU 数阶梯式上升/下降（阶梯式压测）
   - `constant-arrival-rate`：固定每秒请求数（按吞吐量压测）
   - `ramping-arrival-rate`：请求速率阶梯式变化
   - `externally-controlled`：由外部动态控制（k6 REST API）
5. 如果用户没有明确并发数、迭代次数或持续时间，先问清楚再写。
6. 脚本写完后，询问用户是否有 Prometheus，据此给出压测数据保留命令：
   - 有 Prometheus：`.\k6.exe run .\scenarios\performace\search_perf.js --out experimental-prometheus-rw=http://localhost:9090/api/v1/write`
   - 没有 Prometheus：`.\k6.exe run .\scenarios\performace\search_perf.js --out json=results.json`
   命令里的场景文件换成实际路径。
7. 必须询问是否要监控某个指定的 K8s deployment 性能。需要监控时，必须向用户收集：
   - `K8S_DEPLOYMENT_KEYWORD`：要监控的 deployment 名称或关键字（必填）。
   - `K8S_MONITOR_SAMPLES`：采样次数，默认 `60`。
   - `K8S_MONITOR_INTERVAL`：采样间隔秒数，默认 `2`。
   监控不单独启动进程，也不新增独立入口文件，直接在同一个性能脚本里加第二个 `scenario` 和对应 `exec` 函数。
8. 用户未明确要求执行压测时，先不执行，只提供压测命令；代码校验用 `k6 inspect`。

## options 模板

```js
export const options = {
  setupTimeout: '30m',
  discardResponseBodies: false,
  scenarios: {
    contacts: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 20,
      maxDuration: '5m',
      exec: 'scenarios_item',
      tags: { my_custom_tag: '事项相关场景' },
      env: { MYVAR: 'contacts' },
    },
  },
};
```

## deployment 监控（同一个脚本的第二个 scenario）

需要监控 K8s deployment 时，在性能脚本的 `options.scenarios` 里追加 `deployment_monitor`，与压测场景并行执行：

```js
export const options = {
  discardResponseBodies: false,
  scenarios: {
    load: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 20,
      maxDuration: '5m',
      exec: 'scenarios_item',
    },
    deployment_monitor: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      startTime: '0s',
      exec: 'monitor_deployment',
    },
  },
};
```

新增监控 exec 函数，从 `__ENV` 读取三个变量，并调用 `scenarios/basescenarios/k8sBaseScenario/deploymentMonitor.js` 的 `monitorK8sDeploymentsPeriodic`：

```js
import k8sBaseScenario from '../basescenarios/k8sBaseScenario/baseScenario.js';

export function monitor_deployment() {
  k8sBaseScenario.monitorK8sDeploymentsPeriodic({
    deploymentKeyword: __ENV.K8S_DEPLOYMENT_KEYWORD || 'k6',
    samples: parseInt(__ENV.K8S_MONITOR_SAMPLES || '60', 10),
    intervalSeconds: parseInt(__ENV.K8S_MONITOR_INTERVAL || '5', 10),
    writeLog: true,
  });
}
```

运行命令通过 `-e` 传入三个环境变量（`deployment_monitor` 场景与压测场景由 k6 并行执行）：

```powershell
.\k6.exe run .\scenarios\performace\search_perf.js -e K8S_DEPLOYMENT_KEYWORD=core -e K8S_MONITOR_SAMPLES=60 -e K8S_MONITOR_INTERVAL=5
```

注意：`samples × intervalSeconds` 应覆盖压测时长，否则 k6 会等待监控场景结束后才退出；监控日志由 `monitorK8sDeploymentsPeriodic` 写入 `report/monitor/<日期>/`。

## 实现规则

- 沿用仓库现有的场景命名和 import 风格。
- 压测入口函数只保留当前要测的行为，不混入无关逻辑。
- 压测模型默认按 options 模板用 `per-vu-iterations`；用户选择其他模型时，按对应 executor 改写 options（参数随模型变化：迭代次数、持续时间或请求速率）。
- 场景包含多个不同请求时，用 k6 内置 `group()` 区分每个请求的指标；组名会作为 `tags.group` 出现在结果里（如 `::按key查询`），k6 汇总和 JSON 输出都能按组分开统计。
- 用户只说“100并发”但没说执行次数时，要补问 iterations。
- 用户只说“帮我写性能压测”时，要补问并发数和执行次数。
- 用户选择监控 deployment 时，监控 exec 函数必须从 `__ENV` 读取 `K8S_DEPLOYMENT_KEYWORD` / `K8S_MONITOR_SAMPLES` / `K8S_MONITOR_INTERVAL`，不得把 deployment 名硬编码进脚本。

## group 区分请求示例

参考 `scenarios/performace/search_perf.js`（iql 由调用方直接传入，登录态从 `readEnvData('data.json')` 读取）：

```js
import { group } from 'k6';
import { itemApi } from '../../apiTest/item.js';

group('按key查询', () => {
	itemApi.search({
		isNotLog: true,
		loginRes,
		iql: `key = 'WS0806003-4'`,
		group: '性能压测.事项搜索',
		casename: 'search查询key',
	});
});

group('按标题查询', () => {
	itemApi.search({
		isNotLog: true,
		loginRes,
		iql: `'标题' ~ '机不可失的'`,
		group: '性能压测.事项搜索',
		casename: 'search标题查询',
	});
});
```

## 对用户的输出

按这个顺序说明：

1. 写入哪个文件
2. 采用的压测模型
3. 复用了或新增了哪些 API/场景函数
4. 询问用户是否有 Prometheus（决定压测数据保留方式）
5. 询问是否监控指定 deployment；若监控，列出 `K8S_DEPLOYMENT_KEYWORD` / `K8S_MONITOR_SAMPLES` / `K8S_MONITOR_INTERVAL` 三个参数
6. 提供压测命令：有 Prometheus 用 `--out experimental-prometheus-rw=http://localhost:9090/api/v1/write`，否则用 `--out json=results.json`；需要监控时附加三个 `-e` 参数
7. 说明暂未执行压测（用户未明确要求时不跑），需要执行时运行上面的命令
