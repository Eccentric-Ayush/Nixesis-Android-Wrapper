CREATE TABLE `alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('friend_request','friend_accepted','event_invite','event_joined','event_update','competition_result','system') NOT NULL DEFAULT 'system',
	`title` varchar(160) NOT NULL,
	`message` text NOT NULL,
	`link` varchar(255),
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `event_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `event_participants_event_user_unique` UNIQUE(`eventId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizerId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`eventType` enum('competition','group_goal','meetup') NOT NULL DEFAULT 'competition',
	`metric` enum('reading_minutes','gym_sessions','sleep_hours','habit_completions') NOT NULL DEFAULT 'habit_completions',
	`startDate` date NOT NULL,
	`endDate` date NOT NULL,
	`goalValue` decimal(10,2),
	`status` enum('upcoming','active','completed','cancelled') NOT NULL DEFAULT 'upcoming',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`addresseeId` int NOT NULL,
	`status` enum('pending','accepted','declined') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `friendships_id` PRIMARY KEY(`id`),
	CONSTRAINT `friendships_pair_unique` UNIQUE(`requesterId`,`addresseeId`)
);
--> statement-breakpoint
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_participants` ADD CONSTRAINT `event_participants_eventId_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `event_participants` ADD CONSTRAINT `event_participants_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `events` ADD CONSTRAINT `events_organizerId_users_id_fk` FOREIGN KEY (`organizerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `friendships` ADD CONSTRAINT `friendships_requesterId_users_id_fk` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `friendships` ADD CONSTRAINT `friendships_addresseeId_users_id_fk` FOREIGN KEY (`addresseeId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `alerts_user_read_idx` ON `alerts` (`userId`,`isRead`,`createdAt`);--> statement-breakpoint
CREATE INDEX `event_participants_event_idx` ON `event_participants` (`eventId`);--> statement-breakpoint
CREATE INDEX `events_organizer_idx` ON `events` (`organizerId`,`status`);--> statement-breakpoint
CREATE INDEX `events_dates_idx` ON `events` (`startDate`,`endDate`);--> statement-breakpoint
CREATE INDEX `friendships_requester_idx` ON `friendships` (`requesterId`,`status`);--> statement-breakpoint
CREATE INDEX `friendships_addressee_idx` ON `friendships` (`addresseeId`,`status`);