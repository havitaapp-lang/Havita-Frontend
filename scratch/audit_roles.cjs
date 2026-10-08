const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:admin@localhost:5432/appunidades' });
async function run() {
  await client.connect();
  try {
    const res1 = await client.query("SELECT DISTINCT role FROM memberships");
    console.log('Membership roles:', res1.rows.map(r => r.role));
  } catch(e) { console.log(e.message) }
  
  try {
    const res2 = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    const tables = res2.rows.map(r => r.table_name);
    console.log('Role tables:', tables.filter(t => t.includes('role')));
  } catch(e) { console.log(e.message) }
  await client.end();
}
run();
