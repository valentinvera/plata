CREATE TABLE "account" (
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
CREATE TABLE "session" (
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
CREATE TABLE "user" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY,
	"image" text,
	"name" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text,
	"last_sync_at" timestamp,
	"platform" text NOT NULL,
	"user_id" text,
	CONSTRAINT "devices_pkey" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "encrypted_blobs" (
	"ciphertext" bytea NOT NULL,
	"deleted_at" timestamp,
	"id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text,
	CONSTRAINT "encrypted_blobs_pkey" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "sync_cursors" (
	"cursor" text,
	"device_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text,
	CONSTRAINT "sync_cursors_pkey" PRIMARY KEY("user_id","device_id")
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX "devices_userId_idx" ON "devices" ("user_id");--> statement-breakpoint
CREATE INDEX "encrypted_blobs_userId_updatedAt_idx" ON "encrypted_blobs" ("user_id","updated_at");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "encrypted_blobs" ADD CONSTRAINT "encrypted_blobs_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sync_cursors" ADD CONSTRAINT "sync_cursors_user_id_device_id_devices_user_id_id_fkey" FOREIGN KEY ("user_id","device_id") REFERENCES "devices"("user_id","id") ON DELETE CASCADE;