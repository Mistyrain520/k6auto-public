---
name: k6-catalog
description: 检索 k6auto 的 apiTest 接口与 scenarios 场景，按关键词列出接口/场景，并输出场景详细步骤。当用户要求列出接口、查询接口、列出场景、查看场景步骤、生成或刷新接口场景索引时使用。
---

# k6-catalog：接口/场景目录

## 工作流

1. 先读取 `config/current.js` 的 `currentEnv` 和 `config/envs/<currentEnv>/apiOptions.js` 的 `domainName`，在回答顶部输出：`当前环境：<currentEnv>（<domainName>）`。
2. 优先读取索引 `report/catalog/catalog.json`；索引不存在或怀疑过期时，先运行：

```text
python skills/k6-catalog/scripts/build_catalog.py
```

3. 按关键词在索引中检索接口/场景；命中后回到对应源文件确认 route、参数或步骤，代码才是最终事实。
4. 场景详细步骤：读取目标场景文件，按代码顺序列出 `group`、`casename`、调用的 API 和步骤间关键依赖；不实际运行场景。
5. 按 `references/output-template.md` 的固定模板输出。

## 接口查询

- 接口条目包含：文件路径、导出对象、方法/route 名、HTTP method、path、description。
- 关键词同时匹配方法名、route key、description、path 和 `casename`，注意描述可能是中文也可能是英文。

## 场景查询

- 场景条目包含：文件路径、导出函数、模块、关键 `casename` / `group`。
- 场景详情输出：步骤表（group、casename、调用的 API、关键依赖）和一句话用途。

## 约束

- 不生成 Web 页面，也不维护静态 HTML；`report/catalog/catalog.json` 只是可重建缓存。
- 索引找不到时用 `rg` 直接搜索源码兜底，禁止对用户说“不存在”而不再确认。
