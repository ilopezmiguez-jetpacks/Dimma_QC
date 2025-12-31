import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mojsphpkxprvnoolxfej.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vanNwaHBreHBydm5vb2x4ZmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDY1MDcsImV4cCI6MjA3NjEyMjUwN30.xrDzsM83D9pb8SbAfXqfwUFy5CAIomuJRAs83ga2hvA';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
