CREATE TABLE `calendar_event_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`filename` varchar(255) NOT NULL,
	`original_filename` varchar(255) NOT NULL,
	`url` varchar(1000) NOT NULL,
	`file_size` int NOT NULL,
	`mime_type` varchar(100) NOT NULL,
	`uploaded_by` int NOT NULL,
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendar_event_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_event_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`change_type` enum('CREATED','UPDATED','DELETED','RESCHEDULED','CANCELLED','COMPLETED') NOT NULL,
	`changed_by` int NOT NULL,
	`changed_at` timestamp NOT NULL DEFAULT (now()),
	`field_changed` varchar(100),
	`previous_value` text,
	`new_value` text,
	`change_reason` text,
	`full_snapshot` json,
	CONSTRAINT `calendar_event_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_event_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`user_id` int NOT NULL,
	`role` enum('ORGANIZER','REQUIRED','OPTIONAL','OBSERVER') NOT NULL DEFAULT 'REQUIRED',
	`response_status` enum('PENDING','ACCEPTED','DECLINED','TENTATIVE') NOT NULL DEFAULT 'PENDING',
	`responded_at` timestamp,
	`notify_on_creation` boolean NOT NULL DEFAULT true,
	`notify_on_update` boolean NOT NULL DEFAULT true,
	`added_by` int NOT NULL,
	`added_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendar_event_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_participant_event_user` UNIQUE(`event_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_event_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`grant_type` enum('USER','ROLE','TEAM') NOT NULL,
	`grantee_id` int NOT NULL,
	`permission` enum('VIEW','EDIT','DELETE','MANAGE') NOT NULL,
	`granted_by` int NOT NULL,
	`granted_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendar_event_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`location` varchar(500),
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`start_time` varchar(8),
	`end_time` varchar(8),
	`timezone` varchar(50),
	`is_floating_time` boolean NOT NULL DEFAULT false,
	`module` enum('INVENTORY','ACCOUNTING','CLIENTS','VENDORS','ORDERS','SAMPLES','COMPLIANCE','GENERAL') NOT NULL,
	`event_type` enum('MEETING','DEADLINE','TASK','DELIVERY','PAYMENT_DUE','FOLLOW_UP','AUDIT','INTAKE','PHOTOGRAPHY','BATCH_EXPIRATION','RECURRING_ORDER','SAMPLE_REQUEST','OTHER') NOT NULL,
	`status` enum('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
	`priority` enum('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
	`is_recurring` boolean NOT NULL DEFAULT false,
	`entity_type` varchar(50),
	`entity_id` int,
	`created_by` int NOT NULL,
	`assigned_to` int,
	`visibility` enum('PRIVATE','TEAM','COMPANY','PUBLIC') NOT NULL DEFAULT 'COMPANY',
	`is_auto_generated` boolean NOT NULL DEFAULT false,
	`auto_generation_rule` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_recurrence_instances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parent_event_id` int NOT NULL,
	`instance_date` date NOT NULL,
	`start_time` varchar(8),
	`end_time` varchar(8),
	`timezone` varchar(50),
	`status` enum('GENERATED','MODIFIED','CANCELLED') NOT NULL DEFAULT 'GENERATED',
	`modified_title` varchar(255),
	`modified_description` text,
	`modified_location` varchar(500),
	`modified_assigned_to` int,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	`modified_at` timestamp,
	`modified_by` int,
	CONSTRAINT `calendar_recurrence_instances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_recurrence_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`frequency` enum('DAILY','WEEKLY','MONTHLY','YEARLY') NOT NULL,
	`interval` int NOT NULL DEFAULT 1,
	`by_day` json,
	`by_month_day` json,
	`by_week_of_month` json,
	`by_day_of_week_in_month` json,
	`by_month` json,
	`start_date` date NOT NULL,
	`end_date` date,
	`count` int,
	`exception_dates` json DEFAULT ('[]'),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_recurrence_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `calendar_recurrence_rules_event_id_unique` UNIQUE(`event_id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_id` int NOT NULL,
	`user_id` int NOT NULL,
	`reminder_time` timestamp NOT NULL,
	`relative_minutes` int,
	`method` enum('IN_APP','EMAIL','BOTH') NOT NULL DEFAULT 'IN_APP',
	`status` enum('PENDING','SENT','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
	`sent_at` timestamp,
	`failure_reason` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendar_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`is_default` boolean NOT NULL DEFAULT false,
	`filters` json NOT NULL,
	`default_view_type` enum('MONTH','WEEK','DAY','AGENDA') NOT NULL DEFAULT 'MONTH',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_meeting_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`calendar_event_id` int NOT NULL,
	`meeting_date` timestamp NOT NULL,
	`meeting_type` varchar(100) NOT NULL,
	`attendees` json,
	`outcome` varchar(50) NOT NULL,
	`notes` text,
	`action_items` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_meeting_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comment_mentions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`comment_id` int NOT NULL,
	`mentioned_user_id` int NOT NULL,
	`mentioned_by_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comment_mentions_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_mention` UNIQUE(`comment_id`,`mentioned_user_id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commentable_type` varchar(50) NOT NULL,
	`commentable_id` int NOT NULL,
	`user_id` int NOT NULL,
	`content` text NOT NULL,
	`is_resolved` boolean NOT NULL DEFAULT false,
	`resolved_at` timestamp,
	`resolved_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inbox_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`source_type` enum('mention','task_assignment','task_update') NOT NULL,
	`source_id` int NOT NULL,
	`reference_type` varchar(50) NOT NULL,
	`reference_id` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status` enum('unread','seen','completed') NOT NULL DEFAULT 'unread',
	`seen_at` timestamp,
	`completed_at` timestamp,
	`is_archived` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inbox_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`action` varchar(50) NOT NULL,
	`changes` json,
	`user_id` int,
	`reason` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`batch_id` int NOT NULL,
	`product_display_name` varchar(255),
	`quantity` decimal(10,2) NOT NULL,
	`cogs_per_unit` decimal(10,2) NOT NULL,
	`original_cogs_per_unit` decimal(10,2) NOT NULL,
	`is_cogs_overridden` boolean NOT NULL DEFAULT false,
	`cogs_override_reason` text,
	`margin_percent` decimal(5,2) NOT NULL,
	`margin_dollar` decimal(10,2) NOT NULL,
	`is_margin_overridden` boolean NOT NULL DEFAULT false,
	`margin_source` enum('CUSTOMER_PROFILE','DEFAULT','MANUAL') NOT NULL,
	`unit_price` decimal(10,2) NOT NULL,
	`line_total` decimal(10,2) NOT NULL,
	`is_sample` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricing_defaults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_category` varchar(100) NOT NULL,
	`default_margin_percent` decimal(5,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricing_defaults_id` PRIMARY KEY(`id`),
	CONSTRAINT `pricing_defaults_product_category_unique` UNIQUE(`product_category`)
);
--> statement-breakpoint
CREATE TABLE `sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`prefix` varchar(20) NOT NULL,
	`currentValue` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sequences_id` PRIMARY KEY(`id`),
	CONSTRAINT `sequences_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `todo_list_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`list_id` int NOT NULL,
	`user_id` int NOT NULL,
	`role` enum('owner','editor','viewer') NOT NULL DEFAULT 'editor',
	`added_at` timestamp NOT NULL DEFAULT (now()),
	`added_by` int NOT NULL,
	CONSTRAINT `todo_list_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_list_member` UNIQUE(`list_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `todo_lists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`owner_id` int NOT NULL,
	`is_shared` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `todo_lists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `todo_task_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`user_id` int NOT NULL,
	`action` enum('created','updated','status_changed','assigned','completed','deleted') NOT NULL,
	`field_changed` varchar(100),
	`old_value` text,
	`new_value` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `todo_task_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `todo_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`list_id` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`status` enum('todo','in_progress','done') NOT NULL DEFAULT 'todo',
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`due_date` timestamp,
	`assigned_to` int,
	`created_by` int NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`is_completed` boolean NOT NULL DEFAULT false,
	`completed_at` timestamp,
	`completed_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `todo_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vip_portal_auth` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`password_hash` varchar(255),
	`google_id` varchar(255),
	`microsoft_id` varchar(255),
	`session_token` varchar(255),
	`session_expires_at` timestamp,
	`reset_token` varchar(255),
	`reset_token_expires_at` timestamp,
	`last_login_at` timestamp,
	`login_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vip_portal_auth_id` PRIMARY KEY(`id`),
	CONSTRAINT `vip_portal_auth_client_id_unique` UNIQUE(`client_id`),
	CONSTRAINT `vip_portal_auth_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `vip_portal_configurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`module_dashboard_enabled` boolean NOT NULL DEFAULT true,
	`module_ar_enabled` boolean NOT NULL DEFAULT true,
	`module_ap_enabled` boolean NOT NULL DEFAULT true,
	`module_transaction_history_enabled` boolean NOT NULL DEFAULT true,
	`module_vip_tier_enabled` boolean NOT NULL DEFAULT true,
	`module_credit_center_enabled` boolean NOT NULL DEFAULT true,
	`module_marketplace_needs_enabled` boolean NOT NULL DEFAULT true,
	`module_marketplace_supply_enabled` boolean NOT NULL DEFAULT true,
	`module_leaderboard_enabled` boolean NOT NULL DEFAULT false,
	`features_config` json,
	`leaderboard_type` varchar(50) DEFAULT 'ytd_spend',
	`leaderboard_display_mode` varchar(20) DEFAULT 'blackbox',
	`leaderboard_show_suggestions` boolean DEFAULT true,
	`leaderboard_minimum_clients` int DEFAULT 5,
	`advanced_options` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vip_portal_configurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `vip_portal_configurations_client_id_unique` UNIQUE(`client_id`)
);
--> statement-breakpoint
ALTER TABLE `userDashboardPreferences` DROP FOREIGN KEY `userDashboardPreferences_userId_users_id_fk`;--> statement-breakpoint
DROP INDEX `idx_user_dashboard_prefs_user_widget` ON `userDashboardPreferences`;--> statement-breakpoint
ALTER TABLE `userDashboardPreferences` ADD CONSTRAINT `userDashboardPreferences_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_needs` ADD `product_name` varchar(255);--> statement-breakpoint
ALTER TABLE `client_needs` ADD `strainId` int;--> statement-breakpoint
ALTER TABLE `client_needs` ADD `strain_type` enum('INDICA','SATIVA','HYBRID','CBD','ANY');--> statement-breakpoint
ALTER TABLE `clients` ADD `vip_portal_enabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `clients` ADD `vip_portal_last_login` timestamp;--> statement-breakpoint
ALTER TABLE `strains` ADD `openthcId` varchar(255);--> statement-breakpoint
ALTER TABLE `strains` ADD `openthcStub` varchar(255);--> statement-breakpoint
ALTER TABLE `strains` ADD `parentStrainId` int;--> statement-breakpoint
ALTER TABLE `strains` ADD `baseStrainName` varchar(255);--> statement-breakpoint
ALTER TABLE `userDashboardPreferences` ADD `activeLayout` varchar(50) DEFAULT 'operations' NOT NULL;--> statement-breakpoint
ALTER TABLE `userDashboardPreferences` ADD `widgetConfig` json NOT NULL;--> statement-breakpoint
ALTER TABLE `vendor_supply` ADD `product_name` varchar(255);--> statement-breakpoint
ALTER TABLE `vendor_supply` ADD `strain_type` enum('INDICA','SATIVA','HYBRID','CBD');--> statement-breakpoint
ALTER TABLE `userDashboardPreferences` ADD CONSTRAINT `userDashboardPreferences_userId_unique` UNIQUE(`userId`);--> statement-breakpoint
ALTER TABLE `calendar_event_attachments` ADD CONSTRAINT `calendar_event_attachments_event_id_calendar_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_event_attachments` ADD CONSTRAINT `calendar_event_attachments_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_event_history` ADD CONSTRAINT `calendar_event_history_event_id_calendar_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_event_history` ADD CONSTRAINT `calendar_event_history_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_event_participants` ADD CONSTRAINT `calendar_event_participants_event_id_calendar_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_event_participants` ADD CONSTRAINT `calendar_event_participants_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_event_participants` ADD CONSTRAINT `calendar_event_participants_added_by_users_id_fk` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_event_permissions` ADD CONSTRAINT `calendar_event_permissions_event_id_calendar_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_event_permissions` ADD CONSTRAINT `calendar_event_permissions_granted_by_users_id_fk` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_recurrence_instances` ADD CONSTRAINT `cal_recur_inst_parent_event_id_fk` FOREIGN KEY (`parent_event_id`) REFERENCES `calendar_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_recurrence_instances` ADD CONSTRAINT `calendar_recurrence_instances_modified_assigned_to_users_id_fk` FOREIGN KEY (`modified_assigned_to`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_recurrence_instances` ADD CONSTRAINT `calendar_recurrence_instances_modified_by_users_id_fk` FOREIGN KEY (`modified_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_recurrence_rules` ADD CONSTRAINT `calendar_recurrence_rules_event_id_calendar_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_reminders` ADD CONSTRAINT `calendar_reminders_event_id_calendar_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `calendar_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_reminders` ADD CONSTRAINT `calendar_reminders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_views` ADD CONSTRAINT `calendar_views_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_meeting_history` ADD CONSTRAINT `client_meeting_history_calendar_event_id_calendar_events_id_fk` FOREIGN KEY (`calendar_event_id`) REFERENCES `calendar_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment_mentions` ADD CONSTRAINT `comment_mentions_comment_id_comments_id_fk` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment_mentions` ADD CONSTRAINT `comment_mentions_mentioned_user_id_users_id_fk` FOREIGN KEY (`mentioned_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comment_mentions` ADD CONSTRAINT `comment_mentions_mentioned_by_user_id_users_id_fk` FOREIGN KEY (`mentioned_by_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_resolved_by_users_id_fk` FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inbox_items` ADD CONSTRAINT `inbox_items_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `todo_list_members` ADD CONSTRAINT `todo_list_members_list_id_todo_lists_id_fk` FOREIGN KEY (`list_id`) REFERENCES `todo_lists`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `todo_list_members` ADD CONSTRAINT `todo_list_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `todo_list_members` ADD CONSTRAINT `todo_list_members_added_by_users_id_fk` FOREIGN KEY (`added_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `todo_lists` ADD CONSTRAINT `todo_lists_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `todo_task_activity` ADD CONSTRAINT `todo_task_activity_task_id_todo_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `todo_tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `todo_task_activity` ADD CONSTRAINT `todo_task_activity_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `todo_tasks` ADD CONSTRAINT `todo_tasks_list_id_todo_lists_id_fk` FOREIGN KEY (`list_id`) REFERENCES `todo_lists`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `todo_tasks` ADD CONSTRAINT `todo_tasks_assigned_to_users_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `todo_tasks` ADD CONSTRAINT `todo_tasks_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `todo_tasks` ADD CONSTRAINT `todo_tasks_completed_by_users_id_fk` FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vip_portal_auth` ADD CONSTRAINT `vip_portal_auth_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vip_portal_configurations` ADD CONSTRAINT `vip_portal_configurations_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_attachment_event` ON `calendar_event_attachments` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_history_event` ON `calendar_event_history` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_history_changed_at` ON `calendar_event_history` (`changed_at`);--> statement-breakpoint
CREATE INDEX `idx_participant_user` ON `calendar_event_participants` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_permission_event_grantee` ON `calendar_event_permissions` (`event_id`,`grant_type`,`grantee_id`);--> statement-breakpoint
CREATE INDEX `idx_calendar_date_range` ON `calendar_events` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `idx_calendar_module` ON `calendar_events` (`module`);--> statement-breakpoint
CREATE INDEX `idx_calendar_entity` ON `calendar_events` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_calendar_assigned` ON `calendar_events` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `idx_calendar_status` ON `calendar_events` (`status`);--> statement-breakpoint
CREATE INDEX `idx_calendar_created_by` ON `calendar_events` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_instance_parent_date` ON `calendar_recurrence_instances` (`parent_event_id`,`instance_date`);--> statement-breakpoint
CREATE INDEX `idx_instance_date_range` ON `calendar_recurrence_instances` (`instance_date`,`start_time`);--> statement-breakpoint
CREATE INDEX `idx_instance_status` ON `calendar_recurrence_instances` (`status`);--> statement-breakpoint
CREATE INDEX `idx_recurrence_event` ON `calendar_recurrence_rules` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_reminder_time` ON `calendar_reminders` (`reminder_time`,`status`);--> statement-breakpoint
CREATE INDEX `idx_reminder_event` ON `calendar_reminders` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_reminder_user` ON `calendar_reminders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_view_user` ON `calendar_views` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_view_user_default` ON `calendar_views` (`user_id`,`is_default`);--> statement-breakpoint
CREATE INDEX `idx_meeting_history_client` ON `client_meeting_history` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_meeting_history_event` ON `client_meeting_history` (`calendar_event_id`);--> statement-breakpoint
CREATE INDEX `idx_meeting_history_date` ON `client_meeting_history` (`meeting_date`);--> statement-breakpoint
CREATE INDEX `idx_mentioned_user_id` ON `comment_mentions` (`mentioned_user_id`);--> statement-breakpoint
CREATE INDEX `idx_comment_id` ON `comment_mentions` (`comment_id`);--> statement-breakpoint
CREATE INDEX `idx_commentable` ON `comments` (`commentable_type`,`commentable_id`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `comments` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_is_resolved` ON `comments` (`is_resolved`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `comments` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `inbox_items` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `inbox_items` (`status`);--> statement-breakpoint
CREATE INDEX `idx_source` ON `inbox_items` (`source_type`,`source_id`);--> statement-breakpoint
CREATE INDEX `idx_reference` ON `inbox_items` (`reference_type`,`reference_id`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `inbox_items` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_is_archived` ON `inbox_items` (`is_archived`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `order_audit_log` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_timestamp` ON `order_audit_log` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `order_line_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_batch_id` ON `order_line_items` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_product_category` ON `pricing_defaults` (`product_category`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `todo_list_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_list_id` ON `todo_list_members` (`list_id`);--> statement-breakpoint
CREATE INDEX `idx_owner_id` ON `todo_lists` (`owner_id`);--> statement-breakpoint
CREATE INDEX `idx_is_shared` ON `todo_lists` (`is_shared`);--> statement-breakpoint
CREATE INDEX `idx_task_id` ON `todo_task_activity` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `todo_task_activity` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `todo_task_activity` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_list_id` ON `todo_tasks` (`list_id`);--> statement-breakpoint
CREATE INDEX `idx_assigned_to` ON `todo_tasks` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `todo_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_due_date` ON `todo_tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_created_by` ON `todo_tasks` (`created_by`);--> statement-breakpoint
CREATE INDEX `idx_vip_portal_email` ON `vip_portal_auth` (`email`);--> statement-breakpoint
CREATE INDEX `idx_vip_portal_session_token` ON `vip_portal_auth` (`session_token`);--> statement-breakpoint
CREATE INDEX `idx_vip_portal_client_id` ON `vip_portal_configurations` (`client_id`);--> statement-breakpoint
ALTER TABLE `client_needs` ADD CONSTRAINT `client_needs_strainId_strains_id_fk` FOREIGN KEY (`strainId`) REFERENCES `strains`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_product_name_cn` ON `client_needs` (`product_name`);--> statement-breakpoint
CREATE INDEX `idx_product_name_vs` ON `vendor_supply` (`product_name`);--> statement-breakpoint
ALTER TABLE `userDashboardPreferences` DROP COLUMN `widgetId`;--> statement-breakpoint
ALTER TABLE `userDashboardPreferences` DROP COLUMN `isVisible`;--> statement-breakpoint
ALTER TABLE `userDashboardPreferences` DROP COLUMN `sortOrder`;--> statement-breakpoint
ALTER TABLE `userDashboardPreferences` DROP COLUMN `config`;