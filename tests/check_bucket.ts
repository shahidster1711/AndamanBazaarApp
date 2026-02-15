
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to find .env.local
const envPath = resolve(__dirname, '../.env.local');

if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found at:', envPath);
    process.exit(1);
}

// Manual env parsing since we are in a script context
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyBucket() {
    console.log('🔍 Checking Supabase Storage buckets...');

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error('❌ Error listing buckets:', error.message);
        process.exit(1);
    }

    const listingsBucket = buckets?.find(b => b.id === 'listings');

    if (listingsBucket) {
        console.log('✅ Bucket "listings" exists.');
        console.log('📄 Public status:', listingsBucket.public ? 'Public' : 'Private');

        if (!listingsBucket.public) {
            console.warn('⚠️ Warning: Bucket is Private. Images might not load in standard <img> tags.');
        }
    } else {
        console.log('❌ Bucket "listings" does NOT exist.');
        console.log('\nAvailable buckets:', buckets?.map(b => b.id).join(', ') || 'None');
    }
}

verifyBucket();
