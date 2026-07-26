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

    // SOLUÇÃO PARA O RENDER: Usa o caminho absoluto onde o script de instalação baixou o Prometheus
    const renderPath = '/opt/render/.local/bin/prometheus-lua';
    
    // Se o arquivo existir lá (estamos no Render), usa ele. Se não (estamos no PC local), usa o comando global.
    const cliCommand = fs.existsSync(renderPath) ? renderPath : 'prometheus-lua';

    let command = `${cliCommand} --preset ${preset || 'Medium'} --out "${outputPath}" "${inputPath}"`;
    if (seed) command += ` --seed ${seed}`;

    // Executa usando o caminho direto
    exec(command, (error, stdout, stderr) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

        if (error) {
            console.error(`Erro de execução: ${stderr || error.message}`);
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
