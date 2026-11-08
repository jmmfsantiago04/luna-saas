ALTER TABLE "clients" ADD COLUMN "document" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "birth_date" date;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "address_street" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "address_city" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "address_state" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "address_zip" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "instagram" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "tags" text[] DEFAULT '{}'::text[] NOT NULL;