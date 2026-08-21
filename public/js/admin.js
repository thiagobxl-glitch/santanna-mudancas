let currentToken = localStorage.getItem('santanna_admin_token');
let currentData = {};

document.addEventListener('DOMContentLoaded', () => {
    if (currentToken) {
        showDashboard();
    }
});

async function login(e) {
    e.preventDefault();
    const password = document.getElementById('password-input').value;
    const errorEl = document.getElementById('login-error');
    
    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        if (res.ok) {
            const data = await res.json();
            currentToken = data.token;
            localStorage.setItem('santanna_admin_token', currentToken);
            errorEl.classList.add('hidden');
            showDashboard();
        } else {
            errorEl.classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        errorEl.textContent = 'Erro ao conectar no servidor.';
        errorEl.classList.remove('hidden');
    }
}

async function showDashboard() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    
    try {
        const res = await fetch('/api/data');
        if (res.ok) {
            currentData = await res.json();
            populateForm();
        }
        loadGallery();
    } catch (err) {
        console.error('Erro ao buscar dados:', err);
    }
}

async function loadGallery() {
    try {
        const res = await fetch('/api/images');
        const images = await res.json();
        renderGallery(images);
    } catch (err) {
        console.error('Erro ao buscar galeria', err);
    }
}

function renderGallery(images) {
    const container = document.getElementById('admin-gallery');
    container.innerHTML = '';
    images.forEach(img => {
        const div = document.createElement('div');
        div.style.position = 'relative';
        div.style.aspectRatio = '1';
        div.style.borderRadius = '8px';
        div.style.overflow = 'hidden';
        div.innerHTML = `
            <img src="/images/${img}" style="width:100%; height:100%; object-fit:cover;">
            <button onclick="deleteImage('${img}')" style="position:absolute; top:8px; right:8px; background:red; color:white; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer; font-weight:bold;">&times;</button>
        `;
        container.appendChild(div);
    });
}

async function uploadImage(e) {
    const file = e.target.files[0];
    if(!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const res = await fetch('/api/images', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        if(res.ok) {
            loadGallery();
            e.target.value = ''; // reset
        } else {
            alert('Erro ao enviar imagem');
        }
    } catch(err) {
        alert('Erro de conexão ao enviar imagem');
    }
}

async function deleteImage(filename) {
    if(!confirm('Tem certeza que deseja apagar esta imagem?')) return;
    try {
        const res = await fetch(`/api/images/${filename}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if(res.ok) {
            loadGallery();
        } else {
            alert('Erro ao apagar imagem');
        }
    } catch(err) {
        alert('Erro de conexão ao apagar imagem');
    }
}

async function uploadSpecialImage(e, key) {
    const file = e.target.files[0];
    if(!file) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const res = await fetch('/api/images', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}` },
            body: formData
        });
        if(res.ok) {
            const data = await res.json();
            currentData[key] = data.filename;
            
            // Save data json immediately
            await saveData();
            
            // Update preview
            if(key === 'logoImage') document.getElementById('preview-logo').src = `/images/${data.filename}`;
            if(key === 'heroImage') document.getElementById('preview-hero').src = `/images/${data.filename}`;
            
            e.target.value = ''; // reset
        } else {
            alert('Erro ao enviar imagem especial');
        }
    } catch(err) {
        alert('Erro de conexão ao enviar imagem');
    }
}

function populateForm() {
    document.getElementById('admin-companyName').value = currentData.companyName || '';
    document.getElementById('admin-phone').value = currentData.phone || '';
    document.getElementById('admin-whatsappNumber').value = currentData.whatsappNumber || '';
    document.getElementById('admin-whatsappMessage').value = currentData.whatsappMessage || '';
    document.getElementById('admin-instagram').value = currentData.instagram || '';
    document.getElementById('admin-heroTitle').value = currentData.heroTitle || '';
    document.getElementById('admin-heroSubtitle').value = currentData.heroSubtitle || '';
    document.getElementById('admin-webhookUrl').value = currentData.webhookUrl || '';
    
    if(currentData.logoImage) document.getElementById('preview-logo').src = `/images/${currentData.logoImage}`;
    if(currentData.heroImage) document.getElementById('preview-hero').src = `/images/${currentData.heroImage}`;
}

async function saveData() {
    // Update currentData object
    currentData.companyName = document.getElementById('admin-companyName').value;
    currentData.phone = document.getElementById('admin-phone').value;
    currentData.whatsappNumber = document.getElementById('admin-whatsappNumber').value;
    currentData.whatsappMessage = document.getElementById('admin-whatsappMessage').value;
    currentData.instagram = document.getElementById('admin-instagram').value;
    currentData.heroTitle = document.getElementById('admin-heroTitle').value;
    currentData.heroSubtitle = document.getElementById('admin-heroSubtitle').value;
    currentData.webhookUrl = document.getElementById('admin-webhookUrl').value;
    
    try {
        const res = await fetch('/api/data', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(currentData)
        });
        
        if (res.ok) {
            showToast();
        } else {
            if (res.status === 401) {
                alert('Sua sessão expirou. Faça login novamente.');
                localStorage.removeItem('santanna_admin_token');
                location.reload();
            } else {
                alert('Erro ao salvar os dados.');
            }
        }
    } catch (err) {
        console.error(err);
        alert('Erro de conexão ao salvar.');
    }
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
