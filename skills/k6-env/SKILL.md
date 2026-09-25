---
name: k6-env
description: 在 k6auto 仓库中新增、删除、修改、切换或查看环境。当用户要求增加/删除/切换/修改环境、查看当前环境，或提到 config/envs、config/current.js、main_xx.js 时使用。
---

# k6-env：k6auto 环境管理

## 工作流

1. 先读取 `config/current.js` 的 `currentEnv` 和 `config/envs/<currentEnv>/apiOptions.js` 的 `domainName`，在回答顶部输出：`当前环境：<currentEnv>（<domainName>）`。
2. 根据用户请求选择操作：
   - 查看当前环境：`show`。
   - 新增环境：收集环境缩写、域名、登录用户名、密码，执行 `add`。
   - 切换环境：执行 `switch`。
   - 修改环境：执行 `set`。
   - 删除环境：执行 `remove`。
   - 初始化项目登录鉴权：按 `references/login-auth-init.md` 执行（一般情况不执行，必须二次确认）。
3. 文件结构与三个注册点的准确格式以 `references/env-layout.md` 为准。
4. 每次变更后运行 `k6 inspect main/main.js` 校验。

## 环境操作（LLM 执行，不提供脚本）

### show：查看当前环境

- 读取 `config/current.js` 的 `export const currentEnv`。
- 读取 `config/envs/<currentEnv>/apiOptions.js` 的 `domainName`。
- 输出：`当前环境：<currentEnv>（<domainName>）`。

### add：新增环境

- 收集：环境缩写 `<abbr>`、域名、登录用户名、密码。
- 缩写必须是合法 JS 标识符：`[A-Za-z][A-Za-z0-9_]*`，且不能是 JS 保留字。
- 模板默认 `config/envs/develop`。创建：
  - `config/envs/<abbr>/apiOptions.js`：复制模板，替换 `domainName` / `username` / `password` 与「环境」注释。
  - `config/envs/<abbr>/data.json`、`dataTestmanager.json`：空 wrapper（格式见 env-layout.md）。
  - `main/main_<abbr>.js`：复制 `main/main_develop.js`，替换「环境入口」注释。
- 注册（格式见 env-layout.md）：
  - `config/current.js`：加 `import` + `envs` 条目。
  - `main/main.js`：加 `import` + `envEntries` 条目。
- 默认不切换 `currentEnv`；用户要求切换时再执行 `switch`。

### switch：切换当前环境

- 目标环境必须已注册（`config/current.js` 的 `envs` 中存在）。
- 只改 `config/current.js` 的 `export const currentEnv`。

### set：修改环境配置

- 至少提供 `domainName` / `username` / `password` 之一。
- 只改 `config/envs/<abbr>/apiOptions.js` 对应字段。

### remove：删除环境

- 目标是当前环境时拒绝删除，先 `switch` 到其他环境。
- 删除前向用户列出将删除的内容并征得确认：
  - `config/envs/<abbr>/`
  - `main/main_<abbr>.js`
  - `config/current.js` 注册
  - `main/main.js` 注册
- 确认后删除目录与入口文件，并移除两处注册。

## 初始化项目登录鉴权（由 LLM 执行，不提供 CLI）

- **项目级操作，一般情况下不执行**：把整个项目的登录鉴权方式改为用户指定的登录接口与鉴权字段提取规则，影响所有环境与场景。
- 执行前必须从用户处收集（缺一不可）：
  - 登录接口路径（如 `/api/gateway/login`）与请求方法。
  - 鉴权字段获取说明，例如 Cookie 取自响应头 `Set-Cookie` 的哪个键、sessionToken 取自响应体哪个字段、是否需要 base64 等。
- 执行会修改 `apiTest/login.js`、`config/refreshLogin.js`、`scenario_debug.js`；**具体改哪些位置、怎么改由 LLM 判断**，参考 `references/login-auth-init.md`。
- **必须二次确认**：
  1. 先向用户说明后果（执行后会修改整个项目的登录鉴权方式），取得同意；
  2. 向用户展示将要修改的文件与具体位置（计划），本次不落盘；
  3. 再次与用户确认后开始修改；改前先把三个文件复制备份到 `skills/k6-env/backups/<时间戳>/`。
- 修改后：
  - 运行 `.\k6.exe run scenario_debug.js` 调用登录方法实测（会真实访问后端登录接口，需用户同意），确认 Cookie / sessionToken 获取成功；
  - 提取规则依据用户说明编写但未实测的，保留 `⚠️ 未实测，待验证` 标记；
  - 向用户说明写入内容与备份位置。

## 校验

- 环境配置修改后用 `k6 inspect main/main.js` 校验入口。
- 新增环境后建议 `switch` 到新环境并确认登录态，再跑 `config/refreshLogin.js`；刷新登录态属于会访问后端的操作，需用户明确同意后才执行。
