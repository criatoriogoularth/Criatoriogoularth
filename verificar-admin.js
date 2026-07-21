const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://aviario_db_user:tyfBz94W5uTwzb7VKQOJkfhYbOe9CnWI@dpg-d9dbqg9kh4rs73fovsj0-a.oregon-postgres.render.com/aviario_db?sslmode=require'
});

async function verificarAdmin() {
    try {
        const result = await pool.query("SELECT id, nome, email, role, status FROM usuarios WHERE email = 'admin@criatorio.com';");
        if (result.rows.length > 0) {
            console.log('✅ Usuário admin encontrado!');
            console.log(`   ID: ${result.rows[0].id}`);
            console.log(`   Nome: ${result.rows[0].nome}`);
            console.log(`   Email: ${result.rows[0].email}`);
            console.log(`   Role: ${result.rows[0].role}`);
            console.log(`   Status: ${result.rows[0].status}`);
        } else {
            console.log('❌ Usuário admin NÃO encontrado!');
            console.log('🔄 Execute: node scripts/create-admin.js');
        }
    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

verificarAdmin();