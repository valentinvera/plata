-- Initial migration. Databases bootstrapped earlier with `bun run db:push`
-- already contain the auth tables, so every statement is idempotent and can be
-- applied on top of an existing schema.
CREATE TABLE IF NOT EXISTS "account" (
	"access_token" text,
	"access_token_expires_at" timestamp,
	"account_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY,
	"id_token" text,
	"password" text,
	"provider_id" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"updated_at" timestamp NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY,
	"ip_address" text,
	"token" text NOT NULL UNIQUE,
	"updated_at" timestamp NOT NULL,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY,
	"image" text,
	"name" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "devices" (
	"id" text,
	"last_sync_at" timestamp,
	"platform" text NOT NULL,
	"user_id" text,
	CONSTRAINT "devices_pkey" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encrypted_blobs" (
	"ciphertext" bytea NOT NULL,
	"client_updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"id" text,
	"server_updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text,
	CONSTRAINT "encrypted_blobs_pkey" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "devices_userId_idx" ON "devices" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "encrypted_blobs_userId_serverUpdatedAt_idx" ON "encrypted_blobs" ("user_id","server_updated_at","id");--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "encrypted_blobs" ADD CONSTRAINT "encrypted_blobs_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
