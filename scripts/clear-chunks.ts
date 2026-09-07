import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearChunks() {
  const { error, count } = await supabase
    .from('document_chunks')
    .delete({ count: 'exact' })
    .neq('id', -1); // deletes all rows — "id is not -1" is always true, so nothing is excluded

  if (error) {
    console.error('Delete failed:', error.message);
  } else {
    console.log(`Deleted ${count} rows from document_chunks.`);
  }
}

clearChunks();