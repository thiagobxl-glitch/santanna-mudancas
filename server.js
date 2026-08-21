const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'santanna123';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configurar multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public', 'images'));
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

// API para listar imagens da galeria
app.get('/api/images', (req, res) => {
  const imgDir = path.join(__dirname, 'public', 'images');
  fs.readdir(imgDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Erro ao listar imagens' });
    const images = files.filter(f => f.match(/\.(jpg|jpeg|png|gif)$/i) && f !== 'logo.png');
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
  
  const filepath = path.join(__dirname, 'public', 'images', filename);
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
