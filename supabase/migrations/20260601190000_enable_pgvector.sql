-- Enable pgvector for embedding storage and nearest-neighbor search.
-- Supabase recommends installing extensions in the shared `extensions` schema.
create extension if not exists vector with schema extensions;

