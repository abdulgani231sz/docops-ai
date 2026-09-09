ALTER TABLE `documents` ADD `approved_po` text;--> statement-breakpoint
CREATE UNIQUE INDEX `documents_approved_po_unique` ON `documents` (`approved_po`);