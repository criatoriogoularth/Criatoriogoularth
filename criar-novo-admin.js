const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    connectionString: 'postgresql://aviario_db_user:tyfBz94W5uTwzb7VKQOJkfhYbOe9CnWI@dpg-d9dbqg9kh4rs73fovsj0-a.oregon-postgres.render.com/aviario_db?sslmode=require'
});

async function criarAdmin() {
    // Defina aqui seus dados
    const nome = 'Administrador';
    const email = 'admin@criatorio.com';
    const senha = 'admin123'; // Altere para a senha que você quiser
    
    try {
        // Gerar hash da senha
        const saltRounds = 10;
        const senha_hash = await bcrypt.hash(senha, saltRounds);
        
        // Verificar se o admin já existe
        const check = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
        
        if (check.rows.length > 0) {
            // Atualizar senha do admin existente
            await pool.query(
                'UPDATE usuarios SET senha_hash = $1 WHERE email = $2',
                [senha_hash, email]
            );
            console.log(`✅ Senha do admin atualizada!`);
        } else {
            // Criar novo admin
            await pool.query(
                `INSERT INTO usuarios (nome, email, senha_hash, role, status, criatorio) 
                 VALUES ($1, $2, $3, 'admin', 'aprovado', 'Criatório Goularth')`,
                [nome, email, senha_hash]
            );
            console.log(`✅ Admin criado com sucesso!`);
        }
        
        console.log(`📧 Email: ${email}`);
        console.log(`🔒 Senha: ${senha}`);
        console.log('');
        console.log('📌 Acesse: https://criatoriogoularth.onrender.com');
        
    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

criarAdmin();