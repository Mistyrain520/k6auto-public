# 接口/场景目录输出模板

## 接口列表

| 文件 | 导出对象 | 方法/route | HTTP method | path | description |
| --- | --- | --- | --- | --- | --- |
| `apiTest/item.js` | `itemApi` | `apicreateItem` | POST | `/parse/api/v2/items` | Create an item. |

关键词查询时只列出命中的接口；无关键词时按模块分组列出全部接口（量大时只给统计和模块看板，明细落 `report/catalog/catalog.json`）。

## 场景列表

| 文件 | 导出函数 | 模块 | 关键步骤（casename） |
| --- | --- | --- | --- |
| `scenarios/testmanager_scenarios/testmanager_main_flow.js` | `testmanager_main_flow` | 测试管理主流程 | 查询插件详情；创建测试用例分组；创建测试用例事项；... |

## 场景详细步骤

按代码执行顺序输出：

| 步骤 | group | casename | 调用的 API | 关键依赖 |
| --- | --- | --- | --- | --- |
| 1 | 初始化数据.登录 | osc-admin登录 | `login` | 无 |
| 2 | 初始化数据.事项类型 | 创建事项类型 | `itemTypeApi.apicreateItemType` | `loginRes` |

末尾给出：

- 场景文件与主导出函数。
- 前置条件（依赖 `data.json` / `dataTestmanager.json` 的哪些键）。
- 执行入口（`main/main.js` 或 `scenario_debug.js`）。
