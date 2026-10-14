CREATE TABLE "spaces" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY,
	"invite_token_hash" text NOT NULL,
	"key_id" text NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"wrapped_key" bytea NOT NULL
);
--> statement-breakpoint
CREATE TABLE "space_blobs" (
	"ciphertext" bytea NOT NULL,
	"client_updated_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"id" text,
	"server_updated_at" timestamp DEFAULT now() NOT NULL,
	"space_id" text,
	CONSTRAINT "space_blobs_pkey" PRIMARY KEY("space_id","id")
);
--> statement-breakpoint
CREATE TABLE "space_members" (
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"role" text NOT NULL,
	"space_id" text,
	"user_id" text,
	CONSTRAINT "space_members_pkey" PRIMARY KEY("space_id","user_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "spaces_inviteTokenHash_idx" ON "spaces" ("invite_token_hash");--> statement-breakpoint
CREATE INDEX "spaces_ownerId_idx" ON "spaces" ("owner_id");--> statement-breakpoint
CREATE INDEX "space_blobs_spaceId_serverUpdatedAt_idx" ON "space_blobs" ("space_id","server_updated_at","id");--> statement-breakpoint
CREATE INDEX "space_members_userId_idx" ON "space_members" ("user_id");--> statement-breakpoint
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_owner_id_user_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "space_blobs" ADD CONSTRAINT "space_blobs_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_spaces_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;