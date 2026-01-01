package manager

import (
	"context"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/synexim/panel-agent/pkg/types"
)

// configSyncLoop periodically syncs configuration
func (m *Manager) configSyncLoop(ctx context.Context) {
	ticker := time.NewTicker(m.cfg.Interval.ConfigPoll)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-m.stopCh:
			return
		case <-ticker.C:
			if err := m.syncConfig(ctx); err != nil {
				log.Error().Err(err).Msg("Failed to sync config")
				continue
			}
			// Config changes require Xray restart (inbound/outbound/routing structure changes)
			if err := m.generateAndWriteConfig(); err != nil {
				log.Error().Err(err).Msg("Failed to generate config")
				continue
			}
			// IMPORTANT: Collect and report traffic BEFORE restarting Xray
			// Otherwise traffic stats will be lost
			m.flushTrafficBeforeRestart(ctx)
			
			if err := m.process.Restart(ctx); err != nil {
				log.Error().Err(err).Msg("Failed to restart Xray")
			}
		}
	}
}

// flushTrafficBeforeRestart collects and reports traffic before Xray restart
func (m *Manager) flushTrafficBeforeRestart(ctx context.Context) {
	traffics, err := m.grpc.QueryTrafficStats(ctx, true)
	if err != nil {
		log.Debug().Err(err).Msg("Failed to collect traffic before restart")
		return
	}
	if len(traffics) > 0 {
		if err := m.client.ReportTraffic(ctx, traffics); err != nil {
			log.Error().Err(err).Msg("Failed to report traffic before restart")
		} else {
			log.Debug().Int("count", len(traffics)).Msg("Traffic flushed before restart")
		}
	}
}

// userSyncLoop periodically syncs users using hot reload (no restart)
func (m *Manager) userSyncLoop(ctx context.Context) {
	ticker := time.NewTicker(m.cfg.Interval.UserPoll)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-m.stopCh:
			return
		case <-ticker.C:
			oldUsers := m.users
			oldRateLimits := m.rateLimits
			if err := m.syncUsers(ctx); err != nil {
				log.Error().Err(err).Msg("Failed to sync users")
				continue
			}
			
			// Use hot reload via gRPC Handler API instead of restart
			if err := m.hotSyncUsers(ctx, oldUsers, m.users); err != nil {
				log.Warn().Err(err).Msg("Hot sync failed, falling back to restart")
				// Fallback: regenerate config and restart
				if err := m.generateAndWriteConfig(); err != nil {
					log.Error().Err(err).Msg("Failed to generate config")
					continue
				}
				if err := m.process.Restart(ctx); err != nil {
					log.Error().Err(err).Msg("Failed to restart Xray")
				}
			}
			
			// Sync rate limits via gRPC (hot reload, no restart needed)
			if err := m.hotSyncRateLimits(ctx, oldRateLimits, m.rateLimits); err != nil {
				log.Warn().Err(err).Msg("Failed to sync rate limits")
			}
		}
	}
}

// hotSyncUsers synchronizes users via Xray gRPC API without restart
func (m *Manager) hotSyncUsers(ctx context.Context, oldUsers, newUsers []types.UserConfig) error {
	// Build maps for comparison
	oldMap := make(map[string]map[string]bool) // inboundTag -> email -> exists
	newMap := make(map[string]map[string]*types.UserConfig) // inboundTag -> email -> user

	for i := range oldUsers {
		u := &oldUsers[i]
		for _, tag := range u.InboundTags {
			if oldMap[tag] == nil {
				oldMap[tag] = make(map[string]bool)
			}
			oldMap[tag][u.Email] = true
		}
	}

	for i := range newUsers {
		u := &newUsers[i]
		for _, tag := range u.InboundTags {
			if newMap[tag] == nil {
				newMap[tag] = make(map[string]*types.UserConfig)
			}
			newMap[tag][u.Email] = u
		}
	}

	// Process each inbound
	allTags := make(map[string]bool)
	for tag := range oldMap {
		allTags[tag] = true
	}
	for tag := range newMap {
		allTags[tag] = true
	}

	for tag := range allTags {
		oldEmails := oldMap[tag]
		newUserMap := newMap[tag]
		if oldEmails == nil {
			oldEmails = make(map[string]bool)
		}
		if newUserMap == nil {
			newUserMap = make(map[string]*types.UserConfig)
		}

		// Remove users not in new list
		for email := range oldEmails {
			if _, exists := newUserMap[email]; !exists {
				if err := m.grpc.RemoveUser(ctx, tag, email); err != nil {
					log.Debug().Err(err).Str("email", email).Str("inbound", tag).Msg("Failed to remove user")
				}
			}
		}

		// Add users not in old list
		for email, user := range newUserMap {
			if !oldEmails[email] {
				if err := m.grpc.AddUser(ctx, tag, user); err != nil {
					log.Warn().Err(err).Str("email", email).Str("inbound", tag).Msg("Failed to add user")
				}
			}
		}
	}

	// Update tracked emails
	m.mu.Lock()
	m.userEmails = make([]string, 0, len(newUsers))
	for _, u := range newUsers {
		m.userEmails = append(m.userEmails, u.Email)
	}
	m.mu.Unlock()

	return nil
}

// hotSyncRateLimits synchronizes rate limits via Xray gRPC API without restart
func (m *Manager) hotSyncRateLimits(ctx context.Context, oldLimits, newLimits []types.RateLimitConfig) error {
	// Build maps for comparison
	oldMap := make(map[string]types.RateLimitConfig)
	for _, rl := range oldLimits {
		oldMap[rl.Email] = rl
	}
	newMap := make(map[string]types.RateLimitConfig)
	for _, rl := range newLimits {
		newMap[rl.Email] = rl
	}

	// Remove rate limits for users no longer in the list
	for email := range oldMap {
		if _, exists := newMap[email]; !exists {
			if err := m.grpc.RemoveUserRateLimit(ctx, email); err != nil {
				log.Debug().Err(err).Str("email", email).Msg("Failed to remove rate limit")
			}
		}
	}

	// Set/update rate limits for users in the new list
	for email, newRL := range newMap {
		oldRL, exists := oldMap[email]
		// Set if new or changed
		if !exists || oldRL.UploadBytesPerSec != newRL.UploadBytesPerSec || oldRL.DownloadBytesPerSec != newRL.DownloadBytesPerSec {
			if err := m.grpc.SetUserRateLimit(ctx, email, newRL.UploadBytesPerSec, newRL.DownloadBytesPerSec); err != nil {
				log.Warn().Err(err).Str("email", email).Msg("Failed to set rate limit")
			}
		}
	}

	log.Debug().Int("count", len(newLimits)).Msg("Rate limits synced")
	return nil
}

// trafficReportLoop periodically reports traffic
func (m *Manager) trafficReportLoop(ctx context.Context) {
	ticker := time.NewTicker(m.cfg.Interval.TrafficReport)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-m.stopCh:
			return
		case <-ticker.C:
			// Collect traffic from Xray Stats API (with reset to avoid double counting)
			traffics, err := m.grpc.QueryTrafficStats(ctx, true)
			if err != nil {
				log.Debug().Err(err).Msg("Failed to collect traffic from Xray")
				continue
			}
			if len(traffics) > 0 {
				if err := m.client.ReportTraffic(ctx, traffics); err != nil {
					log.Error().Err(err).Msg("Failed to report traffic")
				} else {
					log.Debug().Int("count", len(traffics)).Msg("Traffic reported")
				}
			}
		}
	}
}

// statusReportLoop periodically reports status
func (m *Manager) statusReportLoop(ctx context.Context) {
	ticker := time.NewTicker(m.cfg.Interval.StatusReport)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-m.stopCh:
			return
		case <-ticker.C:
			status := m.stats.CollectStatus(m.process.GetVersion())
			
			// Get online user count from tracked emails
			m.mu.RLock()
			onlineCount := 0
			for _, email := range m.userEmails {
				count, err := m.grpc.GetUserOnlineCount(ctx, email)
				if err == nil && count > 0 {
					onlineCount++
				}
			}
			m.mu.RUnlock()
			status.OnlineUsers = onlineCount
			
			if err := m.client.ReportStatus(ctx, status); err != nil {
				log.Error().Err(err).Msg("Failed to report status")
			}
		}
	}
}

// aliveReportLoop periodically reports online users for device limit enforcement
func (m *Manager) aliveReportLoop(ctx context.Context) {
	ticker := time.NewTicker(m.cfg.Interval.AlivePoll)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-m.stopCh:
			return
		case <-ticker.C:
			// Collect online users from Xray Stats API
			m.mu.RLock()
			emails := make([]string, len(m.userEmails))
			copy(emails, m.userEmails)
			m.mu.RUnlock()

			aliveUsers, err := m.grpc.GetAllOnlineUsers(ctx, emails)
			if err != nil {
				log.Debug().Err(err).Msg("Failed to collect online users")
				continue
			}

			// Report to Panel
			resp, err := m.client.ReportAlive(ctx, aliveUsers)
			if err != nil {
				log.Error().Err(err).Msg("Failed to report alive")
				continue
			}

			// Kick users that exceed device limit
			if len(resp.KickUsers) > 0 {
				log.Info().Strs("users", resp.KickUsers).Msg("Kicking users exceeding device limit")
				m.mu.RLock()
				inboundTags := m.getInboundTags()
				m.mu.RUnlock()
				
				for _, email := range resp.KickUsers {
					if err := m.grpc.KickUser(ctx, email, inboundTags); err != nil {
						log.Warn().Err(err).Str("email", email).Msg("Failed to kick user")
					}
				}
			}
		}
	}
}

// getInboundTags returns all inbound tags from current config
func (m *Manager) getInboundTags() []string {
	if m.nodeConfig == nil {
		return nil
	}
	tags := make([]string, 0, len(m.nodeConfig.Inbounds))
	for _, inb := range m.nodeConfig.Inbounds {
		tags = append(tags, inb.Tag)
	}
	return tags
}
