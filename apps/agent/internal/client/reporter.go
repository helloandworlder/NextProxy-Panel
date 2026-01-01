package client

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/synexim/panel-agent/pkg/types"
)

// ReportTraffic reports traffic data to Panel
func (c *Client) ReportTraffic(ctx context.Context, traffics []types.TrafficReport) error {
	body := map[string]interface{}{
		"traffics": traffics,
	}

	resp, err := c.doRequest(ctx, http.MethodPost, c.apiBasePath+"/agent/traffic", body, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("report traffic failed: %d - %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// ReportStatus reports node status to Panel
func (c *Client) ReportStatus(ctx context.Context, status *types.StatusReport) error {
	resp, err := c.doRequest(ctx, http.MethodPost, c.apiBasePath+"/agent/status", status, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("report status failed: %d - %s", resp.StatusCode, string(body))
	}

	return nil
}

// ReportAlive reports online users to Panel
func (c *Client) ReportAlive(ctx context.Context, users []types.AliveUser) (*types.AliveResponse, error) {
	body := map[string]interface{}{
		"aliveUsers": users,
	}

	resp, err := c.doRequest(ctx, http.MethodPost, c.apiBasePath+"/agent/alive", body, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("report alive failed: %d - %s", resp.StatusCode, string(respBody))
	}

	var result types.AliveResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	return &result, nil
}

// ReportEgressIPs reports egress IPs to Panel
func (c *Client) ReportEgressIPs(ctx context.Context, ips []types.EgressIP) error {
	body := map[string]interface{}{
		"ips": ips,
	}

	resp, err := c.doRequest(ctx, http.MethodPost, c.apiBasePath+"/agent/egress-ips", body, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("report egress ips failed: %d - %s", resp.StatusCode, string(respBody))
	}

	return nil
}
