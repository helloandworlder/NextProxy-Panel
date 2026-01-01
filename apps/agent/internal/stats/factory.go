package stats

import (
	"fmt"

	"github.com/synexim/panel-agent/pkg/types"
)

// NewCollector creates a stats collector based on core type
func NewCollector(coreType types.CoreType, apiAddr string) (Collector, error) {
	switch coreType {
	case types.CoreTypeXray:
		return NewXrayCollector(apiAddr), nil
	case types.CoreTypeSingbox:
		// TODO: Implement singbox collector when needed
		return nil, fmt.Errorf("singbox collector not yet implemented")
	default:
		return nil, fmt.Errorf("unsupported core type: %s", coreType)
	}
}
