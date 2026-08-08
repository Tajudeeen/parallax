CREATE TABLE "ingestion_records" (
"id" text PRIMARY KEY NOT NULL,
"source" text NOT NULL,
"received_at" timestamp with time zone DEFAULT now() NOT NULL,
"raw" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_entries" (
"scope" text NOT NULL,
"key" text NOT NULL,
"value" jsonb NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT "memory_entries_scope_key_pk" PRIMARY KEY("scope","key")
);
--> statement-breakpoint
CREATE TABLE "processed_records" (
"id" text PRIMARY KEY NOT NULL,
"ingestion_id" text NOT NULL,
"content" text NOT NULL,
"metadata" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
"id" text PRIMARY KEY NOT NULL,
"email" text NOT NULL,
"password_hash" text NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "processed_records" ADD CONSTRAINT "processed_records_ingestion_id_ingestion_records_id_fk" FOREIGN KEY ("ingestion_id") REFERENCES "public"."ingestion_records"("id") ON DELETE no action ON UPDATE no action;
