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
    const { code, preset, seed, luaVersion } = req.body;

    if (!code) return res.status(400).json({ error: "Código ausente." });

    const fileId = crypto.randomBytes(8).toString('hex');
    const inputPath = path.join(__dirname, `temp_${fileId}.lua`);
    const outputPath = path.join(__dirname, `temp_${fileId}.out.lua`);

    fs.writeFileSync(inputPath, code);

    const luaBin = path.join(__dirname, 'bin', 'lua');
    const prometheusCli = path.join(__dirname, 'prometheus', 'cli.lua');

    let command = `"${luaBin}" "${prometheusCli}"`;

    if (luaVersion && luaVersion.toLowerCase() === 'luau') {
        command += ` --LuaU`;
    }

    command += ` --preset ${preset || 'Medium'} --out "${outputPath}" "${inputPath}"`;
    if (seed) command += ` --seed ${seed}`;

    exec(command, (error, stdout, stderr) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

        if (error) {
            console.error(`Erro: ${stderr || error.message}`);
            return res.status(500).json({ error: stderr || "Falha na ofuscação." });
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
