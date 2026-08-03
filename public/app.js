// ========================================
// Plano Aberto Filmes — Client App (Vanilla JS)
// ========================================

const app = document.getElementById('app');

// ========================================
// Utils
// ========================================
function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Intl.DateTimeFormat('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(dateStr));
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return tmp.textContent || '';
}

function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getYouTubeId(url) {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return m ? m[1] : null;
}

function getThumb(v) {
    let thumb = v.thumbnail_url || '';
    if (thumb && thumb.includes('hqdefault.jpg')) {
        thumb = thumb.replace('hqdefault.jpg', 'maxresdefault.jpg');
    }
    if (thumb) return thumb;
    const ytId = getYouTubeId(v.video_url || v.videoUrl || v.youtubeUrl);
    return ytId ? 'https://img.youtube.com/vi/' + ytId + '/maxresdefault.jpg' : '';
}

function createSlug(title) {
    return String(title || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

function showLoading() {
    app.innerHTML = '<div class="flex items-center justify-center py-20"><div class="spinner"></div></div>';
}

function renderSharePanel(url, title) {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    return `
    <div class="share-panel" style="display:flex; align-items:center; gap:1rem; padding:1.5rem 0; border-top:1px solid #1a1a1a; border-bottom:1px solid #1a1a1a; margin:2rem 0; flex-wrap:wrap;">
        <span style="display:flex; align-items:center; gap:0.5rem; color:#a3a3a3; font-weight:600;">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            Compartilhar:
        </span>
        <a href="https://api.whatsapp.com/send?text=${encodedTitle}%20-%20${encodedUrl}" target="_blank" class="share-btn whatsapp">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            WhatsApp
        </a>
        <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" class="share-btn twitter">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            Twitter
        </a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" class="share-btn facebook">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
        </a>
        <button onclick="navigator.clipboard.writeText('${url}'); alert('Link copiado!');" class="share-btn copy">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Copiar Link
        </button>
    </div>
    <style>
        .share-btn {
            display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 1rem; border-radius:6px; font-weight:600; font-size:0.9rem; text-decoration:none; cursor:pointer;
            background:transparent; color:#fff; border:1px solid #333; transition:all 0.2s;
        }
        .share-btn:hover { background:rgba(255,255,255,0.05); border-color:#666; }
        .share-btn.whatsapp:hover { border-color:#25D366; color:#25D366; }
        .share-btn.twitter:hover { border-color:#1DA1F2; color:#1DA1F2; }
        .share-btn.facebook:hover { border-color:#1877F2; color:#1877F2; }
    </style>
    `;
}

// ========================================
// API
// ========================================
async function api(endpoint, options = {}) {
    try {
        const res = await fetch('/api' + endpoint, {
            ...options,
            headers: { 'Content-Type': 'application/json', ...options.headers }
        });
        if (!res.ok) throw new Error('API Error ' + res.status);
        return res.json();
    } catch (e) {
        console.error('API Error:', endpoint, e);
        throw e;
    }
}

// ========================================
// Card Components
// ========================================
function articleCard(a) {
    const excerpt = stripHtml(a.excerpt || a.content || '').substring(0, 140);
    const statsId = `stats-article-${a.id}`;
    setTimeout(() => renderCardStats('article', a.id, statsId), 0);
    return `
    <article class="card fade-in" onclick="navigate('/articles/${createSlug(a.title)}')">
        ${a.image_url ? `
        <div class="thumbnail">
            <img src="${escHtml(a.image_url)}" alt="${escHtml(a.title)}" loading="lazy">
        </div>` : ''}
        <div class="card-content">
            <div class="meta">
                <span class="category">${escHtml(a.category || 'Cinema')}</span>
                <time>${formatDate(a.created_at)}</time>
            </div>
            <h3>${escHtml(a.title)}</h3>
            <p>${escHtml(excerpt)}${excerpt.length >= 140 ? '…' : ''}</p>
            <div class="card-stats" id="${statsId}"></div>
        </div>
    </article>`;
}

function videoCard(v) {
    const thumb = getThumb(v);
    const statsId = `stats-video-${v.id}`;
    setTimeout(() => renderCardStats('video', v.id, statsId), 0);
    return `
    <article class="card fade-in" onclick="navigate('/videos/${createSlug(v.title)}')">
        <div class="thumbnail">
            ${thumb ? `<img src="${escHtml(thumb)}" alt="${escHtml(v.title)}" loading="lazy">` : '<div style="width:100%;height:100%;background:#111;"></div>'}
            <div class="play-btn">
                <svg fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
        </div>
        <div class="card-content">
            <div class="meta">
                <span class="category">${escHtml(v.category || 'Vídeo')}</span>
                <time>${formatDate(v.created_at)}</time>
            </div>
            <h3>${escHtml(v.title)}</h3>
            <div class="card-stats" id="${statsId}"></div>
        </div>
    </article>`;
}

async function renderCardStats(type, id, targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;
    try {
        const stats = await api(`/stats/public/${type}/${id}`);
        const likes = stats.likes || 0;
        const comments = stats.comments ? stats.comments.length : 0;
        el.innerHTML = `
            <div class="stat-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <span>${likes}</span>
            </div>
            <div class="stat-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                <span>${comments}</span>
            </div>`;
    } catch (e) { el.style.display = 'none'; }
}

// ========================================
// Pages
// ========================================
async function renderHome() {
    showLoading();
    try {
        const [allArticles, videos] = await Promise.all([
            api('/content/articles'),
            api('/content/videos')
        ]);
        const articles = allArticles.filter(a => a.category !== 'Notícias');
        app.innerHTML = `
        <section class="hero" style="padding: 6rem 1rem 4rem; position: relative; text-align: center;">
            <div class="max-w-4xl mx-auto px-4" style="position: relative; z-index: 10;">
                <img src="/logo.png" alt="Plano Aberto" class="hero-logo" style="width: 180px; height: 180px; margin: 0 auto 3rem; display: block; filter: drop-shadow(0 0 20px rgba(0,0,0,0.5));">
                
                <h1 style="font-size: 3.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #fff; letter-spacing: -0.02em; text-shadow: 0 4px 10px rgba(0,0,0,0.8);">Plano Aberto Filmes</h1>
                <p style="font-size: 1.25rem; font-weight: 500; margin-bottom: 1rem; color: #fff; text-shadow: 0 2px 5px rgba(0,0,0,0.8);">Artigos e Vídeos sobre Cinema</p>
                <div style="width: 100%; max-width: 400px; height: 1px; background: rgba(255,255,255,0.1); margin: 0 auto 1rem;"></div>
                <p style="font-size: 1rem; color: #ccc; margin-bottom: 4rem; font-weight: 400; text-shadow: 0 2px 5px rgba(0,0,0,0.8);">Samuca SC Filmes & Novo Cine Debate</p>
                
                <div class="hero-partner-logos" style="display: flex; justify-content: center; gap: 8rem; margin-top: 2rem;">
                    <div style="text-align: center;">
                        <p style="font-size: 1.1rem; font-weight: 600; color: #fff; margin-bottom: 1rem; text-shadow: 0 2px 5px rgba(0,0,0,0.8);">Samuca SC Filmes</p>
                        <img src="/samuca-sc-filmes_circular.png" alt="Samuca SC Filmes" style="width: 280px; height: 280px; border-radius: 50%; object-fit: cover; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
                    </div>
                    <div style="text-align: center;">
                        <p style="font-size: 1.1rem; font-weight: 600; color: #fff; margin-bottom: 1rem; text-shadow: 0 2px 5px rgba(0,0,0,0.8);">Novo Cine Debate</p>
                        <img src="/cinedebate_circle.png" alt="Novo Cine Debate" style="width: 280px; height: 280px; border-radius: 50%; object-fit: cover; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
                    </div>
                </div>
            </div>
        </section>

        <section class="max-w-7xl mx-auto px-4 py-16">
            <div class="flex justify-between items-center mb-12">
                <h2 class="section-title">Artigos Recentes</h2>
                <a href="/articles" class="text-accent text-sm font-bold" data-link>Ver todos →</a>
            </div>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${articles.slice(0, 6).map(articleCard).join('')}
            </div>
        </section>

        <section class="max-w-7xl mx-auto px-4 py-16">
            <div class="flex justify-between items-center mb-12">
                <h2 class="section-title">Vídeos Recentes</h2>
                <a href="/videos" class="text-accent text-sm font-bold" data-link>Ver todos →</a>
            </div>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${videos.slice(0, 6).map(videoCard).join('')}
            </div>
        </section>`;
        bindLinks();
    } catch (e) {
        app.innerHTML = '<div class="empty-state">Erro ao carregar conteúdo.</div>';
    }
}

async function renderArticles() {
    showLoading();
    try {
        const allArticles = await api('/content/articles');
        const articles = allArticles.filter(a => a.category !== 'Notícias');
        app.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 py-16">
            <h1 class="section-title mb-12">Todos os Artigos</h1>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${articles.map(articleCard).join('')}
            </div>
        </div>`;
        bindLinks();
    } catch (e) {
        app.innerHTML = '<div class="empty-state">Erro ao carregar artigos.</div>';
    }
}

async function renderArticle(id) {
    showLoading();
    try {
        const [a, stats] = await Promise.all([
            api('/content/articles/' + id),
            api('/stats/public/article/' + id)
        ]);
        app.innerHTML = `
        <article class="max-w-4xl mx-auto px-4 py-16 fade-in">
            <header>
                <div class="meta mb-4">
                    <span class="category">${escHtml(a.category || 'Artigo')}</span>
                    <time>${formatDate(a.created_at)}</time>
                </div>
                <h1 class="article-title">${escHtml(a.title)}</h1>
                ${a.excerpt ? `<p class="article-subtitle" style="font-size:1.25rem;color:#a3a3a3;margin-top:0.75rem;font-style:italic;">${escHtml(a.excerpt)}</p>` : ''}
                <div class="article-meta">
                    <span>Por <strong>${escHtml(a.author || 'Redação')}</strong></span>
                    <span id="like-counter-article-${id}">♥ ${stats.likes} curtidas</span>
                    <span>👁 ${stats.views} visualizações</span>
                </div>
            </header>
            ${a.image_url ? `<img src="${escHtml(a.image_url)}" class="article-image" alt="">` : ''}
            <div class="prose">${a.content || ''}</div>
            ${renderSharePanel(window.location.origin + '/articles/' + createSlug(a.title), a.title)}
            <div class="article-footer">
                <button class="btn-secondary" onclick="toggleLike('article','${id}',this)">
                    ${stats.liked ? '❤️ Curtiu' : '🤍 Curtir'}
                </button>
                <span class="comment-count">${stats.comments.length} comentário${stats.comments.length !== 1 ? 's' : ''}</span>
            </div>
            ${renderComments(stats.comments, 'article', id)}
            ${renderCommentForm('article', id)}
        </article>`;
        bindLinks();
        window.scrollTo(0, 0);
    } catch (e) {
        app.innerHTML = '<div class="empty-state">Artigo não encontrado.</div>';
    }
}

async function renderVideos() {
    showLoading();
    try {
        const videos = await api('/content/videos');
        app.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 py-16">
            <h1 class="section-title mb-12">Todos os Vídeos</h1>
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${videos.map(videoCard).join('')}
            </div>
        </div>`;
        bindLinks();
    } catch (e) {
        app.innerHTML = '<div class="empty-state">Erro ao carregar vídeos.</div>';
    }
}

async function renderVideo(id) {
    showLoading();
    try {
        const [v, stats] = await Promise.all([
            api('/content/videos/' + id),
            api('/stats/public/video/' + id)
        ]);
        const ytId = getYouTubeId(v.video_url || v.videoUrl || v.youtubeUrl);
        app.innerHTML = `
        <div class="max-w-4xl mx-auto px-4 py-16 fade-in">
            <div class="meta mb-4">
                <span class="category">${escHtml(v.category || 'Vídeo')}</span>
                <time>${formatDate(v.created_at)}</time>
            </div>
            <h1 class="video-title">${escHtml(v.title)}</h1>
            <div class="video-meta">
                <span>Por <strong>${escHtml(v.author || 'Samuca SC')}</strong></span>
                <span id="like-counter-video-${id}">♥ ${stats.likes} curtidas</span>
                <span>👁 ${stats.views} visualizações</span>
            </div>
            ${ytId ? `
            <div class="video-wrapper">
                <iframe src="https://www.youtube.com/embed/${ytId}" frameborder="0" allowfullscreen></iframe>
            </div>` : ''}
            <div class="prose">${v.description || v.content || ''}</div>
            ${renderSharePanel(window.location.origin + '/videos/' + createSlug(v.title), v.title)}
            <div class="video-footer">
                <div>
                    <button class="btn-secondary" onclick="toggleLike('video','${id}',this)">
                        ${stats.liked ? '❤️ Curtiu' : '🤍 Curtir'}
                    </button>
                    <span class="comment-count">${stats.comments.length} comentário${stats.comments.length !== 1 ? 's' : ''}</span>
                </div>
                ${renderComments(stats.comments, 'video', id)}
                ${renderCommentForm('video', id)}
            </div>
        </div>`;
        bindLinks();
        window.scrollTo(0, 0);
    } catch (e) {
        app.innerHTML = '<div class="empty-state">Vídeo não encontrado.</div>';
    }
}

async function renderContact() {
    showLoading();
    let profiles = [];
    try {
        profiles = await api('/users/profiles');
    } catch (e) {
        console.error('Failed to fetch profiles:', e);
    }

    // Default static content for our founders (FALLBACKS)
    // Keyed by USERNAME (never changes), NOT by full_name (can change freely)
    const foundersInfo = {
        'samuel': {
            role: 'Samuca SC Filmes',
            bio: 'Sou Samuca Chaves, criador do canal Samuca SC Filmes e um cinéfilo apaixonado pela sétima arte. Dedico-me a compartilhar análises, opiniões e conteúdos sobre o universo do cinema, explorando desde grandes clássicos até os lançamentos mais recentes.',
            social: [
                { type: 'youtube', url: 'https://youtube.com/@samucascfilmes', label: 'Canal YouTube' },
                { type: 'email', url: 'mailto:samuelchavesmengao@gmail.com', label: 'Email' }
            ],
            defaultPhoto: '/profile1.jpeg'
        },
        'ricardo': {
            role: 'Novo Cine Debate',
            bio: 'Sou Ricardo, criador do canal Novo Cine Debate e um cinéfilo apaixonado pela sétima arte. Dedico-me a compartilhar análises, opiniões e conteúdos sobre o universo do cinema, explorando desde grandes clássicos até os lançamentos mais recentes.',
            social: [
                { type: 'youtube', url: 'https://www.youtube.com/@ricardorickmurilo', label: 'Canal YouTube' },
                { type: 'instagram', url: 'https://www.instagram.com/novocinedebate/', label: 'Instagram' },
                { type: 'facebook', url: 'https://www.facebook.com/ricardo.freitas.929014', label: 'Facebook' }
            ],
            defaultPhoto: '/profile2.jpeg'
        }
    };

    const cardsHtml = profiles.length > 0 ? profiles.map(p => {
        // Use username as stable key — full_name can change without breaking anything
        const fallback = foundersInfo[p.username] || {
            role: 'Colaborador',
            bio: 'Cinéfilo e colaborador do Plano Aberto Filmes.',
            social: [],
            defaultPhoto: '/logo.png'
        };

        const photo = p.photo_url || fallback.defaultPhoto;
        const role = p.role_name || fallback.role;
        
        // Priority: DB bio -> Fallback bio
        const bioHtml = (p.bio && p.bio.replace(/<[^>]+>/g, '').trim().length > 0) ? p.bio : `<p>${fallback.bio}</p>`;
        
        // Handle social links
        let socialLinks = [];
        if (p.links && p.links.trim().length > 0) {
            // Try to parse as JSON first (modern admin format)
            try {
                const parsed = JSON.parse(p.links);
                socialLinks = Array.isArray(parsed) ? parsed : [];
            } catch(e) {
                // If not JSON, treat as comma-separated URLs
                socialLinks = p.links.split(',').map(url => {
                    url = url.trim();
                    if (!url) return null;
                    let type = 'link';
                    let label = 'Link';
                    if (url.includes('youtube.com') || url.includes('youtu.be')) { type = 'youtube'; label = 'YouTube'; }
                    else if (url.includes('instagram.com')) { type = 'instagram'; label = 'Instagram'; }
                    else if (url.includes('facebook.com')) { type = 'facebook'; label = 'Facebook'; }
                    else if (url.includes('twitter.com') || url.includes('x.com')) { type = 'twitter'; label = 'Twitter / X'; }
                    else if (url.includes('@') && !url.includes('/')) { type = 'email'; label = 'Email'; url = 'mailto:' + url; }
                    return { type, url, label };
                }).filter(l => l !== null);
            }
        }

        // If no DB links, use fallbacks for founders
        if (socialLinks.length === 0 && fallback.social.length > 0) {
            socialLinks = fallback.social;
        }

        const socialHtml = socialLinks.map(s => {
            const icon = s.type === 'youtube' ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path><path d="m10 15 5-3-5-3z"></path></svg>' :
                         s.type === 'instagram' ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>' :
                         s.type === 'facebook' ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>' :
                         s.type === 'twitter' ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>' :
                         '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>';
            return `
                <a href="${s.url}" target="_blank" class="contact-social-link ${s.type || 'email'}">
                    ${icon}
                    <span>${s.label}</span>
                </a>`;
        }).join('');

        return `
            <div class="contact-card">
                <div class="contact-image-wrap">
                    <img alt="${escHtml(p.full_name)}" src="${photo}">
                    <div class="image-overlay"></div>
                </div>
                <div class="contact-content">
                    <h2 style="font-size: 2rem; font-weight: 800; color: #fbbf24; margin-bottom: 0.5rem;">${escHtml(p.full_name)}</h2>
                    <p style="color: #f59e0b; font-weight: 600; margin-bottom: 1rem;">${escHtml(role)}</p>
                    <div style="color: #d1d5db; margin-bottom: 1.5rem; line-height: 1.6;">${bioHtml}</div>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        ${socialHtml}
                    </div>
                </div>
            </div>`;
    }).join('') : '<p style="color:#666;text-align:center;grid-column:1/-1;">Nenhum perfil disponível.</p>';

    app.innerHTML = `
    <div class="fade-in">
        <!-- Hero Section -->
        <div class="relative py-20 px-4 bg-cover bg-center" style="background-color: #0f0f0f; background-image: radial-gradient(circle at top, rgba(120, 50, 0, 0.15), transparent 70%);">
            <div class="relative max-w-4xl mx-auto text-center">
                <h1 style="font-size: 3.5rem; font-weight: 800; color: #fff; margin-bottom: 1rem; letter-spacing: -0.04em;">Entre em Contato</h1>
                <p style="font-size: 1.25rem; color: #a3a3a3;">Conheça os criadores do Plano Aberto Filmes</p>
            </div>
        </div>

        <!-- Founders Cards -->
        <div style="max-width: 1200px; margin: 0 auto; padding: 4rem 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(350px, 100%), 1fr)); gap: 2rem;">
            ${cardsHtml}
        </div>

        <!-- Contact Form -->
        <div style="max-width: 900px; margin: 0 auto; padding: 2rem 1rem 6rem;">
            <div class="responsive-form-card" style="border: 1px solid rgba(245, 158, 11, 0.2);">
                <h2 style="font-size: 2.25rem; font-weight: 800; color: #fbbf24; margin-bottom: 2rem;">Envie uma Mensagem</h2>
                <form onsubmit="handleContact(event, this)" style="display: flex; flex-direction: column; gap: 1.5rem;">

                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #d1d5db; margin-bottom: 0.5rem;">Seu Nome</label>
                        <input type="text" name="name" placeholder="Digite seu nome" required class="contact-input-premium">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #d1d5db; margin-bottom: 0.5rem;">Seu Email</label>
                        <input type="email" name="email" placeholder="seu.email@exemplo.com" required class="contact-input-premium">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #d1d5db; margin-bottom: 0.5rem;">Assunto</label>
                        <input type="text" name="subject" placeholder="Assunto da mensagem" required class="contact-input-premium">
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #d1d5db; margin-bottom: 0.5rem;">Mensagem</label>
                        <textarea name="content" placeholder="Escreva sua mensagem aqui..." required rows="6" class="contact-input-premium" style="resize: none;"></textarea>
                    </div>
                    <button type="submit" class="contact-submit-btn">Enviar Mensagem</button>
                </form>
            </div>
        </div>

        <!-- Footer CTA -->
        <div style="background: linear-gradient(to right, rgba(120, 50, 0, 0.1), rgba(185, 28, 28, 0.1)); padding: 4rem 1rem; border-top: 1px solid rgba(245, 158, 11, 0.2); border-bottom: 1px solid rgba(245, 158, 11, 0.2); text-align: center;">
            <div style="max-width: 800px; margin: 0 auto;">
                <h2 style="font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 1rem;">Quer colaborar conosco?</h2>
                <p style="color: #d1d5db; margin-bottom: 2rem; font-size: 1.1rem;">Entre em contato através de qualquer um dos canais acima ou use the form. Adoramos ouvir sugestões, críticas e ideias de nossos leitores!</p>
                <a href="/" class="btn-primary" style="background: #d97706;" data-link>Voltar ao Início</a>
            </div>
        </div>
    </div>
    `;
    bindLinks();
}


window.handleContact = async (e, form) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    const data = {
        source: 'Contato',
        name: form.name.value,
        email: form.email.value,
        subject: form.subject.value,
        content: form.content.value
    };
    try {
        btn.disabled = true;
        btn.textContent = 'Enviando...';
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            form.innerHTML = '<p style="color:#fbbf24;font-weight:600;padding:2rem;text-align:center;font-size:1.2rem;">✓ Mensagem enviada com sucesso!</p>';
        } else {
            alert('Erro ao enviar mensagem');
            btn.disabled = false;
            btn.textContent = 'Enviar Mensagem';
        }
    } catch(err) {
        alert('Erro ao enviar mensagem');
        btn.disabled = false;
        btn.textContent = 'Enviar Mensagem';
    }
};

async function renderNews() {
    showLoading();
    try {
        const allArticles = await api('/content/articles');
        const news = allArticles.filter(a => a.category === 'Notícias');
        if (!news || news.length === 0) {
            app.innerHTML = `
            <div class="max-w-4xl mx-auto px-4 py-20 text-center fade-in">
                <h1 class="section-title mb-8">Notícias</h1>
                <p style="color:var(--text-muted);">Nenhuma notícia publicada ainda.</p>
                <a href="/" class="btn-primary" data-link style="display:inline-block;margin-top:2rem;">Voltar ao Início</a>
            </div>`;
        } else {
            app.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 py-16 fade-in">
                <h1 class="section-title mb-12">Notícias</h1>
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    ${news.map(a => `
                    <article class="card fade-in" onclick="navigate('/articles/${createSlug(a.title)}')">
                        ${a.image_url ? `
                        <div class="thumbnail">
                            <img src="${escHtml(a.image_url)}" alt="${escHtml(a.title)}" loading="lazy">
                        </div>` : ''}
                        <div class="card-content">
                            <div class="meta">
                                <span class="category">${escHtml(a.category || 'Notícia')}</span>
                                <time>${formatDate(a.created_at)}</time>
                            </div>
                            <h3>${escHtml(a.title)}</h3>
                            <p>${escHtml(stripHtml(a.excerpt || a.content || '').substring(0, 140))}</p>
                        </div>
                    </article>
                    `).join('')}
                </div>
            </div>`;
        }
        bindLinks();
    } catch (e) {
        app.innerHTML = '<div class="empty-state">Erro ao carregar notícias.</div>';
    }
}

async function renderSupporters() {
    showLoading();
    try {
        const list = await api('/partners/supporters');
        app.innerHTML = `
        <div class="page-header">
            <h1>Nossos <span>Apoiadores</span></h1>
            <p>Pessoas que acreditam no poder do cinema como ferramenta de educação e cultura.</p>
        </div>
        <div style="max-width:900px;margin:0 auto;padding:2rem 1rem 4rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1.25rem;">
            ${list.length ? list.map(s => `
            <div class="supporter-card">
                <div class="supporter-avatar">
                    ${s.photo_url ? `<img src="${escHtml(s.photo_url)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : s.name[0]}
                </div>
                <div class="supporter-name">${escHtml(s.name)}</div>
                <div class="supporter-role">${escHtml(s.tier || 'Apoiador')}</div>
            </div>
            `).join('') : '<p style="color:#666;grid-column:1/-1;text-align:center;">Nenhum apoiador ainda.</p>'}
        </div>
        <div class="cta-section">
            <p>Quer fazer parte dessa comunidade?</p>
            <a href="/contact" class="cta-btn" data-link>Torne-se um Apoiador</a>
        </div>
        <footer style="border-top:1px solid #1e1e1e;padding:2rem;text-align:center;color:#666666;font-size:.82rem;">&copy; 2026 Plano Aberto Filmes. Todos os direitos reservados.</footer>`;
        bindLinks();
    } catch (e) {
        app.innerHTML = '<div class="empty-state">Erro ao carregar apoiadores.</div>';
    }
}

async function renderSponsors() {
    showLoading();
    try {
        const list = await api('/partners/sponsors');
        app.innerHTML = `
        <div class="sponsors-hero fade-in">
            <h1>🏅 Nossos Patrocinadores</h1>
            <p>Conheça as empresas e marcas que patrocinam nosso projeto e tornam possível a produção de conteúdo de qualidade.</p>
        </div>
        <div style="max-width:1200px;margin:0 auto;padding:3rem 1.5rem 5rem;">
            ${list.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem;margin-bottom:5rem;">` + list.map(s => `
            <div class="sponsor-card">
                <div style="width:100px;height:100px;border-radius:12px;background:#0a0a0a;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;border:2px solid rgba(229,9,20,0.3);box-shadow:0 10px 20px -5px rgba(0,0,0,0.5);">
                    ${s.logo_url ? `<img src="${escHtml(s.logo_url)}" style="width:100%;height:100%;object-fit:contain;border-radius:10px;">` : `<span style="color:#e50914;font-weight:800;font-size:2rem;">${s.name[0]}</span>`}
                </div>
                <div class="supporter-name" style="font-size:1.25rem;font-weight:800;margin-bottom:0.25rem;">${escHtml(s.name)}</div>
                <div class="supporter-role" style="color:#e50914;font-weight:700;text-transform:uppercase;font-size:0.75rem;letter-spacing:1px;">${escHtml(s.tier || 'Patrocinador')}</div>
            </div>
            `).join('') + '</div>' : `<div class="sponsors-empty" style="text-align:center;padding:4rem;background:#0a0a0a;border-radius:16px;border:1px dashed #333;color:#666;margin-bottom:5rem;">Nenhum patrocinador cadastrado ainda.</div>`}

            <!-- Sponsor Contact Form -->
            <div style="max-width: 800px; margin: 0 auto;">
                <div class="responsive-form-card" style="border: 1px solid rgba(229, 9, 20, 0.2); box-shadow: 0 20px 40px -20px rgba(229,9,20,0.2);">
                    <div style="text-align:center;margin-bottom:2.5rem;">
                        <h2 style="font-size: 2.5rem; font-weight: 800; color: #fff; margin-bottom: 0.75rem;">Seja um Patrocinador</h2>
                        <p style="color: #888; font-size: 1.1rem;">Deseja associar sua marca ao Plano Aberto Filmes? Envie sua proposta abaixo.</p>
                    </div>
                    <form onsubmit="handleSponsorMessage(event, this)" style="display: flex; flex-direction: column; gap: 1.5rem;">
                        <div class="responsive-form-grid">
                            <div>
                                <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #aaa; margin-bottom: 0.5rem;">Nome da Empresa / Contato</label>

                                <input type="text" name="name" placeholder="Ex: Cinema Tech" required class="contact-input-premium">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #aaa; margin-bottom: 0.5rem;">Email Corporativo</label>
                                <input type="email" name="email" placeholder="contato@empresa.com" required class="contact-input-premium">
                            </div>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #aaa; margin-bottom: 0.5rem;">Assunto</label>
                            <input type="text" name="subject" value="Proposta de Patrocínio" required class="contact-input-premium">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #aaa; margin-bottom: 0.5rem;">Mensagem / Proposta</label>
                            <textarea name="content" placeholder="Conte-nos como gostaria de patrocinar o projeto..." required rows="5" class="contact-input-premium" style="resize: none;"></textarea>
                        </div>
                        <button type="submit" class="contact-submit-btn" style="background:#e50914;">Enviar Proposta</button>
                    </form>
                </div>
            </div>
        </div>
        <footer style="border-top:1px solid #1e1e1e;padding:2rem;text-align:center;color:#666666;font-size:.82rem;">&copy; 2026 Plano Aberto Filmes. Todos os direitos reservados.</footer>`;
        bindLinks();
    } catch (e) {
        console.error(e);
        app.innerHTML = '<div class="empty-state">Erro ao carregar patrocinadores.</div>';
    }
}

window.handleSponsorMessage = async (e, form) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    const data = {
        source: 'Patrocinador',
        name: form.name.value,
        email: form.email.value,
        subject: form.subject.value,
        content: form.content.value
    };
    try {
        btn.disabled = true;
        btn.textContent = 'Enviando...';
        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            form.innerHTML = '<div style="text-align:center;padding:3rem;"><div style="font-size:3rem;margin-bottom:1rem;">🚀</div><p style="color:#e50914;font-weight:700;font-size:1.5rem;">Proposta enviada!</p><p style="color:#888;">Entraremos em contato em breve.</p></div>';
        } else {
            alert('Erro ao enviar mensagem');
            btn.disabled = false;
            btn.textContent = 'Enviar Proposta';
        }
    } catch(err) {
        alert('Erro ao enviar mensagem');
        btn.disabled = false;
        btn.textContent = 'Enviar Proposta';
    }
};

function render404() {
    app.innerHTML = `
    <div class="max-w-4xl mx-auto px-4 py-32 text-center fade-in">
        <div style="font-size:5rem;margin-bottom:2rem;">🎬</div>
        <h1 class="section-title">Página não encontrada</h1>
        <p style="color:var(--text-secondary);margin:1rem 0 2rem;">O que você procura não está no catálogo.</p>
        <a href="/" class="btn-primary" data-link>Voltar ao início</a>
    </div>`;
    bindLinks();
}

// ========================================
// Comments System
// ========================================
function renderComments(comments, type, contentId) {
    if (!comments || comments.length === 0) {
        return '<p style="color:var(--text-muted);margin-bottom:1.5rem;">Nenhum comentário ainda. Seja o primeiro!</p>';
    }

    const roots = comments.filter(c => !c.parent_id);
    const replies = comments.filter(c => c.parent_id);

    function commentHtml(c, isReply = false) {
        const nested = replies.filter(r => r.parent_id === c.id);
        const liked = c.i_liked > 0;
        const editedTag = c.edited ? ' <span style="font-size:0.7rem;color:var(--text-muted);">(editado)</span>' : '';

        return `
        <div class="comment ${isReply ? 'comment-reply' : ''}" id="comment-${c.id}">
            <div class="comment-header">
                <span class="comment-author">${escHtml(c.author_name)}</span>
                <span class="comment-date">${formatDate(c.created_at)}${editedTag}</span>
            </div>
            <div class="comment-body" id="comment-body-${c.id}">${escHtml(c.content)}</div>
            <div class="comment-actions">
                <button class="comment-btn${liked ? ' liked' : ''}" onclick="likeComment(${c.id}, this)">
                    ♥ <span>${c.likes_count || 0}</span>
                </button>
                <button class="comment-btn" onclick="showReplyForm(${c.id},'${escHtml(c.author_name)}','${type}','${contentId}')">Responder</button>
                ${c.can_edit ? `<button class="comment-btn" onclick="startEdit(${c.id})">Editar</button>` : ''}
            </div>
            <div id="reply-form-${c.id}"></div>
            ${nested.length ? `<div class="comment-replies">${nested.map(r => commentHtml(r, true)).join('')}</div>` : ''}
        </div>`;
    }

    return `<div class="comments-list">${roots.map(c => commentHtml(c)).join('')}</div>`;
}

function renderCommentForm(type, id, parentId = null, placeholder = '') {
    const replyInput = parentId ? `<input type="hidden" name="parent_id" value="${parentId}">` : '';
    const isReply = !!parentId;
    return `
    <div class="comment-form-wrap" style="margin-top:${isReply ? '1rem' : '2.5rem'};">
        ${!isReply ? '<h3 style="margin-bottom:1.25rem;font-size:1.1rem;font-weight:700;">Deixe um comentário</h3>' : ''}
        <form onsubmit="handleComment(event,'${type}','${id}')" class="comment-form">
            ${replyInput}
            <div class="responsive-form-grid" style="gap:0.75rem;margin-bottom:0.75rem;">
                <input type="text" name="name" placeholder="${escHtml(placeholder || 'Seu nome')}" required class="comment-input">

                <input type="email" name="email" placeholder="E-mail (opcional)" class="comment-input">
            </div>
            <textarea name="content" placeholder="Escreva seu comentário..." required rows="3" class="comment-input" style="width:100%;resize:vertical;"></textarea>
            <div style="display:flex;gap:0.75rem;margin-top:0.75rem;align-items:center;">
                <button type="submit" class="btn-primary" style="font-size:0.85rem;padding:0.5rem 1.25rem;">Enviar</button>
                ${isReply ? `<button type="button" class="btn-secondary" style="font-size:0.85rem;padding:0.5rem 1rem;" onclick="document.getElementById('reply-form-${parentId}').innerHTML=''">Cancelar</button>` : ''}
            </div>
        </form>
    </div>`;
}

// Engagement handlers (global)
window.showReplyForm = (parentId, authorName, type, contentId) => {
    const el = document.getElementById(`reply-form-${parentId}`);
    if (el) el.innerHTML = renderCommentForm(type, contentId, parentId, `Responder a ${authorName}…`);
};

window.likeComment = async (commentId, btn) => {
    try {
        const res = await api('/stats/comment-like', { method: 'POST', body: JSON.stringify({ comment_id: commentId }) });
        if (res.success) {
            btn.classList.toggle('liked', res.liked);
            const span = btn.querySelector('span');
            span.textContent = parseInt(span.textContent) + (res.liked ? 1 : -1);
        }
    } catch (e) {}
};

window.startEdit = (commentId) => {
    const bodyEl = document.getElementById(`comment-body-${commentId}`);
    if (!bodyEl || bodyEl.querySelector('textarea')) return;
    const current = bodyEl.textContent;
    bodyEl.innerHTML = `
        <textarea class="comment-input" style="width:100%;resize:vertical;min-height:80px;">${escHtml(current)}</textarea>
        <div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
            <button class="btn-primary" style="font-size:0.8rem;padding:0.35rem 0.9rem;" onclick="saveEdit(${commentId})">Salvar</button>
            <button class="btn-secondary" style="font-size:0.8rem;padding:0.35rem 0.75rem;" onclick="cancelEdit(${commentId}, this)">Cancelar</button>
        </div>`;
    bodyEl._original = current;
};

window.saveEdit = async (commentId) => {
    const bodyEl = document.getElementById(`comment-body-${commentId}`);
    const textarea = bodyEl?.querySelector('textarea');
    if (!textarea) return;
    const newContent = textarea.value.trim();
    if (!newContent) return;
    try {
        const res = await api(`/stats/comment/${commentId}`, { method: 'PUT', body: JSON.stringify({ content: newContent }) });
        if (res.success) {
            bodyEl.textContent = newContent;
            // mark as edited
            const dateEl = document.querySelector(`#comment-${commentId} .comment-date`);
            if (dateEl && !dateEl.querySelector('.edited-tag')) {
                dateEl.insertAdjacentHTML('beforeend', ' <span class="edited-tag" style="font-size:0.7rem;color:var(--text-muted);">(editado)</span>');
            }
        } else {
            alert('Não autorizado. Você só pode editar seus próprios comentários.');
            cancelEdit(commentId, null, bodyEl._original);
        }
    } catch (e) {
        alert('Erro ao salvar.');
    }
};

window.cancelEdit = (commentId, _btn, override) => {
    const bodyEl = document.getElementById(`comment-body-${commentId}`);
    if (bodyEl) bodyEl.textContent = override || bodyEl._original || '';
};

window.handleComment = async (e, type, id) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const parentId = form.querySelector('[name="parent_id"]')?.value || null;
    const data = {
        content_type: type,
        content_id: id,
        author_name: form.name.value,
        author_email: form.email?.value || '',
        content: form.content.value,
        parent_id: parentId ? parseInt(parentId) : null
    };
    try {
        btn.disabled = true;
        btn.textContent = 'Enviando…';
        await api('/stats/comment', { method: 'POST', body: JSON.stringify(data) });
        if (parentId) {
            document.getElementById(`reply-form-${parentId}`).innerHTML =
                '<p style="color:var(--accent);font-size:0.85rem;margin-top:0.5rem;">✓ Resposta enviada para moderação!</p>';
        } else {
            form.parentElement.innerHTML =
                '<p style="color:var(--accent);padding:1rem 0;font-weight:600;">✓ Comentário enviado para moderação!</p>';
        }
    } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Enviar';
        alert('Erro ao enviar comentário.');
    }
};

window.toggleLike = async (type, id, btn) => {
    try {
        const res = await api('/stats/like', { method: 'POST', body: JSON.stringify({ content_type: type, content_id: id }) });
        if (res.success) {
            btn.textContent = res.liked ? '❤️ Curtiu' : '🤍 Curtir';
            
            // Update the counter in the UI
            const counterEl = document.getElementById(`like-counter-${type}-${id}`);
            if (counterEl) {
                // Fetch fresh stats to be precise
                const freshStats = await api(`/stats/public/${type}/${id}`);
                counterEl.textContent = `♥ ${freshStats.likes} curtidas`;
            }
        }
    } catch (e) {
        console.error('Like error:', e);
    }
};

// ========================================
// Footer
// ========================================
function renderFooter() {
    return '<footer style="border-top:1px solid #1e1e1e;padding:2rem;text-align:center;color:#666666;font-size:.82rem;">&copy; 2026 Plano Aberto Filmes. Todos os direitos reservados.</footer>';
}

// ========================================
// Router
// ========================================
function route(path) {
    document.querySelectorAll('header nav a').forEach(a => {
        const href = a.getAttribute('href');
        a.style.color = (href === path || (href !== '/' && path.startsWith(href))) ? 'var(--accent)' : '';
    });
    window.scrollTo(0, 0);

    if (path === '/' || path === '') return renderHome();
    if (path === '/articles') return renderArticles();
    if (path.match(/^\/articles\/[\w-]+/)) return renderArticle(path.split('/').pop());
    if (path === '/videos') return renderVideos();
    if (path.match(/^\/videos\/[\w-]+/)) return renderVideo(path.split('/').pop());
    if (path === '/contact') return renderContact();
    if (path === '/news' || path === '/questions') return renderNews();
    if (path === '/supporters') return renderSupporters();
    if (path === '/sponsors') return renderSponsors();
    render404();

    if (!path.startsWith('/supporters') && !path.startsWith('/sponsors')) {
        setTimeout(() => {
            if (!document.querySelector('footer')) {
                app.innerHTML += renderFooter();
            }
        }, 100);
    }
}

window.navigate = (path) => { history.pushState(null, '', path); route(path); };

function bindLinks() {
    document.querySelectorAll('a[data-link]').forEach(link => {
        link.onclick = e => { e.preventDefault(); navigate(link.getAttribute('href')); };
    });
}

// Init
window.addEventListener('popstate', () => route(window.location.pathname));
bindLinks();
route(window.location.pathname);
