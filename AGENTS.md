# k6auto 项目指南（AGENTS.md）

本文件是 Codex 在本仓库工作时的项目级说明：先读它，再读相关 skill。本仓库的目标是让 agent 能正确理解并维护基于 k6 的接口自动化、场景编排、性能压测、环境管理与报告体系。

## 项目定位

k6auto 是基于 k6 的全栈自动化测试框架，核心分层是：

- `apiTest/`：接口层，把单个 HTTP 请求封装成可复用方法。
- `scenarios/`：场景层，把多个接口串成业务流程。
- `config/`：环境与登录态配置。
- `main/`：k6 入口调度，按环境选择执行入口。
- `report/`：Allure、Pod 日志、deployment 监控等统一报告输出。

## 分层架构

### 配置层

- `config/current.js` 是唯一环境切换点：`export const currentEnv = '<环境名>'`。
- `config/envs/<环境名>/apiOptions.js` 保存该环境的域名、租户、登录凭据、K8s 配置和 testmanager 配置。
- `config/envs/<环境名>/data.json`、`dataTestmanager.json` 保存登录态与业务数据，由 `setupdata()` / `testmanager_basic` / `config/refreshLogin.js` 写入，必须通过 `readEnvData` / `writeEnvData` 读写。
- `config/apiOptions.js` 从 `current.js` 重导出当前环境配置，仓库代码统一从这里拿配置。

### 接口层（apiTest/）

- `apiTest/core/apiCaller.js` 是统一执行入口：`callApi(route, params)` 负责构建请求、调用 `k6http`、解析返回、注入默认三断言并写日志。
- `apiTest/core/headers.js` 提供通用 header 构造器：`jsonRequestParams`、`textRequestParams`、`oneRequestParams`。
- 每个模块（如 `item.js`、`workspace.js`）采用固定形态：

```js
const moduleRoutes = {
  apiMethod: {
    description: 'Short English description.',
    method: 'POST',
    path: (params = {}) => `...`,
    headers: jsonRequestParams,
    buildPayload: (params = {}) => ({...}),
    extraAssertions: [],
  },
};

function apiMethod(params = {}) {
  return callApi(moduleRoutes.apiMethod, params);
}

export const moduleApi = {
  apiMethod,
};
```

- 默认三断言由 `apiTest/core/assertions.js` 统一注入，不逐接口重复写；业务断言放 route 的 `extraAssertions`。

### 场景层（scenarios/）

- `scenarios/` 只做流程编排，不直接写底层请求。
- `scenarios/basescenarios/` 放可复用辅助流程（如 testmanager、k8s、customFields）。
- `scenarios/<模块>_scenarios/` 放面向具体业务模块的完整场景。
- 场景函数通过 `readEnvData('data.json')` / `readEnvData('dataTestmanager.json')` 获取当前环境数据，禁止硬编码 ID。

### 执行与报告层

- `k6http/k6http.js`：统一 HTTP 请求入口，使用 `ApiOptions.domainName + path` 拼接 URL。
- `tool/allTool.js`：通用工具，含 `readEnvData`、`writeEnvData`、`consoleLog`、`generateFile`。
- `tool/outputPath.js`：统一报告路径，结构为 `report/<type>/<YYYY-MM-DD>/<filename>`。
- `main/main.js`：按 `ENV` 选择 `main_<env>.js`；各环境入口用到的 `exec` 函数名必须在 `main.js` 透传。
- `main/main_<env>.js`：单个环境的完整 k6 入口，导出 `options/setup/teardown/default`。

## 环境管理

- 查看当前环境：读取 `config/current.js` 的 `currentEnv`，以及 `config/envs/<currentEnv>/apiOptions.js` 的 `domainName`。
- 新增/删除/修改/切换环境：使用 `$k6-env` skill（`skills/k6-env/`），不要手改多处注册点。
- 新增环境的模板是 `config/envs/develop/`；新环境需要同时在 `config/current.js`、`main/main.js`、`main/main_<env>.js` 注册。
- 删除环境前先确认该环境不是当前环境；删除时同步移除 `config/envs/<env>/`、`main/main_<env>.js` 和两处注册。

## 全局规则

- 任何 skill 输出前，先报告当前环境，格式：`当前环境：<currentEnv>（<domainName>）`。
- 环境相关的 ID、Cookie、token、方案/模板 ID（如 `schemeId`、`itemTypeScheme`、`workflowScheme`、`templateSpaceUuid`）禁止硬编码，统一从当前环境 `data*.json` 或动态查询获得。
- 未明确要求测试时，只用 `k6 inspect` 校验；`k6 run` 会真实调用后端并产生数据副作用。
- 新增接口前先搜索 `apiTest/` 是否已有重复方法；判断重复时同时看方法名、route key、route `description` 和 `casename`。
- 保留用户已有代码，采用追加或最小修改，不覆盖无关内容。
- 禁止在未拿到真实返回的情况下编写 `parseResponse` 或依赖字段的提取逻辑；若确实只能按描述先写，必须在注释和输出中标注“⚠️ 未实测，待验证”。

## 报告规则

- 报告路径以 `tool/outputPath.js` 为唯一规则：`report/<type>/<YYYY-MM-DD>/<filename>`。
- `type` 映射：
  - `allure`：接口/场景请求结果与断言日志（`*-result.json`）。
  - `pods`：K8s Pod 日志。
  - `monitor`：K8s deployment 性能监控日志。
  - `screenshot`：页面压测截图（`*-<页面名>.png`）。
- 查找最新接口/场景结果时，按日期目录名倒序找最新 `report/allure/<date>/`，再在目录内找最新 `*-result.json`。
- 仓库根目录遗留的 `YYYY-MM-DD/` 目录和顶层 `report/*.log` 是旧版产物，不作为最新日志来源。
- 断言审计全量明细写入 `report/audit-YYYY-MM-DD.md`；接口/场景索引缓存写入 `report/catalog/catalog.json`。
- 任何新日志功能都必须复用 `outputPath.js`，禁止新增散落的日期目录或日志文件命名。

## Skill 路由

| Skill | 用途 | 入口 |
| --- | --- | --- |
| `$k6skill` | 编写/更新 apiTest 接口、scenarios 场景、性能压测、场景调试 | `skills/k6skill/SKILL.md` |
| `$k6-assert` | 结合最新日志审计接口断言 | `skills/k6-assert/SKILL.md` |
| `$k6-env` | 环境管理（LLM 执行）；初始化项目登录鉴权（需二次确认） | `skills/k6-env/SKILL.md` |
| `$k6-catalog` | 列出/检索接口与场景、输出场景详细步骤 | `skills/k6-catalog/SKILL.md` |

## 编码约定

- 接口方法命名：`api<动词><对象>`（如 `apicreateItem`）；聚合导出对象命名 `<模块>Api`。
- 场景主导出函数命名：`<模块>_<行为>`（如 `testmanager_main_flow`）。
- 每个场景文件只保留一个 `default function`，新场景追加在现有主函数之后。
- 性能压测场景如需 K8s deployment 监控，直接在同一个 k6 脚本的 `options.scenarios` 里加第二个场景，不单独启动进程。
- 日志保持轻量：接口日志和基础断言交给 API 层，场景层不重复打日志。
