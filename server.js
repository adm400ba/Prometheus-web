const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os'); // Adicionado para pegar a pasta home do sistema

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

    // O comando agora chama o prometheus-lua direto, pois ele estará no PATH
    let command = `prometheus-lua --preset ${preset || 'Medium'} --out "${outputPath}" "${inputPath}"`;
    if (seed) command += ` --seed ${seed}`;

    // Configura o PATH para achar o interpretador Lua (no ./bin local) 
    // e o Prometheus (na pasta .local/bin padrão do Render)
    const env = Object.assign({}, process.env);
    const localBinPath = path.join(__dirname, 'bin');
    const renderBinPath = path.join(os.homedir(), '.local', 'bin');
    
    env.PATH = `${localBinPath}:${renderBinPath}:${env.PATH}`;

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
