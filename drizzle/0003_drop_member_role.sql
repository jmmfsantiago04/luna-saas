ALTER TABLE "organization_invites" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "organization_members" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "organization_invites" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "organization_members" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
UPDATE "organization_invites" SET "role" = 'admin' WHERE "role" = 'member';--> statement-breakpoint
UPDATE "organization_members" SET "role" = 'admin' WHERE "role" = 'member';--> statement-breakpoint
DROP TYPE "public"."org_role";--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('owner', 'admin');--> statement-breakpoint
ALTER TABLE "organization_invites" ALTER COLUMN "role" SET DATA TYPE "public"."org_role" USING "role"::"public"."org_role";--> statement-breakpoint
ALTER TABLE "organization_members" ALTER COLUMN "role" SET DATA TYPE "public"."org_role" USING "role"::"public"."org_role";--> statement-breakpoint
ALTER TABLE "organization_invites" ALTER COLUMN "role" SET DEFAULT 'admin';--> statement-breakpoint
ALTER TABLE "organization_members" ALTER COLUMN "role" SET DEFAULT 'admin';