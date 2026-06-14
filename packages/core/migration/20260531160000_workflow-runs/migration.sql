CREATE TABLE `workflow_run` (
	`id` text PRIMARY KEY,
	`session_id` text,
	`workflow` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`current_phase` text,
	`args` text,
	`definition` text,
	`logs` text NOT NULL,
	`agents` text NOT NULL,
	`result` text,
	`error` text,
	`time_created` integer NOT NULL,
	`time_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workflow_run_started_at_idx` ON `workflow_run` (`started_at`);--> statement-breakpoint
CREATE INDEX `workflow_run_status_started_at_idx` ON `workflow_run` (`status`,`started_at`);
