
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase Env Variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
    console.log('Fetching product_mappings...');
    const { data, error } = await supabase.from('product_mappings').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success! Found table.');
        if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
            console.log('Sample Row:', data[0]);
        } else {
            console.log('Table exists but is empty.');
        }
    }
}

inspect();
