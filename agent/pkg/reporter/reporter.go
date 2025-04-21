package reporter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"time"

	"github.com/xugou/agent/pkg/collector"
)

// Reporter 定义数据上报器接口
type Reporter interface {
	Report(ctx context.Context, info *collector.SystemInfo) error
}

// HTTPReporter 是基于HTTP的数据上报器实现
type HTTPReporter struct {
	serverURL      string
	apiToken       string
	proxyURL       string
	client         *http.Client
	lastNetworkRX  uint64    // 上次网络接收字节数
	lastNetworkTX  uint64    // 上次网络发送字节数
	lastUpdateTime time.Time // 上次更新时间
	registered     bool      // 是否已注册
}

// NewHTTPReporter 创建一个新的HTTP数据上报器
func NewHTTPReporter(serverURL, apiToken, proxyURL string) Reporter {
	// 创建HTTP客户端
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// 如果设置了代理，配置代理
	if proxyURL != "" {
		proxy, err := url.Parse(proxyURL)
		if err != nil {
			fmt.Printf("警告: 代理URL解析失败: %v，将不使用代理\n", err)
		} else {
			client.Transport = &http.Transport{
				Proxy: http.ProxyURL(proxy),
			}
		}
	}

	return &HTTPReporter{
		serverURL:      normalizeURL(serverURL),
		apiToken:       apiToken,
		proxyURL:       proxyURL,
		client:         client,
		lastUpdateTime: time.Now(),
		registered:     false,
	}
}

// normalizeURL 处理URL格式，确保URL末尾没有斜杠
func normalizeURL(url string) string {
	// 移除URL末尾的斜杠
	if len(url) > 0 && url[len(url)-1] == '/' {
		return url[:len(url)-1]
	}
	return url
}

// StatusPayload 定义上报到后端的数据结构
type StatusPayload struct {
	Token       string   `json:"token"` // API令牌
	CPUUsage    float64  `json:"cpu_usage"`
	MemoryTotal uint64   `json:"memory_total"`
	MemoryUsed  uint64   `json:"memory_used"`
	DiskTotal   uint64   `json:"disk_total"`
	DiskUsed    uint64   `json:"disk_used"`
	NetworkRX   uint64   `json:"network_rx"`
	NetworkTX   uint64   `json:"network_tx"`
	Hostname    string   `json:"hostname"`     // 主机名
	IPAddresses []string `json:"ip_addresses"` // IP地址列表
	OS          string   `json:"os"`           // 操作系统
	Version     string   `json:"version"`      // 操作系统版本
}

// RegisterPayload 定义注册到后端的数据结构
type RegisterPayload struct {
	Token       string   `json:"token"`        // API令牌
	Name        string   `json:"name"`         // 客户端名称
	Hostname    string   `json:"hostname"`     // 主机名
	IPAddresses []string `json:"ip_addresses"` // IP地址列表
	OS          string   `json:"os"`           // 操作系统
	Version     string   `json:"version"`      // 操作系统版本
}

// RegisterResponse 定义注册响应结构
type RegisterResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Agent   struct {
		ID int `json:"id"`
	} `json:"agent"`
}

// ensureRegistered 确保客户端已经在服务器端注册
func (r *HTTPReporter) ensureRegistered(ctx context.Context, info *collector.SystemInfo) error {
	if r.registered {
		return nil
	}

	// 构建注册的数据结构
	payload := RegisterPayload{
		Token:       r.apiToken,
		Name:        info.Hostname,
		Hostname:    info.Hostname,
		IPAddresses: getLocalIPs(),
		OS:          info.OS,
		Version:     info.Version,
	}

	// 将数据转换为JSON
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("序列化注册信息失败: %w", err)
	}

	// 构建注册URL
	url := fmt.Sprintf("%s/api/agents/register", r.serverURL)

	// 创建HTTP请求
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(data))
	if err != nil {
		return fmt.Errorf("创建注册HTTP请求失败: %w", err)
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "XUGOU-Agent/1.0")

	// 发送请求
	resp, err := r.client.Do(req)
	if err != nil {
		return fmt.Errorf("发送注册HTTP请求失败: %w", err)
	}
	defer resp.Body.Close()

	// 检查是否收到"客户端已存在"的响应
	if resp.StatusCode == 400 {
		var errorResponse RegisterResponse
		decoder := json.NewDecoder(resp.Body)
		if err := decoder.Decode(&errorResponse); err != nil {
			return fmt.Errorf("解析错误响应失败: %w", err)
		}

		if errorResponse.Message == "客户端已存在" {
			fmt.Printf("客户端已存在，将直接更新状态，token: %s\n", r.apiToken)
			r.registered = true
			return nil
		}

		return fmt.Errorf("注册失败: %s", errorResponse.Message)
	}

	// 检查其他错误状态码
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("服务器返回错误状态码: %d", resp.StatusCode)
	}

	// 解析响应
	var response RegisterResponse
	decoder := json.NewDecoder(resp.Body)
	if err := decoder.Decode(&response); err != nil {
		return fmt.Errorf("解析注册响应失败: %w", err)
	}

	if !response.Success {
		return fmt.Errorf("注册失败: %s", response.Message)
	}

	// 根据响应消息区分是新注册还是状态更新
	if response.Message == "客户端状态更新成功" {
		fmt.Printf("客户端状态更新成功，通过Token: %s\n", r.apiToken)
	} else {
		fmt.Printf("客户端注册成功，通过Token: %s\n", r.apiToken)
	}

	r.registered = true
	return nil
}

// reportStatus 将系统信息上报到服务器，不检查注册状态
func (r *HTTPReporter) reportStatus(ctx context.Context, info *collector.SystemInfo) error {
	// 提取所有磁盘的总容量和使用量
	var diskTotal, diskUsed uint64
	for _, disk := range info.DiskInfo {
		diskTotal += disk.Total
		diskUsed += disk.Used
	}

	// 提取网络传输数据（简单汇总所有网络接口）
	var currentNetworkRX, currentNetworkTX uint64
	for _, net := range info.NetworkInfo {
		currentNetworkRX += net.BytesRecv
		currentNetworkTX += net.BytesSent
	}

	// 计算网络流量速率（KB/s）
	now := time.Now()
	var networkRXRate, networkTXRate float64

	if !r.lastUpdateTime.IsZero() {
		timeDiff := now.Sub(r.lastUpdateTime).Seconds()
		if timeDiff > 0 {
			networkRXRate = float64(currentNetworkRX-r.lastNetworkRX) / timeDiff / 1024 // 转换为KB/s
			networkTXRate = float64(currentNetworkTX-r.lastNetworkTX) / timeDiff / 1024 // 转换为KB/s
		}
	}

	// 更新历史数据
	r.lastNetworkRX = currentNetworkRX
	r.lastNetworkTX = currentNetworkTX
	r.lastUpdateTime = now

	// 构建上报的数据结构
	payload := StatusPayload{
		Token:       r.apiToken,
		CPUUsage:    info.CPUInfo.Usage,
		MemoryTotal: info.MemoryInfo.Total / 1024, // 转换为 KB
		MemoryUsed:  info.MemoryInfo.Used / 1024,  // 转换为 KB
		DiskTotal:   diskTotal / 1024,             // 转换为 KB
		DiskUsed:    diskUsed / 1024,              // 转换为 KB
		NetworkRX:   uint64(networkRXRate),        // 网络接收速率（KB/s）
		NetworkTX:   uint64(networkTXRate),        // 网络发送速率（KB/s）
		Hostname:    info.Hostname,                // 添加主机名
		IPAddresses: getLocalIPs(),
		OS:          info.OS,      // 添加操作系统信息
		Version:     info.Version, // 添加操作系统版本
	}

	// 将数据转换为JSON
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("序列化系统信息失败: %w", err)
	}

	// 构建请求URL - 使用新的基于token的API
	url := fmt.Sprintf("%s/api/agents/status", r.serverURL)

	// 创建HTTP请求
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(data))
	if err != nil {
		return fmt.Errorf("创建HTTP请求失败: %w", err)
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "XUGOU-Agent/1.0")

	// 发送请求
	resp, err := r.client.Do(req)
	if err != nil {
		return fmt.Errorf("发送HTTP请求失败: %w", err)
	}
	defer resp.Body.Close()

	// 检查响应状态码
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("服务器返回错误状态码: %d", resp.StatusCode)
	}

	fmt.Printf("成功上报数据到服务器，token: %s, CPU: %.2f%%, 内存: %.2f%%, 硬盘: %.2f%%, 网络下载: %.2f KB/s, 网络上传: %.2f KB/s\n",
		r.apiToken,
		payload.CPUUsage,
		float64(payload.MemoryUsed)/float64(payload.MemoryTotal)*100,
		float64(payload.DiskUsed)/float64(payload.DiskTotal)*100,
		float64(payload.NetworkRX),
		float64(payload.NetworkTX))

	return nil
}

// Report 将系统信息上报到服务器
func (r *HTTPReporter) Report(ctx context.Context, info *collector.SystemInfo) error {
	// 确保客户端已注册
	if err := r.ensureRegistered(ctx, info); err != nil {
		return fmt.Errorf("客户端注册或状态更新失败: %w", err)
	}

	// 如果注册成功但未直接上报状态（通过客户端已存在的分支），则调用上报
	if r.registered {
		return r.reportStatus(ctx, info)
	}

	return nil
}

// getLocalIPs 获取所有本地IPv4地址
func getLocalIPs() []string {
	ips := []string{}
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return append(ips, "unknown")
	}

	for _, addr := range addrs {
		// 检查IP地址类型
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				ips = append(ips, ipnet.IP.String())
			}
		}
	}

	if len(ips) == 0 {
		return append(ips, "unknown")
	}

	return ips
}
