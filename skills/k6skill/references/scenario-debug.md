# 场景调试

通过 `scenario_debug.js` 直接调用指定场景函数，执行 k6，并检查最新日志。

## 必做流程

1. 读取 `config/current.js`，确认 `currentEnv`（本次测试跑的环境）；如需其他环境，先改 `currentEnv` 一行并确认 `config/envs/<环境名>/` 目录存在。向用户说明将在哪个环境执行。
2. 检查当前环境 `data.json` 的 `loginRes`：缺失或疑似过期（如 401）时，先执行 `.\k6.exe run config\refreshLogin.js` 刷新该环境的 Cookie/sessionToken。
3. 在 `scenarios/` 下定位用户指定的场景文件。
4. 读取文件，确认主场景函数名。
5. 更新 `scenario_debug.js`，让它直接调用该场景函数。不要在 debug 文件里重复读取场景内部已经读取的配置；场景函数内部通过 `readEnvData` 读取当前环境（`config/envs/<currentEnv>/`）数据。
6. 执行：

```powershell
.\k6.exe run scenario_debug.js
```

7. 执行后检查 `report/allure/<最新日期>/` 下的最新日志，不能只看控制台摘要。
8. 如果失败原因能在本地代码修复，就改完再跑一次。
9. 如果失败依赖登录态、权限、环境数据或业务决策，再把具体阻塞告诉用户。

## debug 文件形态

```js
import { scenarioName } from './scenarios/file.js';

export function debug() {
  scenarioName();
}

export default function () {
  debug();
}
```

## 校验规则

- 先确认场景文件存在；不存在时列出候选文件。
- 核对本次执行的 `currentEnv` 与日志/请求中的域名一致。
- 按日期目录名倒序找最新 `report/allure/<日期>/`，再在目录内按修改时间找最新 `*-result.json`；不要读取仓库根目录遗留的 `YYYY-MM-DD/`。每条日志都有对应请求以及完整返回。
- 逐个核对相关 `casename` 的状态，不只依据 k6 退出摘要判断。
- 输出具体失败步骤、HTTP 状态、断言信息或 JS 异常。

## 对用户的输出

按这个顺序说明：

1. 本次执行的环境（`currentEnv`）与登录态情况（是否刷新过）
2. 用了哪个场景文件和函数
3. 是否更新了 `scenario_debug.js`
4. 执行状态
5. 最新日志结论
6. 已修复的问题或剩余阻塞
