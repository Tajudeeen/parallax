CREATE TABLE "ai_usage_records" (
"id" text PRIMARY KEY NOT NULL,
"provider" text NOT NULL,
"model" text NOT NULL,
"success" boolean DEFAULT false NOT NULL,
"input_tokens" integer DEFAULT 0 NOT NULL,
"output_tokens" integer DEFAULT 0 NOT NULL,
"latency_ms" integer DEFAULT 0 NOT NULL,
"error_message" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
