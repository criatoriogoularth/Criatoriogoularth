const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://aviario_db_user:tyfBz94W5uTwzb7VKQOJkfhYbOe9CnWI@dpg-d9dbqg9kh4rs73fovsj0-a.oregon-postgres.render.com/aviario_db?sslmode=require'
});

async function verificar() {
    try {
        const result = await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
        );
        console.log('📋 Tabelas no banco:');
        result.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        console.log(`\n✅ Total: ${result.rows.length} tabelas`);
    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

verificar();