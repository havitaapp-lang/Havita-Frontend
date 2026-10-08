const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:admin@localhost:5432/appunidades'
});
async function run() {
  await client.connect();
  const res = await client.query("UPDATE memberships SET role = 'SECURITY' WHERE role = 'STAFF'");
  console.log('Rows updated:', res.rowCount);
  await client.end();
}
run();
