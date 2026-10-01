CREATE TABLE `habit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`habitId` int NOT NULL,
	`userId` int NOT NULL,
	`loggedAt` date NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `habit_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `habit_logs_habit_date_unique` UNIQUE(`habitId`,`loggedAt`)
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('reading','gym','sleep','custom') NOT NULL DEFAULT 'custom',
	`name` varchar(120) NOT NULL,
	`icon` varchar(32) NOT NULL DEFAULT 'target',
	`frequencyType` enum('daily','weekly_count','specific_weekdays') NOT NULL DEFAULT 'daily',
	`targetValue` decimal(10,2) NOT NULL DEFAULT '1',
	`unit` varchar(32) NOT NULL DEFAULT 'times',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `habits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`timezone` varchar(64) NOT NULL DEFAULT 'UTC',
	`readingGoalMinutes` int NOT NULL DEFAULT 20,
	`gymWeeklyTarget` int NOT NULL DEFAULT 4,
	`sleepGoalHours` decimal(4,2) NOT NULL DEFAULT '8.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `strava_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceScreenshotUrl` text,
	`distanceKm` decimal(8,2),
	`durationSeconds` int,
	`pace` varchar(32),
	`activityDate` date NOT NULL,
	`verified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `strava_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekStart` date NOT NULL,
	`content` text NOT NULL,
	`actionableSuggestion` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weekly_insights_id` PRIMARY KEY(`id`),
	CONSTRAINT `weekly_insights_user_week_unique` UNIQUE(`userId`,`weekStart`)
);
--> statement-breakpoint
ALTER TABLE `habit_logs` ADD CONSTRAINT `habit_logs_habitId_habits_id_fk` FOREIGN KEY (`habitId`) REFERENCES `habits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `habit_logs` ADD CONSTRAINT `habit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `habits` ADD CONSTRAINT `habits_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `strava_activities` ADD CONSTRAINT `strava_activities_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `weekly_insights` ADD CONSTRAINT `weekly_insights_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `habit_logs_user_logged_idx` ON `habit_logs` (`userId`,`loggedAt`);--> statement-breakpoint
CREATE INDEX `habits_user_active_idx` ON `habits` (`userId`,`isActive`);--> statement-breakpoint
CREATE INDEX `strava_user_date_idx` ON `strava_activities` (`userId`,`activityDate`);