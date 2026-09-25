# 登录鉴权初始化（LLM 执行，不依赖脚本）

目标：把整个项目的登录鉴权方式改成用户指定的登录接口与鉴权字段提取规则。
只改三个文件，改前先备份到 `skills/k6-env/backups/<时间戳>/`；改动最小化，保留原有结构与代码风格。

## 1. apiTest/login.js —— 核心改动

当前结构：顶部 import 之后依次是 `request_params`、`buildUserInfo`、`getLoginCookie`、`getParseSessionToken`、`login()`。

需要改的位置：

| 位置 | 现状 | 按用户说明改为 |
| --- | --- | --- |
| `login()` 内 `const path = '/api/gateway/login';` | 默认登录路径 | 用户提供的登录接口路径 |
| `request(option, 'POST', path, payload, request_params)` | 固定 POST | 用户提供的请求方法 |
| `getLoginCookie()` 内 `result.match(/PRE-GW-SESSION=(.+?);/g)` | 默认 Cookie 提取 | 按鉴权说明调整（Cookie 来源、正则、是否取部分值） |
| `getParseSessionToken()` 内 `body.payload` + `buildUserInfo` + base64 | 默认 token 提取 | 按鉴权说明调整（token 字段、编码方式） |
| `login()` 日志断言 `Assertions.hasProperty(body, 'payload')` | 默认 payload | 跟随 token 来源字段 |

规则：

- 在 import 之后加一个注释块，记录：登录接口（method + path）、鉴权字段获取说明、提取规则，方便后人维护。
- 提取逻辑与用户说明一致但尚未实测时，注释标注 `⚠️ 未实测，待验证`。
- 保持 `login()` 返回结构 `{ Cookie, sessionToken, body }` 不变（全项目依赖这三个字段）。
- 具体实现方式（如引入 `LOGIN_*` 常量还是直接改字面量、正则怎么写）由 LLM 根据现场代码判断。

## 2. config/refreshLogin.js —— 联动说明

- 逻辑本身一般不用改：调用 `login()` 后把 `Cookie` / `sessionToken` 写进当前环境 `data.json` 的 `loginRes`。
- 把头部注释改为指向 `apiTest/login.js` 的登录鉴权配置块；失败提示建议同时检查该配置与当前环境 `auth`。

## 3. scenario_debug.js —— 登录实测

- 新增 `debugLogin()`：import `login` 与 `ApiOptions`，调用
  `login({ username: ApiOptions.auth.username, password: ApiOptions.auth.password, group, casename, isNotLog: true })`，
  断言 `Cookie` / `sessionToken` 非空并 `console.log` 结果。
- 让 `default function` 调用 `debugLogin()`；原 `debug()`（k8s 监控）保留导出。

## 4. 实测与收尾

1. `k6 inspect config\refreshLogin.js` 校验语法。
2. 用户同意后运行 `.\k6.exe run scenario_debug.js`，确认登录成功、鉴权字段能取到（会真实访问后端）。
3. 向用户报告：改了哪些文件、写入的登录接口与提取规则、备份位置、实测结果。
