const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Permite ler JSON no corpo das requisições e serve a pasta public (onde está o HTML)
app.use(express.json());
app.use(express.static('public'));

app.post('/api/obfuscate', (req, res) => {
    const { code, version, preset, seed } = req.body;

    if (!code) return res.status(400).json({ error: "Código ausente." });

    // Gera um nome de arquivo único para evitar conflitos se várias pessoas usarem ao mesmo tempo
    const fileId = crypto.randomBytes(8).toString('hex');
    const inputPath = path.join(__dirname, `temp_${fileId}.lua`);
    const outputPath = path.join(__dirname, `temp_${fileId}.out.lua`);

    // Salva o código enviado pelo site em um arquivo .lua temporário
    fs.writeFileSync(inputPath, code);

    // Constrói o comando do Prometheus (assumindo que o CLI já foi instalado no Render)
    // Se a versão for Luau, adicionamos o argumento correto, senão omitimos
    let command = `prometheus-lua --preset ${preset || 'Medium'} --out "${outputPath}" "${inputPath}"`;
    
    // O Prometheus não requer flag para Lua 5.1 (é o padrão da engine), mas precisa de suporte a syntax Luau se for Roblox
    // Nota: dependendo da versão do Prometheus, não há flag separada de engine, ele lê a syntax automaticamente. 
    if (seed) {
        command += ` --seed ${seed}`;
    }

    // Executa a ofuscação
    exec(command, (error, stdout, stderr) => {
        // Remove arquivo de entrada por segurança
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);

        if (error) {
            console.error(`Erro de execução: ${stderr}`);
            return res.status(500).json({ error: "Falha na ofuscação. Verifique a sintaxe do seu código Lua." });
        }

        // Lê o arquivo gerado ofuscado
        if (fs.existsSync(outputPath)) {
            const obfuscatedCode = fs.readFileSync(outputPath, 'utf8');
            fs.unlinkSync(outputPath); // Limpa o arquivo ofuscado gerado
            res.json({ obfuscatedCode });
        } else {
            res.status(500).json({ error: "O arquivo ofuscado não foi gerado." });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
