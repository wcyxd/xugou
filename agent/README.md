# Xugou Agent

Xugou Agent 是一个系统监控客户端，用于收集系统信息并上报到监控服务器。它可以收集 CPU、内存、磁盘、网络等系统信息，并定期上报到指定的服务器。

## 功能特点

- 收集系统基本信息（主机名、操作系统、平台等）
- 监控 CPU 使用率和负载
- 监控内存使用情况
- 监控磁盘使用情况
- 监控网络接口状态
- 支持自定义收集间隔
- 支持 HTTP 上报和控制台输出
- 支持配置文件和环境变量配置

## 安装

### 从源码构建

```bash
git clone https://github.com/xugou/agent.git
cd agent
go build -o xugou-agent
```

## 使用方法

### 基本命令

```bash
# 显示帮助信息
./xugou-agent --help

# 显示版本信息
./xugou-agent version

# 启动客户端
./xugou-agent start

# 配置客户端
./xugou-agent config
```

### 配置选项

可以通过命令行参数、配置文件或环境变量来配置 Xugou Agent：

#### 命令行参数

```bash
# 指定配置文件
./xugou-agent --config /path/to/config.yaml

# 指定服务器地址
./xugou-agent --server https://monitor.example.com

# 指定 API 令牌
./xugou-agent --token YOUR_API_TOKEN

# 指定日志级别
./xugou-agent --log-level debug

# 指定收集间隔（秒）
./xugou-agent start --interval 30

# 指定http 代理
./xugou-agent start --proxy http://proxy.example.com:8080
```

#### 配置文件

默认配置文件位于 `$HOME/.xugou-agent.yaml`，格式如下：

```yaml
server: https://monitor.example.com
token: YOUR_API_TOKEN
interval: 60
log_level: info
```

#### 环境变量

所有配置选项也可以通过环境变量设置，环境变量名称格式为 `XUGOU_*`：

```bash
export XUGOU_SERVER=https://monitor.example.com
export XUGOU_TOKEN=YOUR_API_TOKEN
export XUGOU_INTERVAL=60
export XUGOU_LOG_LEVEL=info
```

### 使用控制台输出

如果您只想查看收集的系统信息而不上报到服务器，可以将服务器地址设置为 `console`：

```bash
./xugou-agent --server console start
```

## 开发

### 依赖项

- Go 1.18 或更高版本
- github.com/spf13/cobra
- github.com/spf13/viper
- github.com/shirou/gopsutil/v3

### 项目结构

```
agent/
├── cmd/
│   └── agent/       # 命令行命令
│       ├── root.go  # 根命令
│       ├── start.go # 启动命令
│       ├── config.go # 配置命令
│       └── version.go # 版本命令
├── pkg/
│   ├── collector/   # 数据收集器
│   └── reporter/    # 数据上报器
└── main.go          # 程序入口
```

## 许可证

MIT 
