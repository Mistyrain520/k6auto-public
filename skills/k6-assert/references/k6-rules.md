# 断言分析规则

## 默认三断言（固定，不评估、不修改）

由 `apiTest/core/apiCaller.js` 的 `buildApiAssertions` 统一注入：

- `Assertions.pass(res.res.body)`：打印完整响应体（日志步骤“完整返回”）。
- `Assertions.assertion200(res.res)`：校验 HTTP 200/201（步骤“返回状态200或者201”）。
- `Assertions.pass(result)`：打印 `params.jsonpath` 提取后的结果（步骤“完整返回”，仅展示不比对）。

**关键机制**：`params.jsonpath` 只负责提取 `result`；`params.subsetStr / arrayLength / isNotSubsetOf / deepInclude` 只有在 route 的 `extraAssertions` 里显式处理时才生效。若 route 没有 extraAssertions 而调用方传了这些参数，就是“假断言”——日志里能看到提取值，但没有比对。

## 接口盘点

- 读取 `apiTest/**/*.js`，对每个 route 记录：route key、path、method、`extraAssertions`。
- 已有 extraAssertions 的常见形态：
  - `Assertions.hasProperty(..., 'objectId')`（如 apicreateItem）
  - `Assertions.equals(result.status, 'ok')`（如 apiBatchCreateTestRunV2、apibatchDeleteRun）
  - `params.params?.arrayLength` 可选断言（如 apibatchUpdateTestManager、apibatchUpdate）
  - `params.params?.subsetStr / isNotSubsetOf / arrayLength / deepInclude`（如 apiqueryTestManager、apiQueryLinkedTestEntity）
  - `Assertions.arrayLength(...)`（如 apiqueryByParse）

## 返回结构 → 建议断言映射（依据日志真实返回）

| 日志真实返回（statusDetails.message） | 建议断言 | 理由 |
|---|---|---|
| `{"status":"ok", ...}` | `Assertions.equals(result.status, 'ok')` | 业务成功标志，能捕获 200 但业务失败 |
| `{"success":true,"code":200,"data":{"status":"ok",...}}` | jsonpath `$.data.status` 后 `equals('ok')` | webtrigger 常见包装 |
| `{"code":0,"message":"保存成功!"}` | jsonpath `$.code` 后等于 0 | 业务码 |
| 创建类响应含 `objectId` | `hasProperty('objectId')` | 创建必须返回 id |
| `{"batchId":...,"status":"finished","count":1}` | `$.status==='finished'` 且 `$.count===1` | 防批量更新被静默忽略 |
| `{"success":1,"fail":0,...}` | 断言 `success===1` 且 `fail===0` | 批量删除结果 |
| `{"status":"ok","data":{"success":true,"newFactorImageId":...}}` | `data.status==='ok'` + 关键产物（如 newFactorImageId）非空 | 副作用产物 |
| 空返回 / `{}` / `null` | 不建议 body 断言，靠后续验证查询（如删除后再查为空） | body 无信息 |
| `{"status":"ok","data":"success","processBarKey":...}` | `status==='ok'` + 异步兜底（processBarKey 非空 / 后续查询验证） | 异步处理 |

## 假断言识别

- 特征：route 无 extraAssertions，但调用方传了 `params: {jsonpath, subsetStr/arrayLength}`。
- 识别方法：查看日志步骤，若某步骤只有“完整返回 / 返回状态200或者201 / 完整返回”三个通用步骤，没有 subsetStr/arrayLength/deepInclude 步骤 → params 断言未生效。
- 修复：给对应 route 补 extraAssertions（支持参数化断言），或改用已支持断言的接口。

## 假成功风险

- 返回 ok 但副作用未发生（实测案例）：
  - `apiCreateCaseUpdateLink`：itemVersion 不匹配时返回 `success:true` 但不建链接 → 必须后续断言链接存在。
  - 组合导入：返回成功但组合可能未生成（selectedCombinationIdsMap 格式错）→ 后续组合查询 arrayLength 兜底。
  - `apibatchDeleteRun`：异步删除（processBarKey），返回 ok 后数据可能仍在 → 等待后查询兜底。
- 规则：对这类接口，返回断言与后续验证查询都要有。

## 断言方法不足时

- 现有通用断言（`pass / assertion200 / equals / isSubsetOf / isNotSubsetOf / arrayLength / deepInclude / hasProperty / hasNestedProperty / isString / isNotEmpty / allItemsEqual / eachItemHasProperty`）无法表达所需校验时，允许在 `tool/assertion.js` 新增**通用**断言方法（如 `matches`、`isNumber`、`isGte/isLte`、`isNotEqual` 等）。
- 新增约束：
  - 遵循现有模式：`static` 方法 + `checkExpectation` 封装，返回 `{ name, status, parameters }`，name 用中文动词短语（如"值不为空"）；
  - 只加可复用的通用断言，不放业务/接口特判逻辑；
  - 优先复用现有方法，确认缺失才新增；新增方法应能服务 ≥2 个接口；
  - 新增后必须 `k6 inspect` 校验语法，并在允许时 `k6 run` 相关场景，确认日志出现对应断言步骤（不再只有三个通用步骤）。
- 新方法写好后，把方法名补充进上面的"现有通用断言"清单（该清单即登记表），供后续审计直接引用。

## 优先级

- P0：假断言（看似绿实际未校验）、会漏报关键失败。
- P1：只有默认三断言，且真实返回有明确业务结构可断言。
- P2：已有断言但可增强（补关键字段、补兜底）。

## 落地

- 在 route 的 `extraAssertions` 里增加断言，沿用 `tool/assertion.js`（`Assertions.equals / isSubsetOf / arrayLength / hasProperty`）。
- 若现有方法不支持所需校验，先在 `tool/assertion.js` 增加通用断言方法（见"断言方法不足时"），再在 extraAssertions 引用。
- 修改 `apiTest` 前按 k6skill 规则向用户确认目标文件。
