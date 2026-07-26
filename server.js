const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

app.post('/api/obfuscate', (req, res) => {
    const { code, preset, seed } = req.body;

    if (!code) return res.status(400).json({ error: "Código ausente." });

    const fileId = crypto.randomBytes(8).toString('hex');
    const inputPath = path.join(__dirname, `temp_${fileId}.lua`);
    const outputPath = path.join(__dirname, `temp_${fileId}.out.lua`);

    fs.writeFileSync(inputPath, code);

    // A CORREÇÃO DEFINITIVA ESTÁ AQUI:
    // Pega o HOME direto das variáveis de ambiente (garantido pelo Render) 
    // e aponta para o caminho absoluto do prometheus-lua.
    const renderHome = process.env.HOME || '/opt/render';
    const prometheusCli = path.join(renderHome, '.local', 'bin', 'prometheus-lua');

    // Agora chamamos o caminho exato do arquivo, ignorando o PATH do sistema
    let command = `"${prometheusCli}" --preset ${preset || 'Medium'} --out "${outputPath}" "${inputPath}"`;
    if (seed) command += ` --seed ${seed}`;

    // Precisamos manter a sua pasta bin no PATH apenas para o Prometheus achar o 'lua' original
    const env = Object.assign({}, process.env);
    env.PATH = `${path.join(__dirname, 'bin')}:${env.PATH}`;

    exec(command, { env }, (error, stdout, stderr) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

        if (error) {
            console.error(`Erro de execução: ${stderr || error.message}`);
            return res.status(500).json({ error: "Falha na ofuscação. Verifique a sintaxe do seu script." });
        }

        if (fs.existsSync(outputPath)) {
            const obfuscatedCode = fs.readFileSync(outputPath, 'utf8');
            fs.unlinkSync(outputPath);
            res.json({ obfuscatedCode });
        } else {
            res.status(500).json({ error: "O arquivo ofuscado não foi gerado." });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
