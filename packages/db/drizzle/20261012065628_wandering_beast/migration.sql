CREATE TABLE IF NOT EXISTS "sync_accounts" (
	"key_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text PRIMARY KEY
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "sync_accounts" ADD CONSTRAINT "sync_accounts_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
