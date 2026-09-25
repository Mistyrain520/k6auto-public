# k6auto 环境布局

## 环境目录

```text
config/envs/<环境名>/
├─ apiOptions.js        # 域名、租户、登录凭据、K8s、testmanager 配置
├─ data.json            # 登录态与业务数据（readEnvData 读取）
└─ dataTestmanager.json # 测试管理插件数据
```

## 空数据文件 wrapper

`readEnvData` 要求外层 JSON 含 `data.content` 字符串，因此新环境初始数据文件必须是：

```json
{
  "level": "INFO",
  "ts": "<ISO 时间>",
  "msg": "data",
  "data": {
    "content": "{}"
  }
}
```

## 三个注册点

### 1. config/current.js

```js
import * as <env> from './envs/<env>/apiOptions.js';

const envs = {
  '<env>': <env>,
};

export const currentEnv = '<当前环境>';
```

### 2. main/main_<env>.js

完整 k6 入口，导出 `options` / `setup` / `teardown` / `default`，参考 `main/main_develop.js`。

### 3. main/main.js

```js
import * as main<Env> from './main_<env>.js';

const envEntries = {
  '<env>': main<Env>,
};
```

`main.js` 还要透传各环境入口用到的 `exec` 函数名（当前是 `scenarios_item`）；以后新增其他 `exec` 函数名时同步加一行转发。

## 删除环境

- 删除 `config/envs/<env>/` 与 `main/main_<env>.js`。
- 从 `config/current.js` 和 `main/main.js` 移除对应 import 与注册项。
- 目标环境是 `currentEnv` 时先切换。
