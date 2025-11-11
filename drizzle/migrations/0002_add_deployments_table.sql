-- Migration: Add deployments table for deployment monitoring
-- Created: 2025-11-10

CREATE TABLE IF NOT EXISTS deployments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Git information
  commitSha VARCHAR(40) NOT NULL,
  commitMessage TEXT NOT NULL,
  commitTimestamp TIMESTAMP NOT NULL,
  branch VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  pusher VARCHAR(255) NOT NULL,
  
  -- Deployment status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  startedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completedAt TIMESTAMP NULL,
  duration INT NULL COMMENT 'Duration in seconds',
  
  -- DigitalOcean information
  doDeploymentId VARCHAR(255) NULL,
  buildLogs TEXT NULL,
  deploymentUrl VARCHAR(500) NULL,
  errorMessage TEXT NULL,
  
  -- Metadata
  githubDeliveryId VARCHAR(255) NULL,
  webhookPayload JSON NULL,
  
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX idx_deployments_status (status),
  INDEX idx_deployments_branch (branch),
  INDEX idx_deployments_created_at (createdAt DESC),
  INDEX idx_deployments_commit_sha (commitSha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
