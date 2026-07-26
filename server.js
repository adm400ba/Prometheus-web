const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Aumenta o limite para 10MB para suportar scripts Lua muito grandes
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

app.post('/api/obfuscate', (req, res) => {
    const { code, preset, seed } = req.body;

    if (!code) return res.status(400).json({ error: "Código ausente." });

    const fileId = crypto.randomBytes(8).toString('hex');
    const inputPath = path.join(__dirname, `temp_${fileId}.lua`);
    const outputPath = path.join(__dirname, `temp_${fileId}.out.lua`);

    fs.writeFileSync(inputPath, code);

    let command = `prometheus-lua --preset ${preset || 'Medium'} --out "${outputPath}" "${inputPath}"`;
    if (seed) command += ` --seed ${seed}`;

    // CORREÇÃO PARA O RENDER: Adiciona a pasta bin local ao PATH do ambiente
    const env = Object.assign({}, process.env);
    env.PATH = `${env.PATH}:/opt/render/.local/bin`;

    // Executa a ofuscação passando o novo ambiente (env)
    exec(command, { env }, (error, stdout, stderr) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

        if (error) {
            console.error(`Erro de execução: ${stderr}`);
            return res.status(500).json({ error: "Falha na ofuscação. Verifique o log do servidor." });
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
