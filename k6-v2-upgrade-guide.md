# k6 v2 升级说明

这份文档说明如何把当前项目从 k6 v1 自定义二进制升级到 k6 v2 自定义二进制，重点说明 `k6/x/file` 和 `k6/x/zaplogger` 的源码需要修改哪里。

## 当前状态

当前可用的 `k6.exe` 是基于下面这些模块构建的：

```text
go.k6.io/k6 v1.7.1
github.com/Mistyrain520/xk6-file v1.0.0
github.com/Mistyrain520/xk6-zap v1.6.0
github.com/grafana/xk6-sql v1.0.5
```

之前使用 `github.com/grafana/xk6-sql@latest` 构建后，`k6.exe version` 没有显示 `xk6-sql`。原因是最新版 `xk6-sql` 使用的是 k6 v2 的 Go module path：

```go
go.k6.io/k6/v2/js/modules
```

而当前构建出来的 k6 使用的是 k6 v1 的 Go module path：

```go
go.k6.io/k6/js/modules
```

在 Go 里，这两个 import path 是两个不同的包。它们各自有独立的全局 extension registry。扩展如果注册到 `go.k6.io/k6/v2/js/modules`，当前 k6 v1 运行时是看不到的；反过来也一样。

## 对当前项目的主要影响

项目里的普通 k6 API 风险不高，例如：

```js
import http from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { SharedArray } from 'k6/data';
import encoding from 'k6/encoding';
import crypto from 'k6/crypto';
```

真正需要重点处理的是自定义扩展：

```js
import file from 'k6/x/file';
import zaplogger from 'k6/x/zaplogger';
import sql from 'k6/x/sql';
import redis from 'k6/x/redis';
```

其中 `k6/x/file` 和 `k6/x/zaplogger` 被主流程大量使用，必须先适配 k6 v2，再考虑替换主用的 `k6.exe`。

## 第一步：升级 xk6

当前本机检查到的 xk6 版本是：

```text
xk6 version 1.3.7
```

这个版本会默认构建到 `go.k6.io/k6 v1.7.1`。要构建 k6 v2，先升级 xk6：

```powershell
go install go.k6.io/xk6@latest
xk6 version
```

建议使用 `v1.4.0` 或更高版本的 xk6，因为新版 xk6 才能正确处理 k6 v2 的模块路径。

## 第二步：适配 xk6-file

当前本机模块缓存里的源码位置是：

```text
C:\Users\12986\go\pkg\mod\github.com\!mistyrain520\xk6-file@v1.0.0
```

不要直接修改 Go 模块缓存作为长期方案。建议 fork `github.com/Mistyrain520/xk6-file`，或者复制一份源码到本地目录，修改后用 fork 分支或本地路径构建。

### 修改 file.go

当前 `file.go` 的关键代码是：

```go
package file

import (
	"bufio"
	"io"
	"os"

	"go.k6.io/k6/js/modules"
)

func init() {
	modules.Register("k6/x/file", new(FILE))
}
```

需要把 import 从 k6 v1 改成 k6 v2：

```diff
-	"go.k6.io/k6/js/modules"
+	"go.k6.io/k6/v2/js/modules"
```

改完后应为：

```go
package file

import (
	"bufio"
	"io"
	"os"

	"go.k6.io/k6/v2/js/modules"
)

func init() {
	modules.Register("k6/x/file", new(FILE))
}
```

`xk6-file` 的其他代码主要是 Go 标准库文件读写，例如 `os.Create`、`os.OpenFile`、`os.WriteFile`、`os.Remove`、`os.MkdirAll`，通常不需要为了 k6 v2 修改。

### 修改 go.mod

当前 `xk6-file` 的 `go.mod` 是：

```go
module github.com/Mistyrain520/xk6-file

go 1.25.0

require go.k6.io/k6 v1.7.1
```

需要改成 k6 v2：

```diff
-require go.k6.io/k6 v1.7.1
+require go.k6.io/k6/v2 v2.0.0
```

如果你的 Go proxy 暂时拿不到 `v2.0.0`，可以先用实际构建用的 v2 版本，例如：

```go
require go.k6.io/k6/v2 v2.0.0-rc1
```

修改完成后，在 `xk6-file` 源码目录执行：

```powershell
go mod tidy
go test ./...
```

如果没有测试，至少执行：

```powershell
go test
```

## 第三步：适配 xk6-zap

当前本机模块缓存里的源码位置是：

```text
C:\Users\12986\go\pkg\mod\github.com\!mistyrain520\xk6-zap@v1.6.0
```

`xk6-zap` 比 `xk6-file` 多用了一些 k6 module 类型：

```go
modules.VU
modules.Module
modules.Instance
modules.Exports
```

我检查过本机缓存里的 `go.k6.io/k6/v2@v2.0.0-rc1/js/modules`，这些类型在 k6 v2 里仍然存在，所以第一步主要也是改 import path 和 `go.mod`。

### 修改 zap.go

当前 `zap.go` 的关键代码是：

```go
package zaplogger

import (
	"os"
	"go.k6.io/k6/js/modules"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

func init() {
	modules.Register("k6/x/zaplogger", new(RootModule))
}

type RootModule struct{}
type ZapLogger struct {
	vu modules.VU
}

var (
	_ modules.Module   = &RootModule{}
	_ modules.Instance = &ZapLogger{}
)
```

需要把 import 从 k6 v1 改成 k6 v2：

```diff
-	"go.k6.io/k6/js/modules"
+	"go.k6.io/k6/v2/js/modules"
```

建议顺手整理 import 分组，改完后类似这样：

```go
package zaplogger

import (
	"os"

	"go.k6.io/k6/v2/js/modules"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

func init() {
	modules.Register("k6/x/zaplogger", new(RootModule))
}

type RootModule struct{}
type ZapLogger struct {
	vu modules.VU
}

var (
	_ modules.Module   = &RootModule{}
	_ modules.Instance = &ZapLogger{}
)
```

`InitLogger`、`ZapObject`、`CreateDynamicObject` 等方法主要依赖 `zap` 和 `lumberjack`，不是 k6 API，通常不需要因为 k6 v2 修改。

### 修改 go.mod

当前 `xk6-zap` 的 `go.mod` 是：

```go
module github.com/Mistyrain520/xk6-zap

go 1.21.0

require (
	go.k6.io/k6 v0.47.0
	go.uber.org/zap v1.26.0
	gopkg.in/natefinch/lumberjack.v2 v2.2.1
)
```

需要把 k6 依赖改成 v2：

```diff
 require (
-	go.k6.io/k6 v0.47.0
+	go.k6.io/k6/v2 v2.0.0
 	go.uber.org/zap v1.26.0
 	gopkg.in/natefinch/lumberjack.v2 v2.2.1
 )
```

如果暂时使用 RC 版本：

```go
require (
	go.k6.io/k6/v2 v2.0.0-rc1
	go.uber.org/zap v1.26.0
	gopkg.in/natefinch/lumberjack.v2 v2.2.1
)
```

修改完成后，在 `xk6-zap` 源码目录执行：

```powershell
go mod tidy
go test ./...
```

注意：`xk6-zap` 当前依赖的是很老的 `go.k6.io/k6 v0.47.0`，升级到 k6 v2 后，`go.mod` 里的 indirect 依赖会有大量变化，这是正常现象。

## 第四步：调整 xk6-sql 用法

k6 v2 下可以使用最新版 `xk6-sql`，但项目里的 SQL 用法也要改。

当前项目里有类似代码：

```js
import sql from 'k6/x/sql';

const db = sql.open('postgres', 'postgres://user:pass@127.0.0.1:5432/db?sslmode=disable');
```

新版 `xk6-sql` 需要传 driver symbol，而不是字符串 `'postgres'`：

```js
import sql from 'k6/x/sql';
import driver from 'k6/x/sql/driver/postgres';

const db = sql.open(driver, 'postgres://user:pass@127.0.0.1:5432/db?sslmode=disable');
```

构建时也要加数据库 driver 扩展：

```powershell
--with github.com/grafana/xk6-sql@latest `
--with github.com/grafana/xk6-sql-driver-postgres@latest
```

当前项目里重点检查这些文件：

```text
performance.js
tool/pgsql.js
test/test.js
test/test3.js
```

## 第五步：构建独立的 k6 v2 二进制

迁移阶段不要直接覆盖当前可用的 `k6.exe`。建议先构建一个单独的 `k6-v2.exe`。

先设置 Go 临时目录，避免之前出现的 `C:\WINDOWS\go-build... Access is denied`：

```powershell
New-Item -ItemType Directory -Force .tmp-go | Out-Null
$tmp = (Resolve-Path .tmp-go).Path
$env:GOTMPDIR = $tmp
$env:TEMP = $tmp
$env:TMP = $tmp
```

如果使用 GitHub fork：

```powershell
xk6 build v2.0.0 --verbose `
  --with github.com/your-org/xk6-file@k6-v2 `
  --with github.com/your-org/xk6-zap@k6-v2 `
  --with github.com/grafana/xk6-sql@latest `
  --with github.com/grafana/xk6-sql-driver-postgres@latest `
  --output k6-v2.exe
```

如果使用本地源码目录：

```powershell
xk6 build v2.0.0 --verbose `
  --with github.com/Mistyrain520/xk6-file=..\xk6-file-v2 `
  --with github.com/Mistyrain520/xk6-zap=..\xk6-zap-v2 `
  --with github.com/grafana/xk6-sql@latest `
  --with github.com/grafana/xk6-sql-driver-postgres@latest `
  --output k6-v2.exe
```

本地路径写法会受 xk6 版本影响。如果本地路径方式失败，优先使用 fork 分支，因为这样更容易复现和排查。

## 第六步：验证二进制

构建完成后执行：

```powershell
.\k6-v2.exe version
```

期望能看到类似扩展列表：

```text
Extensions:
  github.com/your-org/xk6-file ..., k6/x/file [js]
  github.com/your-org/xk6-zap ..., k6/x/zaplogger [js]
  github.com/grafana/xk6-sql ..., k6/x/sql [js]
  github.com/grafana/xk6-sql-driver-postgres ..., k6/x/sql/driver/postgres [js]
```

如果构建日志里显示加了某个扩展，但 `k6-v2.exe version` 不显示，通常说明这个扩展仍然注册到了错误的 k6 module path。

可以在扩展源码里搜索：

```powershell
Select-String -Path .\**\*.go -Pattern "go.k6.io/k6/js/modules"
```

面向 k6 v2 的扩展不应该再 import：

```go
go.k6.io/k6/js/modules
```

应该 import：

```go
go.k6.io/k6/v2/js/modules
```

## 第七步：项目脚本冒烟测试

先做 import 和配置解析检查：

```powershell
.\k6-v2.exe inspect .\main.js
.\k6-v2.exe inspect .\test\test.js
.\k6-v2.exe inspect .\performance.js
```

然后再用 1 VU、1 iteration 跑小场景，不要直接跑完整压测。

建议顺序：

```powershell
.\k6-v2.exe run .\test\test3.js
.\k6-v2.exe run .\main.js
.\k6-v2.exe run .\performance.js
```

浏览器和 websocket 脚本单独验证：

```powershell
.\k6-v2.exe inspect .\browser\browser.js
.\k6-v2.exe inspect .\websocket\mainWiki.js
```

## 回滚方案

迁移期间保留当前可用的 v1 二进制：

```text
k6.exe       当前稳定的 k6 v1 二进制
k6-v2.exe    k6 v2 迁移候选二进制
```

只有在下面条件都满足后，才考虑用 `k6-v2.exe` 替换 `k6.exe`：

1. `.\k6-v2.exe version` 能列出所有必需扩展。
2. `main.js` 能正常运行。
3. SQL 脚本已改成 driver symbol 写法，并能正常连接数据库。
4. `k6/x/file` 写配置和读配置正常。
5. `k6/x/zaplogger` 写结果 JSON 正常。

## 快速检查清单

- 升级本机 `xk6` 到 `v1.4.0+`。
- fork 或复制 `xk6-file` 源码。
- 把 `xk6-file` 的 import 改成 `go.k6.io/k6/v2/js/modules`。
- 把 `xk6-file` 的 `go.mod` 改成依赖 `go.k6.io/k6/v2`。
- fork 或复制 `xk6-zap` 源码。
- 把 `xk6-zap` 的 import 改成 `go.k6.io/k6/v2/js/modules`。
- 把 `xk6-zap` 的 `go.mod` 改成依赖 `go.k6.io/k6/v2`。
- 构建时加上 `xk6-sql-driver-postgres`。
- 把 SQL 代码从 `sql.open('postgres', dsn)` 改成 `sql.open(driver, dsn)`。
- 先构建 `k6-v2.exe`，不要直接覆盖 `k6.exe`。
- 执行 `.\k6-v2.exe version` 检查扩展列表。
- 冒烟测试通过后再考虑替换稳定二进制。
