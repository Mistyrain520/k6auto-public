# k6auto - 全栈自动化测试框架

<div align="center">

[![k6](https://img.shields.io/badge/k6-Extensions-orange)](https://k6.io)
[![Allure](https://img.shields.io/badge/Report-Allure-brightgreen)](https://docs.qameta.io/allure/)
[![Docker](https://img.shields.io/badge/Deploy-Docker-blue)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Orchestration-K8s-informational)](https://kubernetes.io/)

**基于 k6 打造的企业级全栈自动化测试解决方案**

</div>

---

## 演示视频

- [k6auto 演示视频](https://www.bilibili.com/video/BV15pNH6vEWQ)
- [k6auto 前端web性能](https://www.bilibili.com/video/BV1Fo8261ERP)

---

## 为什么选择 k6auto

传统的测试工具往往只能覆盖单一测试类型，而 **k6auto** 打破了这个限制。我们基于 [k6](https://k6.io) 核心引擎，通过自研扩展和工程化封装，打造了一个真正的一体化测试框架。

### 核心优势

| 特性 | 说明 | 价值 |
|------|------|------|
| **自研 k6 扩展生态** | 自研 `xk6-xxx` 高性能日志、`xk6-file` 文件操作等扩展 | 突破原生 k6 功能边界，满足复杂业务场景 |
| **全测试类型覆盖** | API 自动化 + 接口性能 + 前端性能 + WebSocket + 数据库 + 中间件 | 一套框架，全链路质量保障 |
| **Allure 企业级报告** | 美观的 HTML 报告，支持步骤追踪、失败分析、历史趋势 | 让测试结果一目了然，提升团队协作效率 |
| **云原生架构** | 完整的 Dockerfile + K8s Deployment 配置 | 轻松实现容器化部署和弹性扩缩容 |
| **高性能日志引擎** | 基于 Uber Zap 的高性能日志扩展 | 海量并发下依然保持稳定的日志记录 |
| **WebSocket 实战** | 支持多人协同文档、实时通信场景测试 | 覆盖现代 Web 应用的核心交互场景 |
| **场景化编排** | 支持 setup/teardown、数据驱动、复杂业务流程 | 灵活应对各种业务测试需求 |
| **AI 驱动开发** | 集成 `k6skill`，覆盖接口封装、场景编排、性能压测与调试 | 提升测试脚本开发效率，降低人工编写成本 |

---

## 技术架构

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                           k6auto 自动化测试框架                          │
├──────────────────────────────────────────────────────────────────────────┤
│  API 自动化层      │  性能测试层       │  前端性能层      │  WebSocket 层 │
│  ├─ apiTest        │  ├─ performance   │  ├─ browser      │  ├─ scen      │
│  ├─ 场景编排       │  ├─ 高并发压测    │  ├─ Core Web     │  ├─ 协同文档  │
│  ├─ 数据驱动       │  ├─ 统一断言      │  ├─ 页面交互     │  ├─ 实时通信  │
│  └─ 通用日志       │  └─ 数据采集      │  └─ 可视化指标   │  └─ 场景定义  │
├──────────────────────────────────────────────────────────────────────────┤
│  自研 k6 扩展层                                                           │
│  ├─ xk6-xxx: 高性能结构化日志         ├─ xk6-sql: 数据库操作           │
│  ├─ xk6-file: 文件读写支持            └─ 更多扩展                        │
├──────────────────────────────────────────────────────────────────────────┤
│  基础设施层                                                              │
│  ├─ Allure 报告      ├─ Docker 容器化    ├─ Kubernetes 编排             │
│  ├─ Chai 断言库      ├─ PostgreSQL       ├─ Redis 缓存                  │
│  └─ 消息/协同能力    └─ 其他中间件                                             │
├──────────────────────────────────────────────────────────────────────────┤
│  AI 辅助层 (k6skill)                                                     │
│  ├─ curl 转接口        ├─ 业务流程转场景                                  │
│  ├─ 性能压测场景       └─ 场景调试执行                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 快速开始

### 1. 安装 Node.js 依赖

项目依赖通过 npm 管理，首次使用前需安装（当前运行时依赖为 `jsonpath-plus`，`chai`、`uuid` 使用仓库内置副本）：

```bash
npm install
```

安装完成后会在项目根目录生成 `node_modules/` 目录，该目录已加入 `.gitignore`，不会被提交。

### 2. 构建自定义 k6 二进制

我们使用 [xk6](https://github.com/grafana/xk6) 构建包含自定义扩展的 k6 二进制：

```bash
# 安装 xk6
# go version 大于 1.23.2即可
go install go.k6.io/xk6@v1.4.4

# 构建包含扩展的 k6
xk6 build --verbose --k6-version v1.7.1 \
  --with github.com/Mistyrain520/xk6-zap@v1.6.0 \
  --with github.com/grafana/xk6-sql@v1.0.5 \
  --with github.com/Mistyrain520/xk6-file@v1.0.0 \
  --with github.com/grafana/xk6-kubernetes@v0.10.3

# 检查扩展是否编译成功
.\k6.exe version
```

### 3. Docker 一键部署

```bash
# 构建镜像
docker build -t k6auto:k6-v1.7.1 .

# 运行测试
docker run -v $(pwd):/home/xk6 k6auto:k6-v1.7.1 ./k6 run main/main.js
```

### 4. Kubernetes 分布式执行

```bash
# 部署 k6 worker 集群
kubectl apply -f k6-worker-deployment.yaml
kubectl apply -f k6-worker-service.yaml
```

---

## 功能模块详解

### API 自动化测试

采用 **分层架构设计**，实现业务与协议分离：

```javascript
// apiTest/ - 底层 API 封装
export function apiCreateXxx(params) {
  // 封装 HTTP 请求细节
}

// scenarios/ - 业务场景编排
export function xxxFlow() {
  // 组合 API 实现完整业务流程
  const repo = apiCreateXxxRepository({...});
  const item = apiCreateXxx({...});
  const updateRes = apiBatchUpdateXxx({...});
}
```

**生成 Allure 报告：**

```bash
# 执行测试，自动生成结果目录（如 report/allure/2026-06-04）
.\k6.exe run .\main\main.js

# 查看报告
allure serve .\report\allure\2026-06-04\
```

![API 测试报告示例](./report/newreport1.png)

---

### API 性能测试

与自动化测试共用 API 层，无缝切换：

```javascript
// performance.js - 性能测试配置
export const options = {
  discardResponseBodies: false,
  scenarios: {
    contacts: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 20,
      maxDuration: '5m',
      exec: 'scenarios_item',
    }
  },
}
```

**接入 InfluxDB + Grafana：**

```bash
.\k6.exe run --out influxdb=http://localhost:8086/mydb .\performance.js
```

![性能测试报告示例](./report/newreport2.png)

---

### 前端性能测试（Browser）

基于 k6 Browser 模块，支持：

- **Core Web Vitals** 指标采集（LCP、FID、CLS）
- **真实浏览器交互** 模拟（点击、输入、导航）
- **混合协议测试**（Browser + HTTP 并行）

```javascript
import { browser } from 'k6/experimental/browser'

export async function browserTest() {
  const page = browser.newPage()
  await page.goto('https://example.com/your-page-path')
  
  // 模拟用户点击
  const productCard = page.locator('[class="xxx"]')
  await productCard.click()
  
  // 自动采集 Web Vitals 指标
}
```

---

### WebSocket 实时测试

支持复杂的 **多人协同场景**，例如在线文档编辑：

```javascript
// 单人/多人协同文档自动化与压测
// 支持 Word、PPT、Excel、Page 等多种类型文档

import ws from 'k6/ws'

ws.connect(url, params, function (socket) {
  socket.on('open', () => {
    socket.sendBinary(binaryData)  // 发送二进制数据
  })
  socket.on('binaryMessage', (msg) => {
    // 处理实时同步消息
  })
})
```

---

### AI 驱动：k6skill

**k6auto** 已整合统一的 `k6skill`，在当前仓库内支持接口封装、业务场景编排、性能压测场景和调试入口更新。它会读取项目现有代码，沿用 `apiTest/`、`scenarios/`、`scenario_debug.js` 等目录结构和命名风格，尽量复用已有方法并保持最小修改。

#### 使用方式

根据任务类型直接描述需求即可：

```bash
# 1. curl 转接口
把这个 curl 转成项目里的接口方法：
curl -X POST 'http://api.example.com/xxx' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=xxx' \
  -H 'X-Application-Id: xxx' \
  -H 'X-Session-Token: xxx' \
  -d '{"name":"xxx","xxxField":"abc123"}'

# 2. 业务流程转场景
帮我在 scenarios/xxx.js 里实现一个场景：先创建 A，再更新 B，最后校验 C。

# 3. 性能压测场景
基于现有接口写一个 100 并发、持续 5 分钟的压测场景。

# 4. 场景调试
帮我调试 scenarios/xxx.js 里的 xxxFlow，并更新 scenario_debug.js。
```

#### 智能特性

| 能力 | 说明 |
|------|------|
| **统一 Skill 入口** | `k6skill` 统一承接 curl 转接口、场景编写、性能压测和调试执行 |
| **自动对齐项目风格** | 生成或修改代码时优先适配现有 `apiTest/`、`scenarios/` 和通用请求封装 |
| **重复接口识别** | 新增接口前会搜索已有方法、路由和描述，避免重复封装 |
| **敏感信息规避** | 不把 curl 中的 Cookie、token、租户或固定业务数据直接写死到代码 |
| **场景化编排** | 支持将多步骤业务流程沉淀为可复用的场景方法 |
| **调试闭环** | 可更新 `scenario_debug.js` 并执行指定场景，结合日志定位问题 |

#### Skill 配置

统一配置位于 `skills/k6skill/SKILL.md`，按任务类型拆分引用文档：

- `references/curl-to-api.md`：curl 转接口
- `references/scenario-authoring.md`：业务场景编写
- `references/performance-scene.md`：性能压测场景
- `references/scenario-debug.md`：场景调试执行

#### 使用场景

- **接口快速封装**：从浏览器 DevTools 复制 curl，快速生成接口代码。
- **业务流程沉淀**：把创建、编辑、审批、清理等多步骤流程编排成场景。
- **性能压测复用**：基于已有 API 和场景快速生成压测入口。
- **单场景调试**：更新调试入口并执行指定场景，快速定位失败原因。
- **团队协作**：统一接口、场景和调试脚本的编写风格，降低审查成本。

---

### 数据库与中间件

通过 `xk6-sql` 扩展，原生支持 SQL 操作：

```javascript
import sql from 'k6/x/sql'
import driver from 'k6/x/sql/driver/postgres'

const db = sql.open(driver, 'postgres://user:pass@host/db')

export function setup() {
  // 测试前准备数据
  const data = setupdata()
  data.xxxGroup = { objectId: getXxxGroup(db, data.xxxWorkspace.objectId) }
  return data
}

export function teardown(data) {
  // 测试后清理数据
  teardowndata(data)
}
```

---

## 报告展示

### Allure 可视化报告

我们集成了 **Allure** 测试报告框架，提供企业级的可视化报告体验。

#### 报告总览 - 测试执行全局统计

展示测试套件的执行概况，包括用例总数、通过率、失败率、执行时长等核心指标，一目了然掌握测试质量。

![Allure 报告总览](./report/newreport1.png)

#### 测试详情 - 单用例深度追踪

每个测试用例都包含完整的执行轨迹：
- **完整 curl 命令**：方便快速定位问题
- **请求信息**：HTTP 请求头、请求体、响应数据
- **断言结果**：每个检查点的通过/失败状态
- **错误详情（完整返回信息）**：成功失败都有完整返回信息，方便排查问题

![Allure 测试详情](./report/newreport2.png)

![Allure 历史趋势](./report/newreport3.png)

### Grafana 实时监控

```json
{
  "dashboard": {
    "title": "k6 Performance",
    "panels": [
      {
        "title": "Requests per Second",
        "targets": [{"measurement": "http_reqs"}]
      },
      {
        "title": "Response Time",
        "targets": [{"measurement": "http_req_duration"}]
      }
    ]
  }
}
```

---

## 项目结构

```text
k6auto/
├─ apiTest/               # API 底层封装（业务无关）
│  ├─ core/
│  ├─ xxx.js
│  ├─ xxx/
│  └─ ...
├─ scenarios/             # 业务场景编排
│  ├─ xxx_scenarios/
│  ├─ setupdata.js
│  ├─ teardown.js
│  └─ xxx.js
├─ capabilities/          # k6 全栈能力
│  ├─ browser/
│  ├─ grpc/
│  ├─ k8s/
│  └─ k6redis/
├─ websocket/             # 协同文档 / WebSocket 场景
├─ tool/                  # 通用工具（UUID、断言、JSONPath、数据库等）
├─ logger/                # 日志处理
├─ config/                # 配置管理
├─ skills/                # AI Skill 配置
├─ report/                # 报告截图示例
├─ main/                  # 入口（main.js 调度器 + main_dev1/main_develop）
├─ performance.js         # 性能测试入口
├─ debug.js               # 单接口调试入口
├─ scenario_debug.js      # 单场景调试入口
├─ Dockerfile             # 容器化构建
└─ k6-worker-*.yaml       # K8s 部署配置
```

---

## 功能清单

- [x] **k6 API 自动化** - 完整的分层架构，支持复杂业务场景
  - [x] 分层架构设计（`apiTest/` + `scenarios/`）
  - [x] 统一 HTTP 请求封装
  - [x] 自动化 Allure 报告生成
  - [x] curl 命令自动记录到报告
  - [x] 报告测试步骤采用展开运算符，动态可选断言
  - [x] 场景化编排（setup/teardown）
  - [x] 数据驱动测试（SharedArray）
  - [x] 通用断言封装（Assertions）
  - [x] 登录态自动管理
  - [x] JSONPath 响应提取
  - [x] 请求参数容错处理
  - [ ] 对接 browser，接入图片显示？
- [x] **k6 API 性能测试** - 无缝对接自动化用例，支持多种负载模式
- [x] **k6 Browser 前端性能** - Core Web Vitals 指标采集
- [x] **Chai.js 断言集成** - 丰富的断言能力
- [x] **自研 xk6-xxx 日志扩展** - 高性能结构化日志
- [x] **PostgreSQL 数据库支持** - 原生 SQL 操作能力
- [ ] **多数据库适配器？**
- [x] **WebSocket 实战** - 单人/多人协同文档自动化与压测
- [x] **Allure 企业级报告** - 美观的 HTML 报告与历史趋势
- [x] **Docker 容器化** - 完整的容器化支持
- [x] **Kubernetes 编排** - 分布式测试执行能力
- [x] **AI 驱动 k6skill** - 统一支持接口封装、场景编排、性能压测和调试执行
  - [x] curl 转接口
  - [x] 业务流程转场景
  - [x] 性能压测场景
  - [x] 场景调试执行
- [ ] Redis
  - [x] 测试示例
- [ ] Kafka 测试示例（规划中）
- [x] gRPC 测试示例
- [ ] K8s
  - [x] k8s 连接实现，健康检查
  - [x] 日志查询，写入
  - [ ] 模糊演练场景
- [ ] Swagger 转换（低优先级）尽量少依赖手写接口文档，优先从 curl 转换。

---

## 最佳实践

### 1. 用例与性能复用

API 层与场景层分离，同一套 API 代码可同时用于：
- 功能自动化测试（验证正确性）
- 接口性能测试（验证性能指标）
- 稳定性测试（长时间运行）

### 2. 数据驱动测试

```javascript
import { SharedArray } from 'k6/data'

const testData = new SharedArray('testData', function () {
  return JSON.parse(open('./config/testdata.json'))
})

export default function () {
  const user = testData[__VU % testData.length]
  // 使用不同用户执行测试
}
```

### 3. 环境隔离

通过 `setup/teardown` 实现测试数据自动管理：

```javascript
export function setup() {
  // 创建测试数据
  return { xxxFieldId: createXxx() }
}

export default function (data) {
  // 使用 setup 创建的数据
  useXxx(data.xxxFieldId)
}

export function teardown(data) {
  // 清理测试数据
  deleteXxx(data.xxxFieldId)
}
```

### 4. AI 驱动

在已有项目框架上，直接描述场景即可。

例如：
- 帮我在 `xxx.js` 里实现场景，先做 A，curl 如下；再调 B，curl 如下；最后调 C，curl 如下。
- 帮我压测一下指定web页面
- 帮我压测一下某个接口[curl]

---

## 贡献与支持

欢迎通过以下方式参与项目：

- 提交 Issue 反馈问题
- 提出新功能建议
- 提交 Pull Request
- 给项目点个 Star

---

## License

本项目采用通用的 `MIT License` 作为开源协议。仓库根目录已加入 `LICENSE` 文件。

---

## 致谢

- 感谢 [linux.do](https://linux.do/) 社区推广支持。
- 感谢 [k6](https://k6.io/) 团队提供的开源项目。

