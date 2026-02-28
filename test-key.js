const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://msxeqzceqjatoaluempo.supabase.co', 'sbp_95e3d26bc2979205482efb7fda118da175654cf5');
supabase.from('listings').select('id').limit(1).then(console.log).catch(console.error);
