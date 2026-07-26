const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));

app.post('/api/obfuscate', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Arquivo ausente." });

    const { preset, seed, luaVersion } = req.body;
    const code = req.file.buffer.toString('utf8');
    
    if (!code.trim()) return res.status(400).json({ error: "O arquivo está vazio." });

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
