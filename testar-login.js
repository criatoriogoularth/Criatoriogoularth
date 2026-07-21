const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    connectionString: 'postgresql://aviario_db_user:tyfBz94W5uTwzb7VKQOJkfhYbOe9CnWI@dpg-d9dbqg9kh4rs73fovsj0-a.oregon-postgres.render.com/aviario_db?sslmode=require'
});

async function testarLogin() {
    try {
        const email = 'admin@criatorio.com';
        const senha = 'admin123';
        
        // Buscar usuário
        const result = await pool.query(
            'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            console.log('❌ Usuário não encontrado!');
            return;
        }
        
        const user = result.rows[0];
        console.log('✅ Usuário encontrado:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Nome: ${user.nome}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Hash: ${user.senha_hash.substring(0, 30)}...`);
        
        // Testar a senha
        const match = await bcrypt.compare(senha, user.senha_hash);
        
        if (match) {
            console.log('\n✅✅✅ SENHA CORRETA! O login deve funcionar! ✅✅✅');
        } else {
            console.log('\n❌❌❌ SENHA INCORRETA! ❌❌❌');
            console.log('A senha que você está digitando não coincide com o hash.');
        }
        
    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

testarLogin();