const fs = require('fs');
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=');
      const k = l.slice(0, idx).trim();
      const v = l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      return [k, v];
    })
);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspect() {
  const { data: allProds, count: totalCount, error: err1 } = await supabase.from('products').select('*', { count: 'exact' });
  const { data: activeProds, count: activeCount, error: err2 } = await supabase.from('products').select('*', { count: 'exact' }).eq('is_active', true);
  const { data: cats, error: err3 } = await supabase.from('categories').select('*');
  const { data: reviews, count: reviewCount, error: err4 } = await supabase.from('client_reviews').select('*', { count: 'exact' });
  const { data: camps, error: err5 } = await supabase.from('campaigns').select('*');

  console.log('Total products:', totalCount, 'Active products:', activeCount, 'Err1:', err1, 'Err2:', err2);
  if (allProds) {
    const isActValues = allProds.map(p => p.is_active);
    console.log('Sample is_active values:', isActValues.slice(0, 10));
    console.log('Distinct categories in products:', [...new Set(allProds.map(p => p.category))]);
    const tally = {};
    allProds.forEach(p => { tally[p.category] = (tally[p.category] || 0) + 1; });
    console.log('Product tally by category:', tally);
  }
  console.log('Categories count:', cats?.length, cats?.map(c => ({ id: c.id, name: c.name, slug: c.slug })));
  console.log('Client reviews count:', reviewCount, 'Err4:', err4);
  const { data: upData, error: upErr } = await supabase.auth.signUp({
    email: 'rozieradmin2026@gmail.com',
    password: 'RozierPassword2026!'
  });
  console.log('signUp test:', upData?.user?.id, upErr?.message);
  if (upData?.session) {
    const { data: insTest, error: insErr2 } = await supabase.from('client_reviews').insert([{
      client_name: 'Test',
      image_url: '/images/clientes/1.jpg',
      district: 'Lima',
      rating: 5,
      order_index: 1,
      is_active: true
    }]).select();
    console.log('Insert with signed up user:', insTest, insErr2?.message);
  }
  console.log('Campaigns count:', camps?.length, camps?.map(c => ({ id: c.id, name: c.name, is_active: c.is_active, target_date: c.target_date })));
}
inspect();
