package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/synexim/panel-agent/internal/config"
	"github.com/synexim/panel-agent/pkg/types"
)

// Client represents the Panel API client
type Client struct {
	baseURL     string
	apiBasePath string
	nodeToken   string
	httpClient  *http.Client
	retryCount  int

	// ETag cache
	configETag string
	usersETag  string
}

// New creates a new Panel API client (Wire provider)
func New(cfg *config.Config) *Client {
	return &Client{
		baseURL:     cfg.Panel.URL,
		apiBasePath: cfg.Panel.APIPrefix,
		nodeToken:   cfg.Panel.Token,
		httpClient: &http.Client{
			Timeout: cfg.HTTP.Timeout,
		},
		retryCount: cfg.HTTP.RetryCount,
	}
}

// doRequest performs HTTP request with retry logic
func (c *Client) doRequest(ctx context.Context, method, path string, body interface{}, headers map[string]string) (*http.Response, error) {
	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal body: %w", err)
		}
		bodyReader = bytes.NewReader(data)
	}

	var lastErr error
	for i := 0; i <= c.retryCount; i++ {
		if i > 0 {
			time.Sleep(time.Duration(i) * time.Second)
			log.Debug().Int("attempt", i+1).Str("path", path).Msg("Retrying request")
		}

		req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bodyReader)
		if err != nil {
			return nil, fmt.Errorf("create request: %w", err)
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Node-Token", c.nodeToken)
		for k, v := range headers {
			req.Header.Set(k, v)
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}

		if resp.StatusCode >= 500 {
			resp.Body.Close()
			lastErr = fmt.Errorf("server error: %d", resp.StatusCode)
			continue
		}

		return resp, nil
	}

	return nil, fmt.Errorf("request failed after %d retries: %w", c.retryCount, lastErr)
}

// Register registers the node with Panel
func (c *Client) Register(ctx context.Context, req *types.RegisterRequest) (*types.RegisterResponse, error) {
	resp, err := c.doRequest(ctx, http.MethodPost, c.apiBasePath+"/agent/register", req, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("register failed: %d - %s", resp.StatusCode, string(body))
	}

	var result types.RegisterResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}

// GetConfig fetches node configuration from Panel
func (c *Client) GetConfig(ctx context.Context) (*types.NodeConfig, bool, error) {
	headers := make(map[string]string)
	if c.configETag != "" {
		headers["If-None-Match"] = c.configETag
	}

	resp, err := c.doRequest(ctx, http.MethodGet, c.apiBasePath+"/agent/config", nil, headers)
	if err != nil {
		return nil, false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotModified {
		return nil, false, nil // No changes
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, false, fmt.Errorf("get config failed: %d - %s", resp.StatusCode, string(body))
	}

	// Panel returns {"config": {...}, "etag": "..."}
	var wrapper struct {
		Config types.NodeConfig `json:"config"`
		ETag   string           `json:"etag"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&wrapper); err != nil {
		return nil, false, fmt.Errorf("decode response: %w", err)
	}

	wrapper.Config.ETag = wrapper.ETag
	c.configETag = wrapper.ETag
	return &wrapper.Config, true, nil
}

// GetUsers fetches user list from Panel
func (c *Client) GetUsers(ctx context.Context) (*types.UserListResponse, bool, error) {
	headers := make(map[string]string)
	if c.usersETag != "" {
		headers["If-None-Match"] = c.usersETag
	}

	resp, err := c.doRequest(ctx, http.MethodGet, c.apiBasePath+"/agent/users", nil, headers)
	if err != nil {
		return nil, false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotModified {
		return nil, false, nil
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, false, fmt.Errorf("get users failed: %d - %s", resp.StatusCode, string(body))
	}

	var result types.UserListResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, false, fmt.Errorf("decode response: %w", err)
	}

	c.usersETag = result.ETag
	return &result, true, nil
}
