const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar caminhos para usar um Volume persistente em /usr/src/app/data (ou localmente ./data)
const DATA_DIR = path.join(__dirname, 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const PUBLIC_IMAGES_DIR = path.join(__dirname, 'public', 'images');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'santanna123';

// Criar pasta de imagens persistente e copiar imagens padrão se estiver vazia
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    // Copiar imagens originais para o volume na primeira execução
    if (fs.existsSync(PUBLIC_IMAGES_DIR)) {
        const files = fs.readdirSync(PUBLIC_IMAGES_DIR);
        files.forEach(f => fs.copyFileSync(path.join(PUBLIC_IMAGES_DIR, f), path.join(IMAGES_DIR, f)));
    }
}

// Criar data.json inicial se não existir no volume
if (!fs.existsSync(DATA_FILE)) {
    const DEFAULT_DATA = path.join(__dirname, 'default-data.json');
    if (fs.existsSync(DEFAULT_DATA)) {
        fs.copyFileSync(DEFAULT_DATA, DATA_FILE);
    } else {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ companyName: "Santanna Mudanças" }), 'utf8');
    }
}

app.use(cors());
app.use(express.json());

// Servir imagens do volume persistente PRIMEIRO (sobrepondo a rota padrão)
app.use('/images', express.static(IMAGES_DIR));

app.get('/', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, dataJson) => {
        if(err) return res.sendFile(path.join(__dirname, 'public', 'index.html'));
        const siteData = JSON.parse(dataJson);
        fs.readFile(path.join(__dirname, 'public', 'index.html'), 'utf8', (err, html) => {
            if(err) return res.status(500).send('Erro');
            
            // Simples injeção de SSR
            let finalHtml = html;
            if(siteData.heroTitle) finalHtml = finalHtml.replace(/Sua Mudança com Segurança e Rapidez/g, siteData.heroTitle);
            if(siteData.heroSubtitle) finalHtml = finalHtml.replace(/Mais de 20 anos de experiência realizando mudanças residenciais, comerciais e interestaduais com excelência\./g, siteData.heroSubtitle);
            if(siteData.companyName) finalHtml = finalHtml.replace(/SANTANNA MUDANÇAS E TRANSPORTES/g, siteData.companyName.toUpperCase());
            if(siteData.phone) finalHtml = finalHtml.replace(/\(61\) 99128-3032/g, siteData.phone);
            if(siteData.heroImage) finalHtml = finalHtml.replace(/caminhao-2\.jpg/g, siteData.heroImage);
            if(siteData.logoImage) finalHtml = finalHtml.replace(/logo\.png/g, siteData.logoImage);
            
            res.send(finalHtml);
        });
    });
});

app.use(express.static(path.join(__dirname, 'public')));

// Configurar multer para upload de imagens no Volume
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, IMAGES_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'galeria-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// API para buscar os dados do site
app.get('/api/data', (req, res) => {
  fs.readFile(DATA_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Erro ao ler dados' });
    res.json(JSON.parse(data));
  });
});

// Middleware de autenticação simples
const checkAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  next();
};

// API para autenticar o admin
app.post('/api/auth', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: 'Senha incorreta' });
  }
});

// API para salvar os dados atualizados do site
app.post('/api/data', checkAuth, (req, res) => {
  const newData = req.body;
  fs.writeFile(DATA_FILE, JSON.stringify(newData, null, 2), 'utf8', (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao salvar dados' });
    res.json({ success: true });
  });
});

// API para receber orçamentos e enviar para webhook
app.post('/api/quote', async (req, res) => {
    try {
        const { name, phone, description } = req.body;
        const dataJson = fs.readFileSync(DATA_FILE, 'utf8');
        const siteData = JSON.parse(dataJson);
        
        if (siteData.webhookUrl) {
            await fetch(siteData.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name, 
                    phone, 
                    description, 
                    source: 'Site Santanna',
                    "whatsapp da empresa": siteData.whatsappNumber 
                })
            });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Erro no webhook:', err);
        res.status(500).json({ error: 'Erro ao processar orçamento' });
    }
});

// API para listar imagens da galeria
app.get('/api/images', (req, res) => {
  fs.readdir(IMAGES_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'Erro ao listar imagens' });
    
    let heroImage = '';
    try {
        const siteData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        heroImage = siteData.heroImage || '';
    } catch(e) {}
    
    const images = files.filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i) && f !== 'logo.png' && f !== heroImage);
    res.json(images);
  });
});

// API para fazer upload de imagem
app.post('/api/images', checkAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
  res.json({ success: true, filename: req.file.filename });
});

// API para apagar imagem
app.delete('/api/images/:filename', checkAuth, (req, res) => {
  const filename = req.params.filename;
  if(filename === 'logo.png') return res.status(403).json({ error: 'Não é possível apagar a logo' });
  
  const filepath = path.join(IMAGES_DIR, filename);
  fs.unlink(filepath, (err) => {
    if (err) return res.status(500).json({ error: 'Erro ao apagar arquivo' });
    res.json({ success: true });
  });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Tratamento de rotas não encontradas para voltar ao index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
