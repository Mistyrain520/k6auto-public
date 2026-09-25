# 场景编写

把业务流程描述和一个或多个 curl 转成 `scenarios/*.js` 场景文件，并尽量复用现有 `apiTest` 方法。

## 必做流程

1. 识别场景目标、步骤顺序、哪些步骤是自然语言、哪些步骤来自 curl、步骤间传递哪些返回值。
2. 对于“创建事项”这类自然语言步骤，先在 `apiTest/` 中按方法名和 route `description` 搜索是否已有对应接口，同时搜索 `scenarios/basescenarios/` 是否有已封装的辅助函数（如 `createTestcases`、`createTestplan`、`createTestExecutions` 等），注意描述可能是英文，要做好中英对比。
3. 如果找到重复接口，明确告诉用户现有方法名，并询问是否复用。
4. 对于 curl 步骤，按 `references/curl-to-api.md` 的规则处理。
5. 如果用户没有指定场景文件名，先问用户写入哪个文件。
6. 如果用户指定了文件，先读取完整文件，在现有主函数后追加新场景，不覆盖原内容。
7. 多个curl之间上下文传递，必须先完整执行curl拿到真实结果，根据真实结果来决定传参中哪些参数需要从另一个curl返回结果中取值。

## 场景文件规则

- 每个场景文件只保留一个 `default function`。
- 每个新增场景保留一个主导出函数。
- 新场景应写在现有主函数后面，而不是覆盖旧场景。
- 如果文件里已经有 `default function`，按该文件现有风格接入，不再新增第二个默认导出。

## 参数与上下文传递

- 配置数据读取要沿用仓库现有方式：通过 `tool/allTool.js` 的 `readEnvData('data.json')` / `readEnvData('dataTestmanager.json')` 读取当前环境（`config/envs/<currentEnv>/`）的数据，写入用 `writeEnvData('data.json', data)`；不要硬编码 `./config/envs/...` 路径。
- 不把 token、Cookie、租户 ID、临时 objectId 硬编码进场景。
- 如果后续步骤依赖前一步返回值，而返回结构不确定，先执行相关 curl，确认真实返回后再决定如何传值。
- 只对关键依赖做轻量校验，例如缺少 `objectId` 时提前报错。

## 实现姿势

- 场景层只编排流程，不直接写底层请求。
- 优先通过 `itemApi`、`testManagerApi`、`workspaceApi`、`fileApi` 这类聚合对象调用接口。
- 只导入实际使用的 API 和工具。
- 场景层日志保持轻量，接口日志和基础断言交给 API 层。

## 对用户的输出

按这个顺序说明：

1. 复用了哪些 API 和 basescenarios 辅助函数；哪些 basescenarios 函数不可复用及原因；新增了哪些 API
2. 改了哪个场景文件，或新建了哪个文件
3. 场景步骤概述
4. 执行入口
5. 还缺哪些确认信息
