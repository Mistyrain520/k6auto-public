---
name: k6-assert
description: 审计仓库 apiTest 接口断言并给出增加/修改意见。当用户要求“结合最新 allure/zaplogger 日志总结/审查所有接口的断言”“哪些接口需要加断言、加什么断言”“评估现有断言是否合理/是否需要修改”时使用；也用于把审计结果按清晰形式输出并让用户选择落地。
---

# API 断言审计

## 工作流

1. 定位最新日志：默认读取 `report/allure/` 下最新日期目录（如 `report/allure/2026-08-02/`）里的 `*-result.json`（zaplogger 输出）。运行 `python scripts/summarize_logs.py` 生成紧凑摘要（每步 name/status/失败步骤/实际返回）。
2. 盘点接口与现有断言：读取 `apiTest/**/*.js` 的 route 定义，记录每个接口的 `extraAssertions`。默认三个断言（`Assertions.pass(res.res.body)`、`Assertions.assertion200(res.res)`、`Assertions.pass(result)`）固定不动，由 `apiTest/core/apiCaller.js` 统一注入。
3. 逐接口分析（规则详见 `references/k6-rules.md`）：
   - 只有默认三断言 → 依据日志真实返回给出“建议增加断言 + 理由”。
   - 已有额外断言 → 评估是否需要修改（是否假断言、断言值是否与真实返回匹配）。
   - 识别“假成功”风险（返回 ok 但副作用可能未发生）→ 提示兜底断言。
4. 输出审计清单（形式详见 `references/presentation.md`）：按漏斗四层控制篇幅——统计句 → 模块看板 → 问题簇表 → 按需下钻；需改接口 >200（或明细过长）时把全量明细落 `report/audit-YYYY-MM-DD.md` 并只给文件链接。结尾给出"全部应用 / 按模块 / 按编号"的选择方式。
5. 等用户选择后再落地：确认后按仓库规则（k6skill：改 apiTest 前先确认目标文件）实施修改，并用 `k6 inspect` / `k6 run` 验证新增断言真实生效。

## 关键约束

- 不修改、不删除默认三个断言。
- `params`（jsonpath/subsetStr/arrayLength）只有在 route.extraAssertions 有对应处理时才真正断言；否则是"假断言"，日志里只是展示提取值。
- 现有 `Assertions` 方法不足时，可在 `tool/assertion.js` 新增通用断言方法后再落地（规则见 `references/k6-rules.md`）。
- 输出必须让用户做选择；未确认前不落 apiTest 代码。

## 资源

- `references/k6-rules.md`：断言判断规则、返回结构→建议断言映射、假断言/假成功识别、优先级。
- `references/presentation.md`：审计清单的展示与用户选择格式。
- `scripts/summarize_logs.py`：汇总最新日志为紧凑清单。
