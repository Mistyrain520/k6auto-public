---
name: k6skill
description: 在当前 k6auto 仓库内编写或更新 apiTest 接口方法、scenarios 场景、性能压测场景（HTTP 接口/业务流程与前端页面浏览器测试），以及 scenario_debug 调试入口。用户贴出 curl 想转接口、描述多步骤业务流程想生成场景、要求写性能压测（含“压测一个页面”“写前端页面性能测试场景”等浏览器页面级需求）、或要求测试某个 xx.js 场景时使用。
---

# k6skill

描述：在当前 k6auto 仓库内编写或更新 apiTest 接口方法、scenarios 场景、性能压测场景（HTTP 接口/业务流程与前端页面浏览器测试），以及 scenario_debug 调试入口。用户贴出 curl 想转接口、描述多步骤业务流程想生成场景、要求写性能压测（含“压测一个页面”“写前端页面性能测试场景”等浏览器页面级需求）、或要求测试某个 xx.js 场景时使用。

## 工作流

1. 先判断用户请求属于哪一类：
   - curl 转接口：用户贴出 curl，想把单条请求封装成 `apiTest` 接口方法。
   - 业务流程转场景：用户描述多步骤业务流程，或表达“帮我完成/实现/新增/补全一个 xx 场景”“把 xx 流程写成场景”“写一个 xx 场景”等意图，均归属此类。
   - 性能压测场景：用户要求压测，如“写 100 并发”“对 xx 接口做压测”“xx 性能场景”。
   - 前端页面性能测试（浏览器页面）：用户说“帮我写一个页面测试”“压测一个页面”“写前端页面性能测试场景”等浏览器页面级需求，归入性能压测分支，按 `references/page-test.md` 处理。
   - 场景调试执行：用户要求“测试/调试/运行 xx 场景”“帮我测一下 xx.js”。
2. 判断完属于哪一类后，必须完整读取对应的引用文档，再开始修改代码：
   - curl 转接口：`references/curl-to-api.md`
   - 场景编写：`references/scenario-authoring.md`
   - 性能压测：`references/performance-scene.md`
   - 前端页面性能测试：`references/page-test.md`
   - 场景测试：`references/scenario-debug.md`
3. 修改前先读取项目现有代码，沿用仓库当前结构和命名。

## 共享规则

- 新增接口前，先搜索 `apiTest/` 是否已经存在重复方法；搜索 `scenarios/basescenarios/` 是否已经存在可复用场景接口。
- 若 basescenarios 辅助函数因写死上下文（如 `data.myworkspace`、`itemType`、`loginRes`）无法直接复用，禁止静默在场景里重写等价代码，要向用户说明差异并请其确认扩展方式。
- 判断重复时，同时看方法名、route key、route `description`，`casename`，因为描述可能是中文也可能是英文。
- 保留用户已有代码，采用追加或最小修改，不覆盖无关内容。
- 不把 curl 里的 Cookie、token、租户或固定业务数据直接写进代码；环境相关的方案/模板 ID（`schemeId`、`itemTypeScheme`、`itemTypeScreenScheme`、`workflowScheme`、`permissionScheme`、`templateSpaceUuid`、`spaceType` 等）同样禁止写死，必须来自当前环境目录 `config/envs/<currentEnv>/` 下的 `data*.json`（通过 `tool/allTool.js` 的 `readEnvData('data.json')` / `readEnvData('dataTestmanager.json')` 读取）或 `config/apiOptions.js`（当前环境配置总出口，重导出自 `config/current.js`）；配置里没有的，优先由前置步骤动态创建/查询，最后才向用户确认参数来源。
- 查找已有数据/ID 时，只读取当前环境（`config/current.js` 的 `currentEnv`）目录 `config/envs/<currentEnv>/` 下的所有 `data*.json`（如 `data.json`、`dataTestmanager.json`），不要只认 `data.json`，也不要读其他环境目录；配置里没有的键才动态查询/创建。
- 场景测试/调试默认跑当前环境（`config/current.js` 的 `currentEnv`）；切换环境只需改 `currentEnv` 一行，并确认 `config/envs/<环境名>/` 目录存在且有对应 `data*.json`。
- 场景测试前先确认环境与登录态：若 `data.json` 的 `loginRes` 缺失或出现 401 登录态过期，先执行 `.\k6.exe run config\refreshLogin.js` 刷新当前环境 `data.json` 的 Cookie/sessionToken，再跑场景。
- 报告路径统一走 `tool/outputPath.js`：接口/场景结果为 `report/allure/<日期>/`，Pod 日志为 `report/pods/<日期>/`，deployment 监控为 `report/monitor/<日期>/`；不把仓库根目录遗留的 `YYYY-MM-DD/` 或顶层 `report/*.log` 当作最新日志。
- 前端页面测试的 `targetUrl` 必须用 `ApiOptions.domainName` / `ApiOptions.tenant` 拼接，禁止硬编码域名、租户；登录凭据和 Cookie 不写进场景文件。
- 禁止在未拿到真实返回的情况下编写 `parseResponse` 或依赖字段的提取逻辑；用户对返回结构的描述只作预期参考，实测与描述不一致时以实测为准。若确实只能按描述先写，必须在代码注释和最终输出中显式标注“⚠️ 未实测，待验证”，并作为待办提醒用户。
- 只要会改 `apiTest`，都要先根据仓库规则判断应写入哪个文件，并向用户确认该文件后再改。
- 如果需要新建场景文件而用户没有指定文件名，要先问用户写入哪个文件。
- 如果找到了重复接口，要明确告诉用户找到的是哪个现有方法，并请用户确认是否复用。
- 输出结果时，说明改了哪些文件、复用了哪些方法、怎么运行或验证；逐一说明每个 ID 参数来自哪个配置字段或哪个动态查询步骤，若确实只能写死，必须显式标注原因。
- `k6 run` 会真实调用后端并产生数据副作用（创建/删除空间、用例等），用户未明确要求测试前不得执行；验证代码请用 `k6 inspect`。

## 执行验证

- 涉及 `parseResponse` 或后续步骤依赖响应字段时，优先用用户给的 curl 直接请求（`curl.exe` / Python 等）；只读接口可放心执行，创建/删除等有副作用的接口需用户明确同意后才执行。
- 请求前先确认登录态：返回 401 时，优先向用户要新的 Cookie/token 或登录密码，不要默认“描述就是对的”继续写。
- 拿到真实返回后，把返回结构（脱敏后的字段名与层级）写入代码注释，例如 `// 真实返回：{ code, payload: { count, items: [...] } }`，并在输出中附上真实返回片段与提取路径。

## 项目锚点

- 接口层：`apiTest/`
- 场景层：`scenarios/`
- 场景调试入口：`scenario_debug.js`
- 通用请求流程：`apiTest/core/apiCaller.js`
- 通用请求头：`apiTest/core/headers.js`
- 环境切换点：`config/current.js`（`currentEnv`）
- 环境数据目录：`config/envs/<当前环境>/`（`data.json`、`dataTestmanager.json`）
- 登录态刷新：`config/refreshLogin.js`
- 入口调度：`main/main.js`（各环境入口用到的 `exec` 函数名需在此透传）
- 统一报告路径：`tool/outputPath.js`（`report/<type>/<日期>/`）
- 最新接口/场景日志：`report/allure/<日期>/`
- Pod 日志：`report/pods/<日期>/`
- deployment 监控日志：`report/monitor/<日期>/`
- 页面测试参考实现：`scenarios/performace/testcase_browser.js`
- 浏览器封装：`capabilities/browser/browser.js`、`capabilities/browser/login_browser.js`、`capabilities/browser/web_vital.js`

## 执行要求

- 用户意图是实现时，直接落代码，不只停留在分析。
- 如果用户要求测试，就执行对应命令并检查最新日志，不只看控制台摘要。
- 如果失败原因可以在本地代码修复，就修复后重试；只有确实受限于权限、环境、登录态或业务决策时才停下说明阻塞。
