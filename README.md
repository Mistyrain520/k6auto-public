# k6auto - Full-Stack Automation Testing Framework

<div align="center">

[![k6](https://img.shields.io/badge/k6-Extensions-orange)](https://k6.io)
[![Allure](https://img.shields.io/badge/Report-Allure-brightgreen)](https://docs.qameta.io/allure/)
[![Docker](https://img.shields.io/badge/Deploy-Docker-blue)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Orchestration-K8s-informational)](https://kubernetes.io/)

**An enterprise-grade, full-stack automation testing solution built on k6**

[中文](./README_zh-CN.md)

</div>

---

## Demo Videos

- [k6auto demo video](https://www.bilibili.com/video/BV15pNH6vEWQ)
- [k6auto frontend web performance](https://www.bilibili.com/video/BV1Fo8261ERP)

---

## Why k6auto

Traditional testing tools usually cover only a single testing type, while **k6auto** breaks that limitation. Built on the [k6](https://k6.io) core engine, it combines custom extensions and engineering packaging into a truly all-in-one testing framework.

### Key Advantages

| Feature | Description | Value |
|---------|-------------|-------|
| **Custom k6 extension ecosystem** | Custom high-performance logging (`xk6-xxx`), file operations (`xk6-file`), and more | Goes beyond native k6 limits to satisfy complex business scenarios |
| **Full testing coverage** | API automation + API performance + frontend performance + WebSocket + database + middleware | One framework for end-to-end quality assurance |
| **Enterprise Allure reports** | Beautiful HTML reports with step tracking, failure analysis, and historical trends | Makes results clear and improves team collaboration |
| **Cloud-native architecture** | Complete Dockerfile and Kubernetes Deployment configuration | Easy containerized deployment and elastic scaling |
| **High-performance logging engine** | A high-performance logging extension based on Uber Zap | Stable logging under massive concurrency |
| **Real-world WebSocket support** | Multi-user collaborative documents and real-time communication scenarios | Covers core interactions of modern web applications |
| **Scenario orchestration** | setup/teardown, data-driven testing, and complex business flows | Flexible handling of diverse test requirements |
| **AI-assisted development** | Built-in Skills suite (`k6skill`, `k6-assert`, `k6-catalog`, `k6-env`) for API wrapping, scenario orchestration, performance testing, assertion auditing, catalog search, and environment management | Boosts script development efficiency and reduces manual work |

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                      k6auto Automation Testing Framework                  │
├──────────────────────────────────────────────────────────────────────────┤
│  API Automation     │  Performance       │  Frontend Perf   │  WebSocket  │
│  ├─ apiTest         │  ├─ performance    │  ├─ browser      │  ├─ scen    │
│  ├─ scenarios       │  ├─ load testing   │  ├─ Core Web     │  ├─ collab  │
│  ├─ data-driven     │  ├─ assertions     │  ├─ interactions │  ├─ realtime│
│  └─ shared logging  │  └─ data capture   │  └─ visual metrics│ └─ scenes  │
├──────────────────────────────────────────────────────────────────────────┤
│  Custom k6 extensions                                                     │
│  ├─ xk6-xxx: high-performance structured logging                         │
│  ├─ xk6-sql: database operations                                        │
│  └─ xk6-file: file read/write support                                   │
├──────────────────────────────────────────────────────────────────────────┤
│  Infrastructure                                                           │
│  ├─ Allure reports   ├─ Docker           ├─ Kubernetes                   │
│  ├─ Chai assertions  ├─ PostgreSQL       ├─ Redis                        │
│  └─ messaging/collab └─ other middleware                                 │
├──────────────────────────────────────────────────────────────────────────┤
│  AI assistance (Skills suite)                                             │
│  ├─ k6skill: API/scenario/perf/debug  ├─ k6-assert: assertion audit      │
│  ├─ k6-catalog: API/scenario search   └─ k6-env: environment management  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Install Node.js dependencies

Dependencies are managed by npm. Install them before the first run (the current runtime dependency is `jsonpath-plus`; `chai` and `uuid` are bundled in the repository):

```bash
npm install
```

This creates a `node_modules/` directory, which is already listed in `.gitignore` and will not be committed.

### 2. Build a custom k6 binary

We use [xk6](https://github.com/grafana/xk6) to build a k6 binary that includes custom extensions:

```bash
# Install xk6
# Go 1.25 or later is required for k6 v2
go install go.k6.io/xk6@v1.5.0

# Build k6 v2 with the published extension releases
xk6 build v2.0.0 --verbose --output k6-v2.exe \
  --with github.com/Mistyrain520/xk6-zap/v2@v2.0.2 \
  --with github.com/Mistyrain520/xk6-file/v2@v2.0.1 \
  --with github.com/grafana/xk6-sql@v1.2.2 \
  --with github.com/grafana/xk6-sql-driver-postgres@v0.3.1 \
  --with github.com/grafana/xk6-kubernetes@v0.12.0 \
  --with github.com/grafana/xk6-redis@v0.4.2

# Verify the extensions compiled successfully
.\k6-v2.exe version
```

### 3. One-click Docker deployment

```bash
# Build the image using the local Dockerfile
docker build -f Dockerfile -t k6auto:k6-v2.0.0 .

# Run tests
docker run -v $(pwd):/home/xk6 k6auto:k6-v2.0.0 ./k6 run main/main.js
```

### 4. Distributed execution on Kubernetes

```bash
# Deploy the k6 worker cluster (reference)
kubectl apply -f k6-worker-deployment.yaml
kubectl apply -f k6-worker-service.yaml
```

---

## Feature Modules

### API Automation Testing

A layered architecture separates business logic from protocol details:

```javascript
// apiTest/ - low-level API wrappers
export function apiCreateXxx(params) {
  // Encapsulate HTTP request details
}

// scenarios/ - business scenario orchestration
export function xxxFlow() {
  // Combine APIs into a complete business flow
  const repo = apiCreateXxxRepository({...});
  const item = apiCreateXxx({...});
  const updateRes = apiBatchUpdateXxx({...});
}
```

**Generate Allure reports:**

```bash
# Run tests; a result directory (e.g. report/allure/2026-06-04) is generated automatically
.\k6.exe run .\main\main.js

# View the report
allure serve .\report\allure\2026-06-04\
```

![API test report example](./report/newreport1.png)

---

### API Performance Testing

Performance tests share the API layer with automation tests, allowing seamless switching:

```javascript
// performance.js - performance test configuration
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

**Connect to InfluxDB + Grafana:**

```bash
.\k6.exe run --out influxdb=http://localhost:8086/mydb .\performance.js
```

![Performance test report example](./report/newreport2.png)

---

### Frontend Performance Testing (Browser)

Built on the k6 Browser module, supporting:

- **Core Web Vitals** collection (LCP, FID, CLS)
- **Real browser interactions** (click, input, navigation)
- **Mixed-protocol testing** (Browser + HTTP in parallel)

```javascript
import { browser } from 'k6/experimental/browser'

export async function browserTest() {
  const page = browser.newPage()
  await page.goto('https://example.com/your-page-path')

  // Simulate a user click
  const productCard = page.locator('[class="xxx"]')
  await productCard.click()

  // Web Vitals metrics are collected automatically
}
```

---

### WebSocket Real-time Testing

Supports complex **multi-user collaboration** scenarios, such as online document editing:

```javascript
// Automation and load testing for single-user / multi-user collaborative documents
// Supports Word, PPT, Excel, Page, and other document types

import ws from 'k6/ws'

ws.connect(url, params, function (socket) {
  socket.on('open', () => {
    socket.sendBinary(binaryData)  // Send binary data
  })
  socket.on('binaryMessage', (msg) => {
    // Handle real-time sync messages
  })
})
```

---

### AI-assisted: Skills Suite

**k6auto** ships a set of AI skills covering the full workflow: API wrapping, scenario orchestration, performance testing, assertion auditing, API/scenario search, and environment management:

| Skill | Purpose | Entry |
|-------|---------|-------|
| `k6skill` | Write/update `apiTest` APIs, `scenarios` flows, performance tests (HTTP APIs/business flows and frontend browser pages), and debug entries | `skills/k6skill/SKILL.md` |
| `k6-assert` | Audit API assertions against the latest Allure logs and apply improvements after confirmation | `skills/k6-assert/SKILL.md` |
| `k6-catalog` | Search APIs and scenarios, show scenario steps, and build/refresh the catalog index | `skills/k6-catalog/SKILL.md` |
| `k6-env` | View/add/switch/edit/remove environments and initialize project login auth | `skills/k6-env/SKILL.md` |

#### k6skill: APIs, Scenarios, Performance & Debugging

**k6auto** integrates a unified `k6skill` that supports API wrapping, business scenario orchestration, performance scenes, and debug entry updates in this repository. It reads existing project code and follows the directory structure and naming conventions of `apiTest/`, `scenarios/`, `scenario_debug.js`, and other modules, reusing existing methods and keeping changes minimal.

##### Usage

Simply describe the requirement according to the task type:

```bash
# 1. Convert curl to an API method
Convert this curl into a project API method:
curl -X POST 'http://api.example.com/xxx' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: session=xxx' \
  -H 'X-Application-Id: xxx' \
  -H 'X-Session-Token: xxx' \
  -d '{"name":"xxx","xxxField":"abc123"}'

# 2. Convert a business flow into a scenario
Implement a scenario in scenarios/xxx.js: first create A, then update B, and finally verify C.

# 3. Create a performance scene
Write a load test with 100 VUs running for 5 minutes based on the existing APIs.

# 4. Debug a scenario
Help me debug xxxFlow in scenarios/xxx.js and update scenario_debug.js.
```

##### Smart Features

| Capability | Description |
|-----------|-------------|
| **Unified skill entry** | `k6skill` handles curl-to-API, scenario authoring, performance testing, and debug execution |
| **Project style alignment** | Generated or modified code adapts to existing `apiTest/`, `scenarios/`, and shared request wrappers |
| **Duplicate API detection** | Searches existing methods, routes, and descriptions before adding a new API |
| **Sensitive information avoidance** | Does not hard-code cookies, tokens, tenants, or fixed business data from curl |
| **Scenario orchestration** | Turns multi-step business flows into reusable scenario methods |
| **Debug loop** | Updates `scenario_debug.js` and runs a specific scenario, using logs to locate issues |

##### Skill Configuration

The unified configuration is in `skills/k6skill/SKILL.md`, with reference documents split by task type:

- `references/curl-to-api.md`: curl to API
- `references/scenario-authoring.md`: business scenario authoring
- `references/performance-scene.md`: performance scenes
- `references/page-test.md`: frontend page performance testing (browser)
- `references/scenario-debug.md`: scenario debugging

##### Use Cases

- **Rapid API wrapping**: copy a curl from browser DevTools and quickly generate API code.
- **Business flow reuse**: orchestrate create, edit, approve, and cleanup flows into scenarios.
- **Performance test reuse**: quickly generate load test entries from existing APIs and scenarios.
- **Single-scenario debugging**: update the debug entry and run a specific scenario to find failures fast.
- **Team collaboration**: unify the style of APIs, scenarios, and debug scripts to lower review cost.

#### k6-assert: API Assertion Audit

Audits the assertion coverage of `apiTest/**/*.js` against the latest Allure logs (`report/allure/<date>/*-result.json`), surfaces APIs that still rely only on the three default assertions, flags weak assertions and false-success risks, and prints a funnel-shaped report (summary → module board → issue clusters → drill-down). Code changes are applied only after confirmation.

```bash
# Audit all API assertions against the latest logs
Review all API assertions and tell me what to add or change.
```

| Capability | Description |
|-----------|-------------|
| **Log-driven** | Judges from real responses in the latest Allure/zaplogger logs, not guesses |
| **False-success detection** | Flags cases where a response looks OK but the side effect may not have happened |
| **Funnel output** | Keeps the report compact; bulk details go to `report/audit-YYYY-MM-DD.md` |
| **Apply after confirmation** | Offers all / by module / by number and edits code only after the user confirms |

#### k6-catalog: API/Scenario Catalog

Searches `apiTest` APIs and `scenarios` flows by keyword and prints API details or scenario steps. Reads the rebuildable cache `report/catalog/catalog.json` first and refreshes it with `python skills/k6-catalog/scripts/build_catalog.py` when stale.

```bash
# List APIs
List all item-related APIs.

# Show scenario steps
Show me the steps in the xxx scenario.
```

| Capability | Description |
|-----------|-------------|
| **Keyword search** | Matches method names, route keys, descriptions, paths, and casenames |
| **Scenario step replay** | Lists group, casename, called APIs, and key dependencies in code order |
| **Rebuildable index** | `report/catalog/catalog.json` is only a cache and can be rebuilt at any time |

#### k6-env: Environment Management

Manages k6auto's multi-environment configuration: view/add/switch/edit/remove environments, and initialize project login auth (requires double confirmation). Changes touch `config/current.js`, `main/main.js`, and `config/envs/<env>/`, and are validated with `k6 inspect`.

```bash
# Show the current environment
Which environment am I on?

# Add and switch to an environment
Add a prod environment with domain api.example.com.

# Initialize login auth (project-wide, double confirmation)
Change login to POST /api/gateway/login and read the cookie from Set-Cookie xxx.
```

| Capability | Description |
|-----------|-------------|
| **Single registration path** | Add/remove environments updates `config/current.js`, `main/main.js`, and entry files together |
| **Login auth init** | Double confirmation and file backups before changing project-wide auth |
| **Validation loop** | `k6 inspect main/main.js` after every change |

---

### Database and Middleware

Native SQL operations are supported through the `xk6-sql` extension:

```javascript
import sql from 'k6/x/sql'
import driver from 'k6/x/sql/driver/postgres'

const db = sql.open(driver, 'postgres://user:pass@host/db')

export function setup() {
  // Prepare data before the test
  const data = setupdata()
  data.xxxGroup = { objectId: getXxxGroup(db, data.xxxWorkspace.objectId) }
  return data
}

export function teardown(data) {
  // Clean up data after the test
  teardowndata(data)
}
```

---

## Reports

### Allure Visual Reports

We integrate the **Allure** reporting framework to provide an enterprise-grade visual reporting experience.

#### Overview - global test execution statistics

Shows the overall execution status of a test suite, including total cases, pass rate, failure rate, duration, and other core metrics.

![Allure report overview](./report/newreport1.png)

#### Details - per-case deep tracing

Each test case includes a complete execution trace:

- **Full curl command**: helps locate issues quickly
- **Request information**: HTTP headers, request body, and response data
- **Assertion results**: pass/fail status of every checkpoint
- **Error details (full response)**: full response for both success and failure, making troubleshooting easier

![Allure test details](./report/newreport2.png)

![Allure historical trend](./report/newreport3.png)

### Grafana Real-time Monitoring

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

## Project Structure

```text
k6auto/
├─ apiTest/               # Low-level API wrappers (business-agnostic)
│  ├─ core/
│  ├─ xxx.js
│  ├─ xxx/
│  └─ ...
├─ scenarios/             # Business scenario orchestration
│  ├─ xxx_scenarios/
│  ├─ setupdata.js
│  ├─ teardown.js
│  └─ xxx.js
├─ capabilities/          # Full-stack k6 capabilities
│  ├─ browser/
│  ├─ grpc/
│  ├─ k8s/
│  └─ k6redis/
├─ websocket/             # Collaborative document / WebSocket scenarios
├─ tool/                  # Common utilities (UUID, assertions, JSONPath, database, etc.)
├─ logger/                # Logging
├─ config/                # Configuration management
├─ skills/                # AI skill configuration
├─ report/                # Report screenshot examples
├─ main/                  # Entry points (main.js dispatcher + main_dev1/main_develop)
├─ performance.js         # Performance test entry
├─ debug.js               # Single-API debug entry
├─ scenario_debug.js      # Single-scenario debug entry
├─ Dockerfile             # Containerized build
└─ k6-worker-*.yaml       # Kubernetes deployment configuration
```

---

## Feature Checklist

- [x] **k6 API automation** - complete layered architecture for complex business scenarios
  - [x] Layered architecture (`apiTest/` + `scenarios/`)
  - [x] Unified HTTP request wrapper
  - [x] Automatic Allure report generation
  - [x] curl commands automatically recorded in reports
  - [x] Report steps use spread operators with dynamic optional assertions
  - [x] Scenario orchestration (setup/teardown)
  - [x] Data-driven testing (SharedArray)
  - [x] Shared assertion wrapper (Assertions)
  - [x] Automatic login-state management
  - [x] JSONPath response extraction
  - [x] Fault-tolerant request parameters
  - [ ] Integrate browser with image display?
- [x] **k6 API performance testing** - seamless reuse of automation cases with multiple load models
- [x] **k6 Browser frontend performance** - Core Web Vitals collection
- [x] **Chai.js assertion integration** - rich assertion capabilities
- [x] **Custom xk6-xxx logging extension** - high-performance structured logging
- [x] **PostgreSQL support** - native SQL operations
- [ ] **Multiple database adapters?**
- [x] **WebSocket in practice** - single-user / multi-user collaborative document automation and load testing
- [x] **Enterprise Allure reports** - beautiful HTML reports and historical trends
- [x] **Docker containerization** - complete container support
- [x] **Kubernetes orchestration** - distributed test execution
- [x] **AI-assisted Skills suite** - `k6skill` / `k6-assert` / `k6-catalog` / `k6-env`
  - [x] k6skill: curl to API
  - [x] k6skill: business flow to scenario
  - [x] k6skill: performance scenes
  - [x] k6skill: scenario debugging
  - [x] k6-assert: API assertion audit
  - [x] k6-catalog: API/scenario search
  - [x] k6-env: environment management
- [ ] **LLM Calling**
  - [ ] Prompt injection
  - [ ] Context compression
  - [ ] Agent configuration
  - [ ] Looper conversation loop
- [ ] **Multi-service (microservice) support**
- [ ] Redis
  - [x] test example
- [ ] Kafka test example (planned)
- [x] gRPC test example
- [ ] Kubernetes
  - [x] k8s connection and health check
  - [x] log query and write
  - [ ] chaos engineering scenarios
- [ ] Swagger conversion (low priority) - prefer curl conversion to reduce manual API documentation.

---

## Best Practices

### 1. Reuse cases and performance tests

API and scenario layers are separated, so the same API code can be used for:

- Functional automation testing (verify correctness)
- API performance testing (verify performance metrics)
- Stability testing (long-running execution)

### 2. Data-driven testing

```javascript
import { SharedArray } from 'k6/data'

const testData = new SharedArray('testData', function () {
  return JSON.parse(open('./config/testdata.json'))
})

export default function () {
  const user = testData[__VU % testData.length]
  // Run the test with different users
}
```

### 3. Environment isolation

Use `setup/teardown` to manage test data automatically:

```javascript
export function setup() {
  // Create test data
  return { xxxFieldId: createXxx() }
}

export default function (data) {
  // Use data created in setup
  useXxx(data.xxxFieldId)
}

export function teardown(data) {
  // Clean up test data
  deleteXxx(data.xxxFieldId)
}
```

### 4. AI-assisted

Describe the scenario directly within the existing project framework.

Examples:

- Implement a scenario in `xxx.js`: first do A (curl below), then call B (curl below), and finally call C (curl below).
- Run a load test against a specified web page.
- Run a load test against an API (curl).

---

## Contributing and Support

You are welcome to participate through:

- Submitting issues to report problems
- Suggesting new features
- Submitting pull requests
- Starring the project

---

## License

This project is open-sourced under the MIT License. A `LICENSE` file is included in the repository root.

---

## Acknowledgements

- Thanks to the [linux.do](https://linux.do/) community for promotion support.
- Thanks to the [k6](https://k6.io/) team for the open-source project.
