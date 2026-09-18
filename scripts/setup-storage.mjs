// One-off setup script: creates the private "archive" storage bucket.
// Run with: node --env-file=.env.local scripts/setup-storage.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: buckets, error: listError } = await supabase.storage.listBuckets();
if (listError) {
  console.error("Failed to list buckets:", listError.message);
  process.exit(1);
}

if (buckets.some((b) => b.name === "archive")) {
  console.log("Bucket 'archive' already exists, skipping.");
} else {
  const { error } = await supabase.storage.createBucket("archive", {
    public: false,
  });
  if (error) {
    console.error("Failed to create bucket:", error.message);
    process.exit(1);
  }
  console.log("Created private storage bucket 'archive'.");
}
