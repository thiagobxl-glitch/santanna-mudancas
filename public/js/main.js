document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('current-year').textContent = new Date().getFullYear();
    loadData();
});

let siteData = {};

async function loadData() {
    try {
        const response = await fetch('/api/data');
        siteData = await response.json();
        
        // Remove skeletons and set texts
        document.querySelectorAll('[data-skeleton]').forEach(el => el.removeAttribute('data-skeleton'));
        
        document.title = siteData.companyName || document.title;
        document.getElementById('hero-title').textContent = siteData.heroTitle;
        document.getElementById('hero-subtitle').textContent = siteData.heroSubtitle;
        
        if(siteData.logoImage) {
            document.getElementById('main-logo').src = `/images/${siteData.logoImage}`;
            document.getElementById('footer-logo').src = `/images/${siteData.logoImage}`;
            document.getElementById('favicon').href = `/images/${siteData.logoImage}`;
        }
        if(siteData.heroImage) {
            document.getElementById('hero-img').src = `/images/${siteData.heroImage}`;
        }
        
        const formatPhone = siteData.phone;
        document.getElementById('contact-phone').textContent = formatPhone;
        document.getElementById('footer-phone').textContent = formatPhone;
        document.getElementById('header-company-name').textContent = siteData.companyName || 'SANTANNA MUDANÇAS E TRANSPORTES';
        
        // Remove skeleton loader after data is loaded
        document.querySelectorAll('[data-skeleton]').forEach(el => el.removeAttribute('data-skeleton'));
        
        const waLink = `https://wa.me/${siteData.whatsappNumber}?text=${encodeURIComponent(siteData.whatsappMessage)}`;
        document.getElementById('hero-whatsapp-btn').href = waLink;
        
        document.getElementById('footer-instagram').href = siteData.instagram;
        
        renderServices(siteData.services);
        
        const imagesRes = await fetch('/api/images');
        const imagesList = await imagesRes.json();
        renderGallery(imagesList);
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

function renderGallery(images) {
    const container = document.getElementById('gallery-container');
    container.innerHTML = '';
    
    if (!images || !images.length) return;
    
    images.forEach(img => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `<img src="/images/${img}" alt="Estrutura Santanna">`;
        container.appendChild(item);
    });
}

function renderServices(services) {
    const container = document.getElementById('services-container');
    container.innerHTML = '';
    
    if (!services || !services.length) return;
    
    services.forEach(s => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.innerHTML = `
            <div class="service-icon"><i class="${s.icon}"></i></div>
            <div class="service-content">
                <h3>${s.title}</h3>
                <p>${s.description}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

function scrollToForm() {
    document.getElementById('contato').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('form-name').focus();
}

// Manipulação do Formulário
document.addEventListener('DOMContentLoaded', () => {
    const quoteForm = document.getElementById('quote-form');
    if (quoteForm) {
        quoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = quoteForm.querySelector('button[type="submit"]');
            const feedback = document.getElementById('quote-feedback');
            
            const data = {
                name: document.getElementById('quote-name').value,
                phone: document.getElementById('quote-phone').value,
                description: document.getElementById('quote-desc').value
            };
            
            btn.disabled = true;
            btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Enviando...';
            
            try {
                const res = await fetch('/api/quote', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (res.ok) {
                    feedback.style.color = 'green';
                    feedback.textContent = 'Solicitação enviada com sucesso! Entraremos em contato em breve.';
                    quoteForm.reset();
                } else {
                    throw new Error('Erro ao enviar');
                }
            } catch (err) {
                feedback.style.color = 'red';
                feedback.textContent = 'Ocorreu um erro ao enviar. Tente novamente mais tarde.';
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="ri-send-plane-fill"></i> Enviar Solicitação';
            }
        });
    }
});

function submitForm(event) {
    event.preventDefault();
    
    const name = document.getElementById('form-name').value;
    const phone = document.getElementById('form-phone').value;
    const type = document.getElementById('form-type').value;
    
    // Create WhatsApp link based on form data
    const message = `Olá, sou ${name}. Gostaria de solicitar um orçamento para mudança ${type}.\nMeu contato é: ${phone}`;
    const waNumber = siteData.whatsappNumber || "5561991283032";
    
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}
