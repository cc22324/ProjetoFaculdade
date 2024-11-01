require("dotenv").config();
const PORT = process.env.PORT || 8081;
const stringSQL = process.env.CONNECTION_STRING;
const express = require("express");
const mssql = require("mssql");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const chave_secreta = process.env.CHAVE_SECRETA;
const app = express();

app.use(cors());
app.use(express.json());

// Conexão com o banco de dados
function conectaBD() {
    try {
        mssql.connect(stringSQL);
        console.log("BD conectado");
    } catch (error) {
        console.log("Erro na conexão com o BD.", error);
    }
}
conectaBD();

async function execQuery(querySQL) {
    const { recordset } = await mssql.query(querySQL);
    return recordset;
}

// 1. Rotas para Clientes
// Adicionar e validar clientes
app.post("/clientes", async (req, res) => {
    const { nome, email } = req.body;
    try {
        const clienteExistente = await execQuery(`SELECT * FROM Clientes WHERE email = '${email}'`);
        if (clienteExistente.length > 0) {
            return res.status(400).json({ message: "Cliente já cadastrado" });
        }

        const sql = `INSERT INTO Clientes (nome, email) VALUES ('${nome}', '${email}')`;
        await execQuery(sql);
        res.sendStatus(201);
    } catch (error) {
        res.status(500).json({ error: "Erro ao adicionar cliente." });
    }
});

// 2. Rotas para Livros
// Listar livros com filtros (categoria e faixa etária)
app.get("/livros", async (req, res) => {
    const { categoria, faixa_etaria } = req.query;
    let sql = "SELECT * FROM Livros";
    if (categoria) sql += ` WHERE categoria = '${categoria}'`;
    if (faixa_etaria) sql += `${categoria ? ' AND' : ' WHERE'} faixa_etaria = '${faixa_etaria}'`;

    try {
        const result = await execQuery(sql);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: "Erro ao listar livros." });
    }
});

// 3. Rotas para Opiniões
// Adicionar opinião sobre um livro
app.post("/opinioes", async (req, res) => {
    const { livroId, clienteId, comentario, avaliacao } = req.body;
    try {
        const sql = `INSERT INTO Opinioes (livroId, clienteId, comentario, avaliacao) 
                     VALUES (${livroId}, ${clienteId}, '${comentario}', ${avaliacao})`;
        await execQuery(sql);
        res.sendStatus(201);
    } catch (error) {
        res.status(500).json({ error: "Erro ao adicionar opinião." });
    }
});

// 4. Rotas para Mensagens no Chat
// Enviar mensagens no chat
app.post("/mensagens", async (req, res) => {
    const { clienteId, conteudo } = req.body;
    try {
        const sql = `INSERT INTO Mensagens (clienteId, conteudo) VALUES (${clienteId}, '${conteudo}')`;
        await execQuery(sql);
        res.sendStatus(201);
    } catch (error) {
        res.status(500).json({ error: "Erro ao enviar mensagem." });
    }
});

// 5. Rota para Registro de Usuários
app.post("/registro", async (req, res) => {
    const { username, password } = req.body;
    try {
        const passwordCript = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO Usuarios (username, senha) VALUES ('${username}', '${passwordCript}')`;
        await execQuery(sql);
        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
});

// 6. Rota para Login e Autenticação
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await execQuery(`SELECT * FROM Usuarios WHERE username = '${username}'`);
        if (result.length === 0) return res.status(404).json({ message: "Usuário não encontrado" });

        const verificaSenha = await bcrypt.compare(password, result[0].senha);
        if (verificaSenha) {
            const token = jwt.sign({ username }, chave_secreta, { expiresIn: "1h" });
            res.json({ token });
        } else {
            res.status(401).json({ message: "Falha na autenticação" });
        }
    } catch (error) {
        res.status(500).json({ error: "Erro no login" });
    }
});

// Rota principal
app.get("/8081", (req, res) => {
    res.json({ mensagem: "API da livraria em execução." });
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`API funcionando na porta: ${PORT}`);
});
