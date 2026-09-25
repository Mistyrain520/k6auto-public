FROM crpi-mstj0ugnrdkhzm1r.cn-guangzhou.personal.cr.aliyuncs.com/chensuixaing/golang:tip-alpine3.22 AS builder

ARG XK6_VERSION=v1.4.4
ARG K6_VERSION=v1.7.1
ARG XK6_ZAP_VERSION=v1.6.0
ARG XK6_SQL_VERSION=v1.0.5
ARG XK6_FILE_VERSION=v1.0.0

# 安装必要的依赖包
RUN apk update && \
    apk add --no-cache git

# 安装 xk6
RUN GOBIN=/root/go/bin go install go.k6.io/xk6@${XK6_VERSION}

# 切换到默认安装路径
WORKDIR /root/go/bin

# 检查安装的 xk6 是否存在
RUN ls -l xk6

# 执行 xk6 构建命令
RUN ./xk6 build --verbose --k6-version ${K6_VERSION} \
    --with github.com/Mistyrain520/xk6-zap@${XK6_ZAP_VERSION} \
    --with github.com/grafana/xk6-sql@${XK6_SQL_VERSION} \
    --with github.com/Mistyrain520/xk6-file@${XK6_FILE_VERSION} \
    --with github.com/grafana/xk6-kubernetes@v0.10.3

# 检查构建结果，确认扩展列表符合预期
RUN ./k6 version | tee /tmp/k6-version.txt && \
    grep -q "github.com/Mistyrain520/xk6-zap" /tmp/k6-version.txt && \
    grep -q "github.com/grafana/xk6-sql" /tmp/k6-version.txt && \
    grep -q "github.com/Mistyrain520/xk6-file" /tmp/k6-version.txt

# 第二阶段：最终镜像
FROM crpi-mstj0ugnrdkhzm1r.cn-guangzhou.personal.cr.aliyuncs.com/chensuixaing/golang:tip-alpine3.22

# 设置工作目录
WORKDIR /home/xk6
COPY . .
# 从构建阶段复制生成的 xk6 可执行文件到工作目录
COPY --from=builder /root/go/bin/k6 /home/xk6/k6

# 设置执行权限
RUN chmod +x /home/xk6/k6

# 设置默认执行命令为一个不产生任何输出的命令
CMD ["tail", "-f", "/dev/null"]
