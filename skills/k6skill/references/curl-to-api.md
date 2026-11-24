# curl 转接口

把单条 curl 请求转成当前仓库可复用的 `apiTest` 方法。

## 必做流程

1. 解析 curl 的 method、URL、相对 path、query、headers、cookies、body、content-type。
2. 搜索 `apiTest/`，判断是否已有重复接口；搜索 `scenarios/basescenarios/`，判断是否有可复用场景接口；
3. 判断重复时同时看：
   - 导出方法名
   - route key
   - route `description`
   - 路径语义
   - 函数注释
4. 如果找到重复接口，告诉用户现有方法名，并询问是否直接复用。
5. 如果没有重复接口，先判断最合适的目标文件，并询问用户是否写入该文件。
6. 涉及 `parseResponse` 或后续步骤依赖响应字段的接口，先执行用户提供的 curl（或等效方式）拿到真实返回再写代码；用户对返回结构的描述只作预期参考，以实测为准。无法执行（缺登录态/密码/网络）时，停下说明缺什么，禁止静默按描述实现。

## 目标文件判断

- `/test_manager/` -> `apiTest/testmanager/testmanager.js`
- `/parse/api/v2/items` 或 `/items` -> `apiTest/item.js`
- `/workspace`、`/projects`、`/permissions/schemes` -> `apiTest/workspace.js`
- `/workflow`、`/workflows`、`/WorkflowScheme` -> `apiTest/workflow.js`
- `/screen`、`/CustomField`、`/Screen`、`/ScreenScheme` -> `apiTest/screen.js`
- `/ItemType`、`/ItemTypeScheme` -> `apiTest/itemType.js`
- `/files/`、`/import` -> `apiTest/file.js`
- `/login` -> `apiTest/login.js`
- 不易归类的 Parse 请求，先检查 `apiTest/common.js`

## 实现规则

- 采用仓库现有的 route 风格。
- `path` 只写相对路径，不写完整域名。
- curl 中的业务值转成 `params` 传入，不硬编码。
- curl 中出现 ID 类字段时，先检查当前环境目录 `config/envs/<currentEnv>/` 下的所有 `data*.json`（通过 `readEnvData('data.json')` / `readEnvData('dataTestmanager.json')` 读取）是否已有对应键（如 `myitemtypescheme`、`myItemTypeScreenScheme`、`myFlowScheme`、`permissionScheme`、`myworkspace`、`productField`），有则引用配置值并注明来源字段；没有则用已有接口动态查询/创建，禁止直接抄 curl 里的固定值。
- 只有默认解析不够用时才写 `parseResponse`。
- 业务断言放到 `extraAssertions`，不要塞进薄封装函数。
- 新方法要加入模块的聚合导出对象。

## Header 规则

`apiTest/core/headers.js` 是 Header 的唯一统一入口。不要根据“看起来都是 JSON 请求”推断现有构造器可以复用；不同项目的 Header 可能不同，必须比较实际生成结果。

1. 先检索 `apiTest/core/headers.js` 是否已有同语义构造器，比较以下核心 Header：
   - `Content-Type`
   - Cookie 来源
   - session/auth Header 名称及 token 前缀
   - `X-Parse-Application-Id`、appId、tenant
   - `Accept`、`Accept-Language`、lang
   - 项目或接口必需的其他 Header
2. `Origin`、`Referer`、`User-Agent` 属于条件比较项。仅当 curl 明确包含且服务端依赖、后端/网关有校验要求，或验证证明现有构造器行为不兼容时才纳入差异判断；这些浏览器上下文 Header 单独不同不强制新增构造器。
3. 核心 Header 实际组成完全一致时，`route.headers` 直接引用现有构造器。
4. 核心 Header 不一致时，直接在 `apiTest/core/headers.js` 新增命名构造器，`route.headers` 引用新构造器。不要为了适配一个项目而堆叠大量开关，也不要保留两份本地 Header 函数。
5. 禁止在 `apiTest` 业务模块的 route 中直接写 `headers: { ... }`，禁止在业务模块内定义 `xxxHeaders` 或等价包装函数，禁止在场景层设置 Header。
6. Header 中的域名、租户、token、Cookie、appId、deviceNumber 等环境相关值必须从 `params`、`ApiOptions` 或当前环境配置读取，禁止写死。

现有构造器与 curl 完全一致时：

```js
import { jsonRequestParams } from './core/headers.js';

const moduleRoutes = {
  apiMethodName: {
    headers: jsonRequestParams,
  },
};
```

不完全一致时，在 `headers.js` 新增命名构造器：

```js
export function projectXRequestParams(params = {}, options = {}) {
  // 集中维护该项目实际需要的完整 Header
}
```

业务 route 只引用构造器：

```js
import { projectXRequestParams } from './core/headers.js';

const moduleRoutes = {
  apiMethodName: {
    headers: projectXRequestParams,
  },
};
```

## 代码形态

```js
const moduleRoutes = {
  apiMethodName: {
    description: 'Short English description.',
    method: 'POST',
    path: () => `/api/project/app/${ApiOptions.tenant}/xxx`,
    headers: jsonRequestParams, // 仅当实际 Header 与 curl 完全一致
    buildPayload: (params = {}) => ({
      sessionToken: params.loginRes && params.loginRes.sessionToken,
      name: params.name,
    }),
  },
};

function apiMethodName(params = {}) {
  return callApi(moduleRoutes.apiMethodName, params);
}

export const moduleApi = {
  apiMethodName,
};
```

## 对用户的输出

按这个顺序说明：

1. 找到重复接口，还是需要新增
2. 建议写入哪个文件
3. 具体新增或复用的方法
4. curl 各字段与生成代码的映射关系
5. 还缺哪些确认信息
