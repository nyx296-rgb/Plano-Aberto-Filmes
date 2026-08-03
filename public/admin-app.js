// ========================================
// Admin App — Plano Aberto Filmes
// ========================================
const API_URL = '';
let currentUser = null;
let currentSection = 'dashboard';
let editingId = null;
let editingType = null;
let quill = null;
let analyticsData = null;

const token = localStorage.getItem('token');
if (!token) window.location.href = '/login.html';

// ---- API ----
async function apiCall(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}`, ...options.headers }
  });
  if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/login.html'; return null; }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro');
  return data;
}

// ---- Auth ----
async function checkAuth() {
  try {
    currentUser = await apiCall('/api/auth/me');

    // Sidebar greeting
    const greeting = document.getElementById('sidebarGreeting');
    if (greeting) greeting.textContent = `Olá, ${currentUser.full_name || currentUser.username}`;

    // Editors see "Meu Perfil" instead of full user management
    const usersNavItem = document.querySelector('[data-section="users"]');
    if (currentUser.role !== 'admin') {
      // Rename the nav item to make it clear it's their own profile
      usersNavItem.textContent = '👤 Meu Perfil';
    }
  } catch (e) { window.location.href = '/login.html'; }
}

// ---- Toast ----
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type}`;
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => t.classList.remove('show'), 3000);
}

function formatDate(d) { return new Date(d).toLocaleDateString('pt-BR'); }
function formatNum(n) { return n >= 1000 ? (n/1000).toFixed(1)+'K' : String(n); }

// ========================================
// DASHBOARD (Visão Geral - Opção D)
// ========================================
async function loadDashboard() {
  try {
    const a = await apiCall(`/api/stats/analytics?period=7`);
    document.getElementById('bigMetricVisitors').textContent = formatNum(a.uniqueVisitors);
    document.getElementById('bigMetricPageviews').textContent = formatNum(a.totalViews);
    document.getElementById('bigMetricDuration').textContent = a.avgDuration;
  } catch(e) { console.error('Dashboard error:', e); }
}

// ========================================
// ANALYTICS (Dashboard Antigo)
// ========================================
async function loadAnalytics() {
  const period = document.querySelector('.period-btn.active')?.dataset.period || '7';
  try {
    analyticsData = await apiCall(`/api/stats/analytics?period=${period}`);
    const a = analyticsData;
    document.getElementById('metricVisitors').textContent = formatNum(a.uniqueVisitors);
    document.getElementById('metricPageviews').textContent = formatNum(a.totalViews);
    document.getElementById('metricBounce').textContent = a.bounceRate + '%';
    document.getElementById('metricDuration').textContent = a.avgDuration;
    drawAccessChart(a.viewsPerDay);
    drawDonutChart(a.channels);
    renderTopPages(a.topPages);
    renderDevices(a.devices);
    renderCountries(a.countries);
    renderTrafficSources(a.trafficSources);
  } catch(e) { console.error('Analytics error:', e); }
  // Also load content counts
  try {
    const arts = await apiCall('/api/content/admin/articles');
    const vids = await apiCall('/api/content/admin/videos');
    const metricArts = arts.filter(a => a.category !== 'Notícias').length;
    const metricNews = arts.filter(a => a.category === 'Notícias').length;
    document.getElementById('metricArticles').textContent = metricArts;
    document.getElementById('metricVideos').textContent = vids.length;
    const metricNewsEl = document.getElementById('metricNews');
    if(metricNewsEl) metricNewsEl.textContent = metricNews;
  } catch(e) {}
}

// ---- Access Chart (Canvas) ----
function drawAccessChart(data) {
  const canvas = document.getElementById('accessChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.parentElement.clientWidth - 32;
  const H = canvas.height = 240;
  ctx.clearRect(0,0,W,H);

  const maxV = Math.max(...data.map(d=>d.views), 1);
  const pad = {t:20,r:20,b:30,l:50};
  const cw = W-pad.l-pad.r, ch = H-pad.t-pad.b;
  const barW = cw/data.length * 0.6;
  const gap = cw/data.length;

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i=0;i<=5;i++) {
    const y = pad.t + (ch/5)*i;
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(formatNum(Math.round(maxV*(5-i)/5)), pad.l-8, y+4);
  }

  // Bars (pageviews)
  data.forEach((d,i) => {
    const x = pad.l + gap*i + (gap-barW)/2;
    const h = (d.views/maxV)*ch;
    const y = pad.t + ch - h;
    const grad = ctx.createLinearGradient(x,y,x,y+h);
    grad.addColorStop(0, 'rgba(74,222,128,0.7)');
    grad.addColorStop(1, 'rgba(74,222,128,0.15)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x,y,barW,h,[4,4,0,0]);
    ctx.fill();
    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, pad.l + gap*i + gap/2, H-8);
  });

  // Line (visitors)
  const maxU = Math.max(...data.map(d=>d.visitors), 1);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  data.forEach((d,i) => {
    const x = pad.l + gap*i + gap/2;
    const y = pad.t + ch - (d.visitors/maxU)*ch;
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();
  // Dots
  data.forEach((d,i) => {
    const x = pad.l + gap*i + gap/2;
    const y = pad.t + ch - (d.visitors/maxU)*ch;
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2); ctx.fill();
  });
}

// ---- Donut Chart ----
function drawDonutChart(channels) {
  const canvas = document.getElementById('donutChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 180;
  canvas.width = size; canvas.height = size;
  const cx = size/2, cy = size/2, r = 70, inner = 45;
  let start = -Math.PI/2;
  const total = channels.reduce((s,c)=>s+c.value,0);
  channels.forEach(c => {
    const angle = (c.value/total)*Math.PI*2;
    ctx.beginPath();
    ctx.arc(cx,cy,r,start,start+angle);
    ctx.arc(cx,cy,inner,start+angle,start,true);
    ctx.closePath();
    ctx.fillStyle = c.color;
    ctx.fill();
    start += angle;
  });
  // Center text
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.arc(cx,cy,inner-2,0,Math.PI*2); ctx.fill();
}

// ---- Top Pages ----
function renderTopPages(pages) {
  const el = document.getElementById('topPages');
  if (!el) return;
  el.innerHTML = pages.map(p => {
    const pct = analyticsData.totalViews ? Math.round((p.views/analyticsData.totalViews)*100) : 0;
    return `<tr><td class="page-path">${p.path}</td><td>${formatNum(p.views)}</td><td>${pct}%</td></tr>`;
  }).join('') || '<tr><td colspan="3" class="empty-state">Sem dados</td></tr>';
}

// ---- Devices ----
function renderDevices(dev) {
  const el = document.getElementById('deviceBars');
  if (!el) return;
  el.innerHTML = [
    {icon:'🖥️', name:'Desktop', pct:dev.desktop, color:'#60a5fa'},
    {icon:'📱', name:'Mobile', pct:dev.mobile, color:'#4ade80'},
    {icon:'📟', name:'Tablet', pct:dev.tablet, color:'#f87171'}
  ].map(d => `<div class="bar-row"><span class="bar-icon">${d.icon}</span><span class="bar-label">${d.name}</span><div class="bar-track"><div class="bar-fill" style="width:${d.pct}%;background:${d.color}"></div></div><span class="bar-value">${d.pct}%</span></div>`).join('');
}

// ---- Countries ----
function renderCountries(countries) {
  const el = document.getElementById('countryList');
  if (!el) return;
  el.innerHTML = countries.map(c => `<div class="country-row"><span>${c.name}</span><span class="country-pct">${c.pct}%</span></div>`).join('');
}

// ---- Traffic Sources ----
function renderTrafficSources(sources) {
  const el = document.getElementById('trafficBars');
  if (!el) return;
  const max = Math.max(...sources.map(s=>s.value),1);
  el.innerHTML = sources.map(s => `<div class="bar-row"><span class="bar-label" style="min-width:80px">${s.name}</span><div class="bar-track"><div class="bar-fill" style="width:${(s.value/max)*100}%;background:#60a5fa"></div></div><span class="bar-value">${formatNum(s.value)}</span></div>`).join('');
}

// ========================================
// CONTENT LISTS
// ========================================
async function loadArticles() {
  const articles = await apiCall('/api/content/admin/articles');
  const filtered = articles.filter(a => a.category !== 'Notícias');
  document.getElementById('articlesList').innerHTML = filtered.map(a => `<tr><td>${a.title}</td><td>${a.author||'-'}</td><td>${a.category||'-'}</td><td><span class="status-badge status-${a.status}">${a.status==='published'?'Publicado':'Rascunho'}</span></td><td class="actions"><button class="btn btn-sm" onclick="openEditor('article',${a.id})">Editar</button><button class="btn btn-sm btn-danger" onclick="deleteArticle(${a.id})">Excluir</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty-state">Nenhum artigo</td></tr>';
}

async function loadNews() {
  const articles = await apiCall('/api/content/admin/articles');
  const news = articles.filter(a => a.category === 'Notícias');
  document.getElementById('newsList').innerHTML = news.map(a => `<tr><td>${a.title}</td><td>${a.author||'-'}</td><td><span class="status-badge status-${a.status}">${a.status==='published'?'Publicado':'Rascunho'}</span></td><td>${formatDate(a.created_at)}</td><td class="actions"><button class="btn btn-sm" onclick="openEditor('news',${a.id})">Editar</button><button class="btn btn-sm btn-danger" onclick="deleteNews(${a.id})">Excluir</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty-state">Nenhuma notícia</td></tr>';
}

async function loadVideos() {
  const videos = await apiCall('/api/content/admin/videos');
  document.getElementById('videosList').innerHTML = videos.map(v => `<tr><td>${v.title}</td><td>${v.author||'-'}</td><td>${v.category||'-'}</td><td><span class="status-badge status-${v.status}">${v.status==='published'?'Publicado':'Rascunho'}</span></td><td class="actions"><button class="btn btn-sm" onclick="openEditor('video',${v.id})">Editar</button><button class="btn btn-sm btn-danger" onclick="deleteVideo(${v.id})">Excluir</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty-state">Nenhum vídeo</td></tr>';
}

async function loadModeration() {
  const comments = await apiCall('/api/stats/comments');
  document.getElementById('commentsList').innerHTML = comments.map(c => {
    // Determine the public URL based on type and id/slug
    let baseUrl = '/articles/';
    if (c.content_type === 'video') baseUrl = '/videos/';
    else if (c.category === 'Notícias') baseUrl = '/news/'; // Handle news specifically
    
    const contentUrl = `${baseUrl}${c.content_id}`;
    
    return `
      <tr>
        <td>${c.author_name}</td>
        <td style="max-width:300px;white-space:normal">${c.content}</td>
        <td>
          <a href="${contentUrl}" target="_blank" class="admin-link" style="color:#60a5fa; text-decoration:none; font-weight:600;">
            ${c.content_title || '-'} 
          </a>
          <span style="font-size:0.75rem; color:#666; display:block">(${c.content_type})</span>
        </td>
        <td>${formatDate(c.created_at)}</td>
        <td class="actions" style="display:flex; align-items:center; gap:8px;">
          ${c.status === 'pending' ? `
            <button class="btn btn-sm btn-success" onclick="moderateComment(${c.id}, 'approved')">Aprovar</button>
            <button class="btn btn-sm btn-danger" onclick="moderateComment(${c.id}, 'rejected')">Rejeitar</button>
          ` : `
            <span class="status-badge status-${c.status === 'approved' ? 'published' : 'draft'}">${c.status}</span>
          `}
          ${currentUser.role === 'admin' || currentUser.role === 'editor' ? `<button class="btn btn-sm btn-danger" onclick="deleteComment(${c.id})">Excluir</button>` : ''}
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="5" class="empty-state">Nenhum comentário</td></tr>';
}

async function moderateComment(id, status) {
  await apiCall(`/api/stats/comments/${id}/moderate`, { method: 'POST', body: JSON.stringify({ status }) });
  showToast('Comentário moderado!'); loadModeration();
}

async function deleteComment(id) {
  if (!confirm('Excluir este comentário permanentemente?')) return;
  await apiCall(`/api/stats/comments/${id}`, { method: 'DELETE' });
  showToast('Comentário excluído!');
  loadModeration();
}

async function loadUsers() {
  // Editors can only see and edit their own profile
  if (currentUser.role !== 'admin') {
    const data = await apiCall('/api/users/me');
    const users = data.users || [];
    // Adapt section header: hide "+ Novo Usuário" button for editors
    const newUserBtn = document.querySelector('#usersSection .header button');
    if (newUserBtn) newUserBtn.style.display = 'none';
    const sectionTitle = document.querySelector('#usersSection .header h1');
    if (sectionTitle) sectionTitle.textContent = 'Meu Perfil';

    document.getElementById('usersList').innerHTML = users.map(u => `
      <tr>
        <td>${u.full_name || '-'}</td>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>${formatDate(u.created_at)}</td>
        <td class="actions">
          <button class="btn btn-sm" onclick='openEditor("user",${u.id})'>Editar meu perfil</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="empty-state">Perfil não encontrado</td></tr>';
    return;
  }

  // Admin: full user list
  const data = await apiCall('/api/users');
  const users = data.users || [];
  // Restore header for admin
  const newUserBtn = document.querySelector('#usersSection .header button');
  if (newUserBtn) newUserBtn.style.display = '';
  const sectionTitle = document.querySelector('#usersSection .header h1');
  if (sectionTitle) sectionTitle.textContent = 'Usuários';

  document.getElementById('usersList').innerHTML = users.map(u => `
    <tr>
      <td>${u.full_name || '-'}</td>
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td>${formatDate(u.created_at)}</td>
      <td class="actions">
        <button class="btn btn-sm" onclick='openEditor("user",${u.id})'>Editar</button>
        ${u.id !== currentUser.id && u.role !== 'admin' ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})">Excluir</button>` : ''}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty-state">Nenhum usuário</td></tr>';
}

async function deleteArticle(id) { if (!confirm('Excluir artigo?')) return; await apiCall(`/api/content/articles/${id}`,{method:'DELETE'}); showToast('Excluído!'); loadArticles(); }
async function deleteVideo(id) { if (!confirm('Excluir vídeo?')) return; await apiCall(`/api/content/videos/${id}`,{method:'DELETE'}); showToast('Excluído!'); loadVideos(); }
async function deleteNews(id) { if (!confirm('Excluir notícia?')) return; await apiCall(`/api/content/articles/${id}`,{method:'DELETE'}); showToast('Excluída!'); loadNews(); }
async function deleteUser(id) { if (!confirm('Excluir usuário?')) return; await apiCall(`/api/users/${id}`,{method:'DELETE'}); showToast('Excluído!'); loadUsers(); }

// ========================================
// FULL-PAGE EDITOR
// ========================================
function openEditor(type, id) {
  editingType = type;
  editingId = id || null;
  // Show editor, hide everything else
  document.querySelectorAll('[id$="Section"]').forEach(s => s.classList.add('hidden'));
  document.getElementById('editorSection').classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

  // Set type tabs
  document.querySelectorAll('.type-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.type === type);
  });

  // Update fields visibility
  document.getElementById('videoFields').style.display = type === 'video' ? 'block' : 'none';
  document.getElementById('articleFields').style.display = (type === 'article' || type === 'news') ? 'block' : 'none';
  document.getElementById('userFields').style.display = type === 'user' ? 'block' : 'none';
  document.getElementById('userSidebarFields').style.display = type === 'user' ? 'block' : 'none';
  document.getElementById('categoryGroup').style.display = (type === 'user' || type === 'news') ? 'none' : 'block';
  document.getElementById('statusGroup').style.display = type === 'user' ? 'none' : 'block';

  document.getElementById('editorTitle').textContent = id ? `Editar ${type==='article'?'Artigo':(type==='video'?'Vídeo':(type==='news'?'Notícia':'Usuário'))}` : `Novo ${type==='article'?'Artigo':(type==='video'?'Vídeo':(type==='news'?'Notícia':'Usuário'))}`;
  document.getElementById('contentLabel').textContent = type === 'user' ? 'Bio' : 'Conteúdo';
  document.getElementById('authorLabel').textContent = type === 'user' ? 'Nome Completo' : 'Autor';

  // Editors: hide type-switch tabs and lock username field when editing own profile
  const typeTabs = document.querySelector('.type-tabs');
  const usernameField = document.querySelector('#editorForm [name="username"]');
  if (currentUser.role !== 'admin') {
    if (typeTabs) typeTabs.style.display = 'none';
    if (usernameField) { usernameField.disabled = true; usernameField.title = 'O nome de usuário não pode ser alterado.'; }
  } else {
    if (typeTabs) typeTabs.style.display = '';
    if (usernameField) { usernameField.disabled = false; usernameField.title = ''; }
  }

  // Init Quill
  if (!quill) {
    quill = new Quill('#richEditor', {
      theme: 'snow',
      modules: {
        toolbar: [
          [{'header':[1,2,3,false]}],
          ['bold','italic','underline','strike'],
          ['link','blockquote','code-block','image'],
          [{'list':'ordered'},{'list':'bullet'}],
          [{'align':[]}],
          ['clean']
        ]
      }
    });
  }
  quill.root.dataset.placeholder = type === 'article' ? 'Escreva o conteúdo do artigo...' : (type === 'video' ? 'Descreva o vídeo...' : 'Escreva a bio do usuário...');
  quill.root.innerHTML = '';

  // Clear form
  document.getElementById('editorForm').reset();
  // Hide cover preview when opening a new form
  const coverPreview = document.getElementById('coverPreview');
  if (coverPreview) coverPreview.style.display = 'none';

  // If editing, load data
  if (id) {
    const endpoint = (type === 'article' || type === 'news') ? `/api/content/articles/${id}` : (type === 'video' ? `/api/content/videos/${id}` : (currentUser.role === 'admin' ? `/api/users` : `/api/users/me`));
    apiCall(endpoint).then(data => {
      const item = type === 'user' ? (data.users || []).find(u => u.id === id) : data;
      if (!item) return;

      document.querySelector('#editorForm [name="title"]').value = (type === 'user' ? item.full_name : item.title) || '';
      document.querySelector('#editorForm [name="author"]').value = (type === 'user' ? item.full_name : item.author) || '';
      
      if (type === 'article' || type === 'news') {
        document.querySelector('#editorForm [name="category"]').value = item.category || '';
        document.querySelector('#editorForm [name="status"]').value = item.status || 'draft';
        document.querySelector('#editorForm [name="excerpt"]').value = item.excerpt || '';
        document.querySelector('#editorForm [name="image_url"]').value = item.image_url || '';
        // Show cover preview if image exists
        if (item.image_url) {
          const preview = document.getElementById('coverPreview');
          const previewImg = document.getElementById('coverPreviewImg');
          if (preview && previewImg) { previewImg.src = item.image_url; preview.style.display = 'block'; }
        }
        quill.root.innerHTML = item.content || '';
      } else if (type === 'video') {
        document.querySelector('#editorForm [name="category"]').value = item.category || '';
        document.querySelector('#editorForm [name="status"]').value = item.status || 'draft';
        document.querySelector('#editorForm [name="video_url"]').value = item.video_url || '';
        document.querySelector('#editorForm [name="thumbnail_url"]').value = item.thumbnail_url || '';
        quill.root.innerHTML = item.description || '';
      } else if (type === 'user') {
        document.querySelector('#editorForm [name="username"]').value = item.username || '';
        document.querySelector('#editorForm [name="photo_url"]').value = item.photo_url || '';
        document.querySelector('#editorForm [name="role_name"]').value = item.role_name || '';
        document.querySelector('#editorForm [name="show_on_contact"]').checked = item.show_on_contact === 1;
        // Bio
        quill.root.innerHTML = item.bio || '';
        // Parse social links JSON into individual inputs
        let parsedLinks = [];
        try { parsedLinks = item.links ? JSON.parse(item.links) : []; } catch(e) {}
        const findLink = (type) => (parsedLinks.find(l => l.type === type) || {}).url || '';
        const ytVal  = findLink('youtube');
        const igVal  = findLink('instagram');
        const fbVal  = findLink('facebook');
        const emVal  = (() => { const l = parsedLinks.find(l => l.type === 'email'); return l ? (l.url || '').replace('mailto:','') : ''; })();
        const elYT = document.getElementById('link_youtube');   if (elYT) elYT.value = ytVal;
        const elIG = document.getElementById('link_instagram'); if (elIG) elIG.value = igVal;
        const elFB = document.getElementById('link_facebook');  if (elFB) elFB.value = fbVal;
        const elEM = document.getElementById('link_email');     if (elEM) elEM.value = emVal;
      }
    });
  }
}



function closeEditor() {
  document.getElementById('editorSection').classList.add('hidden');
  // Return to previous section
  const nav = document.querySelector(`.nav-item[data-section="${currentSection}"]`);
  if (nav) nav.click();
}

async function uploadPhoto(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    const data = await res.json();
    if (data.url) {
      document.querySelector('[name="photo_url"]').value = data.url;
      showToast('Foto enviada!');
    } else {
      throw new Error(data.error || 'Erro no upload');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function uploadCoverImage(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);

  // Show loading state
  const btn = input.previousElementSibling;
  const originalText = btn.textContent;
  btn.textContent = 'Enviando...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    const data = await res.json();
    if (data.url) {
      // Fill the URL field
      document.getElementById('imagemCapaUrl').value = data.url;
      // Show preview
      const preview = document.getElementById('coverPreview');
      const previewImg = document.getElementById('coverPreviewImg');
      previewImg.src = data.url;
      preview.style.display = 'block';
      showToast('Foto de capa enviada!');
    } else {
      throw new Error(data.error || 'Erro no upload');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}


async function saveEditor() {
  const form = document.getElementById('editorForm');
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  const content = quill.root.innerHTML;

  if (editingType === 'article' || editingType === 'news') {
    if (editingType === 'news') data.category = 'Notícias';
    data.content = content;
    const url = editingId ? `/api/content/articles/${editingId}` : '/api/content/articles';
    const method = editingId ? 'PUT' : 'POST';
    await apiCall(url, { method, body: JSON.stringify(data) });
  } else if (editingType === 'video') {
    data.description = content;
    if (data.video_url) {
      const m = data.video_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (m) data.thumbnail_url = `https://img.youtube.com/vi/${m[1]}/maxresdefault.jpg`;
    }
    const url = editingId ? `/api/content/videos/${editingId}` : '/api/content/videos';
    const method = editingId ? 'PUT' : 'POST';
    await apiCall(url, { method, body: JSON.stringify(data) });
  } else if (editingType === 'user') {
    data.bio = content;
    data.full_name = data.author; // Use author field as full_name for unity
    data.show_on_contact = form.querySelector('[name="show_on_contact"]').checked ? 1 : 0;
    // Build links JSON from individual social inputs
    const socialLinks = [];
    const ytUrl  = (document.getElementById('link_youtube')?.value   || '').trim();
    const igUrl  = (document.getElementById('link_instagram')?.value || '').trim();
    const fbUrl  = (document.getElementById('link_facebook')?.value  || '').trim();
    const emVal  = (document.getElementById('link_email')?.value     || '').trim();
    if (ytUrl) socialLinks.push({ type: 'youtube',   url: ytUrl, label: 'Canal YouTube' });
    if (igUrl) socialLinks.push({ type: 'instagram', url: igUrl, label: 'Instagram' });
    if (fbUrl) socialLinks.push({ type: 'facebook',  url: fbUrl, label: 'Facebook' });
    if (emVal) socialLinks.push({ type: 'email',     url: 'mailto:' + emVal.replace('mailto:',''), label: 'Email' });
    data.links = JSON.stringify(socialLinks);
    const url = editingId ? `/api/users/${editingId}` : '/api/users';
    const method = editingId ? 'PUT' : 'POST';
    await apiCall(url, { method, body: JSON.stringify(data) });
  }
  showToast('Salvo com sucesso!');
  closeEditor();
}

// ========================================
// USER MODAL (simple)
// ========================================
// ========================================
// NAVIGATION
// ========================================
document.querySelectorAll('.nav-item').forEach(item => {
  item.onclick = () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const section = item.dataset.section;
    currentSection = section;
    document.querySelectorAll('[id$="Section"]').forEach(s => s.classList.add('hidden'));
    document.getElementById(`${section}Section`).classList.remove('hidden');
    if (section === 'dashboard') loadDashboard();
    else if (section === 'analytics') loadAnalytics();
    else if (section === 'articles') loadArticles();
    else if (section === 'videos') loadVideos();
    else if (section === 'news') loadNews();
    else if (section === 'partners') { loadPartners(); loadSocialLinks(); }
    else if (section === 'moderation') loadModeration();
    else if (section === 'users') loadUsers();
    else if (section === 'inbox') loadMessages();
  };
});

// Period buttons
document.querySelectorAll('.period-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadAnalytics();
  };
});

document.getElementById('logoutBtn').onclick = () => { localStorage.removeItem('token'); window.location.href = '/login.html'; };

// ========================================
// INBOX (Messages)
// ========================================
let allMessages = [];
let currentMessageId = null;

async function loadMessages() {
  allMessages = await apiCall('/api/messages');
  renderMessageList();
}

function renderMessageList() {
  const list = document.getElementById('messageList');
  list.innerHTML = allMessages.map(m => {
    const isSponsor = m.source === 'Patrocinador';
    const badgeColor = isSponsor ? '#e50914' : '#f59e0b';
    return `
      <div class="message-item ${m.status === 'unread' ? 'unread' : ''} ${currentMessageId === m.id ? 'active' : ''}" 
           onclick="viewMessage(${m.id})" 
           style="padding:1.5rem; border-bottom:1px solid #1e1e1e; cursor:pointer; transition:all 0.2s; position:relative; ${m.status === 'unread' ? 'background: rgba(229,9,20,0.02);' : ''}">
        
        ${m.status === 'unread' ? `<div style="position:absolute; left:0; top:0; bottom:0; width:3px; background:${badgeColor};"></div>` : ''}
        
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
          <span style="font-weight:700; color:#fff; font-size:0.95rem;">${m.name}</span>
          <span style="font-size:0.75rem; color:#555;">${new Date(m.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:0.5rem;">
           <span style="font-size:0.65rem; color:#fff; background:${badgeColor}; padding:2px 6px; border-radius:4px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">${m.source}</span>
           <span style="font-size:0.85rem; color:#888; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;">${m.subject || '(Sem assunto)'}</span>
        </div>
        
        <div style="font-size:0.8rem; color:#555; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.content.substring(0, 60)}...</div>
      </div>
    `;
  }).join('') || '<div style="padding:4rem; color:#444; text-align:center; font-style:italic;">Nenhuma mensagem recebida.</div>';
}

async function viewMessage(id) {
  currentMessageId = id;
  const m = allMessages.find(msg => msg.id === id);
  if (!m) return;

  renderMessageList();

  const isSponsor = m.source === 'Patrocinador';
  const accentColor = isSponsor ? '#e50914' : '#f59e0b';

  const detail = document.getElementById('messageDetailContent');
  detail.innerHTML = `
    <div class="fade-in" style="animation: fadeIn 0.3s ease-out;">
      <div style="margin-bottom:2.5rem; border-bottom:1px solid #1e1e1e; padding-bottom:1.5rem;">
        <div style="display:inline-block; font-size:0.75rem; color:#fff; background:${accentColor}; padding:4px 10px; border-radius:4px; font-weight:800; text-transform:uppercase; margin-bottom:1rem;">${m.source}</div>
        <h2 style="font-size:2.25rem; font-weight:800; color:#fff; margin-bottom:1.5rem; letter-spacing:-0.02em;">${m.subject || '(Sem assunto)'}</h2>
        
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.5rem; background:rgba(255,255,255,0.02); padding:1.5rem; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
          <div>
            <div style="font-size:0.7rem; color:#555; text-transform:uppercase; font-weight:800; margin-bottom:0.25rem;">Remetente</div>
            <div style="font-weight:700; color:#fff;">${m.name}</div>
          </div>
          <div>
            <div style="font-size:0.7rem; color:#555; text-transform:uppercase; font-weight:800; margin-bottom:0.25rem;">E-mail</div>
            <div style="font-weight:600; color:${accentColor};">${m.email || 'N/A'}</div>
          </div>
          <div>
            <div style="font-size:0.7rem; color:#555; text-transform:uppercase; font-weight:800; margin-bottom:0.25rem;">Recebido em</div>
            <div style="color:#aaa;">${new Date(m.created_at).toLocaleString('pt-BR')}</div>
          </div>
        </div>
      </div>
      
      <div style="color:#ddd; line-height:1.8; font-size:1.15rem; white-space:pre-wrap; background:#0a0a0a; padding:2rem; border-radius:12px; border:1px solid #1e1e1e; min-height:200px;">${m.content}</div>
    </div>
  `;

  document.getElementById('messageDetailActions').style.display = 'flex';

  if (m.status === 'unread') {
    await apiCall(`/api/messages/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'read' }) });
    m.status = 'read';
    renderMessageList();
  }
}

async function markMessageUnread() {
  if (!currentMessageId) return;
  await apiCall(`/api/messages/${currentMessageId}`, { method: 'PUT', body: JSON.stringify({ status: 'unread' }) });
  showToast('Mensagem marcada como não lida');
  loadMessages();
}

async function deleteMessage() {
  if (!currentMessageId || !confirm('Excluir esta mensagem permanentemente?')) return;
  await apiCall(`/api/messages/${currentMessageId}`, { method: 'DELETE' });
  showToast('Mensagem excluída');
  currentMessageId = null;
  document.getElementById('messageDetailContent').innerHTML = '<p style="color:#666;text-align:center;margin-top:100px;">Selecione uma mensagem para ler</p>';
  document.getElementById('messageDetailActions').style.display = 'none';
  loadMessages();
}

// ========================================
// PARTNERS MANAGEMENT
// ========================================
async function loadPartners() {
  try {
    const sponsors = await apiCall('/api/partners/sponsors');
    const supporters = await apiCall('/api/partners/supporters');

    document.getElementById('sponsorsList').innerHTML = sponsors.map(s => {
      const ig = s.instagram ? s.instagram.replace('@','') : '';
      const web = s.website ? s.website.replace(/^https?:\/\//,'').replace(/\/$/,'') : '';
      return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${s.logo_url || '/logo.png'}" style="width:30px;height:30px;object-fit:contain;">
            ${s.name}
          </div>
        </td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${s.description || ''}">${s.description || '-'}</td>
        <td>${s.tier}</td>
        <td>${s.instagram ? '<a href="https://instagram.com/' + ig + '" target="_blank" style="color:#e1306c;">' + s.instagram + '</a>' : '-'}</td>
        <td>${s.website ? '<a href="' + s.website + '" target="_blank" style="color:#4dabf7;">' + web + '</a>' : '-'}</td>
        <td><span class="status-badge status-${s.status === 'active' ? 'published' : 'draft'}">${s.status}</span></td>
        <td class="actions">
          <button class="btn btn-sm" onclick="openPartnerEditor('sponsor', ${s.id})">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletePartner('sponsor', ${s.id})">Excluir</button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="empty-state">Nenhum patrocinador</td></tr>';

    document.getElementById('supportersList').innerHTML = supporters.map(s => {
      const ig = s.instagram ? s.instagram.replace('@','') : '';
      const web = s.website ? s.website.replace(/^https?:\/\//,'').replace(/\/$/,'') : '';
      return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${s.photo_url || '/logo.png'}" style="width:30px;height:30px;object-fit:cover;border-radius:50%;">
            ${s.name}
          </div>
        </td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${s.description || ''}">${s.description || '-'}</td>
        <td>${s.tier}</td>
        <td>${s.instagram ? '<a href="https://instagram.com/' + ig + '" target="_blank" style="color:#e1306c;">' + s.instagram + '</a>' : '-'}</td>
        <td>${s.website ? '<a href="' + s.website + '" target="_blank" style="color:#4dabf7;">' + web + '</a>' : '-'}</td>
        <td><span class="status-badge status-${s.status === 'active' ? 'published' : 'draft'}">${s.status}</span></td>
        <td class="actions">
          <button class="btn btn-sm" onclick="openPartnerEditor('supporter', ${s.id})">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deletePartner('supporter', ${s.id})">Excluir</button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="empty-state">Nenhum apoiador</td></tr>';
  } catch (e) { console.error('Load partners error:', e); }
}

function openPartnerEditor(type, id) {
  const modal = document.getElementById('partnerModal');
  const form = document.getElementById('partnerForm');
  form.reset();
  
  document.getElementById('partnerId').value = id || '';
  document.getElementById('partnerType').value = type;
  document.getElementById('partnerModalTitle').textContent = (id ? 'Editar ' : 'Novo ') + (type === 'sponsor' ? 'Patrocinador' : 'Apoiador');
  document.getElementById('partnerNameLabel').textContent = type === 'sponsor' ? 'Nome da Empresa' : 'Nome do Apoiador';
  document.getElementById('partnerImageLabel').textContent = type === 'sponsor' ? 'URL da Logomarca' : 'URL da Foto';

  document.getElementById('partnerImagePreview').style.display = 'none';

  if (id) {
    const table = type === 'sponsor' ? 'sponsors' : 'supporters';
    apiCall(`/api/partners/${table}`).then(list => {
      const item = list.find(i => i.id === id);
      if (item) {
        document.getElementById('partnerName').value = item.name || '';
        document.getElementById('partnerDescription').value = item.description || '';
        document.getElementById('partnerImage').value = type === 'sponsor' ? (item.logo_url || '') : (item.photo_url || '');
        document.getElementById('partnerTier').value = item.tier;
        document.getElementById('partnerInstagram').value = item.instagram || '';
        document.getElementById('partnerWebsite').value = item.website || '';
        document.getElementById('partnerStatus').value = item.status;
        const imgUrl = type === 'sponsor' ? item.logo_url : item.photo_url;
        if (imgUrl) {
          document.getElementById('partnerImagePreviewImg').src = imgUrl;
          document.getElementById('partnerImagePreview').style.display = 'block';
        }
      }
    });
  }
  
  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.add('active'), 10);
}

function closePartnerModal() {
  const modal = document.getElementById('partnerModal');
  modal.classList.remove('active');
  setTimeout(() => modal.classList.add('hidden'), 200);
}

async function savePartner() {
  const id = document.getElementById('partnerId').value;
  const type = document.getElementById('partnerType').value;
  const table = type === 'sponsor' ? 'sponsors' : 'supporters';
  
  const data = {
    name: document.getElementById('partnerName').value,
    description: document.getElementById('partnerDescription').value || null,
    tier: document.getElementById('partnerTier').value,
    status: document.getElementById('partnerStatus').value,
    instagram: document.getElementById('partnerInstagram').value || null,
    website: document.getElementById('partnerWebsite').value || null
  };

  if (type === 'sponsor') data.logo_url = document.getElementById('partnerImage').value;
  else data.photo_url = document.getElementById('partnerImage').value;

  try {
    const method = id ? 'PUT' : 'POST';
    const url = `/api/partners/${table}${id ? '/' + id : ''}`;
    await apiCall(url, { method, body: JSON.stringify(data) });
    showToast('Salvo com sucesso!');
    closePartnerModal();
    loadPartners();
  } catch (e) { showToast(e.message, 'error'); }
}

async function deletePartner(type, id) {
  if (!confirm('Excluir este parceiro?')) return;
  const table = type === 'sponsor' ? 'sponsors' : 'supporters';
  try {
    await apiCall(`/api/partners/${table}/${id}`, { method: 'DELETE' });
    showToast('Excluído!');
    loadPartners();
  } catch (e) { showToast(e.message, 'error'); }
}

async function uploadPartnerImage(input) {
  if (!input.files || !input.files[0]) return;
  const formData = new FormData();
  formData.append('file', input.files[0]);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    const data = await res.json();
    if (data.url) {
      document.getElementById('partnerImage').value = data.url;
      showToast('Upload concluído!');
    }
  } catch (e) { showToast('Erro no upload', 'error'); }
}

// ========================================
// SOCIAL LINKS (Apoie Page)
// ========================================
let socialLinksData = [];

async function loadSocialLinks() {
  try {
    socialLinksData = await apiCall('/api/settings/social-links');
    renderSocialLinks();
  } catch (e) { console.error('Load social links error:', e); }
}

function renderSocialLinks() {
  const el = document.getElementById('socialLinksEditor');
  if (!socialLinksData.length) {
    el.innerHTML = '<p style="color:#666;text-align:center;padding:20px;">Nenhuma rede social configurada.</p>';
    return;
  }
  el.innerHTML = socialLinksData.map((link, i) => `
    <div style="display:grid;grid-template-columns:60px 1fr 1fr 1fr auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #222;">
      <input type="text" class="form-input" value="${link.icon || ''}" placeholder="Emoji" data-idx="${i}" data-field="icon" style="text-align:center;">
      <input type="text" class="form-input" value="${link.platform || ''}" placeholder="Plataforma" data-idx="${i}" data-field="platform">
      <input type="text" class="form-input" value="${link.handle || ''}" placeholder="Handle / Texto" data-idx="${i}" data-field="handle">
      <input type="text" class="form-input" value="${link.url || ''}" placeholder="URL" data-idx="${i}" data-field="url">
      <button class="btn btn-sm btn-danger" onclick="removeSocialLink(${i})">X</button>
    </div>
  `).join('');
}

function addSocialLink() {
  socialLinksData.push({ icon: '', platform: '', handle: '', url: '' });
  renderSocialLinks();
}

function removeSocialLink(idx) {
  socialLinksData.splice(idx, 1);
  renderSocialLinks();
}

async function saveSocialLinks() {
  const inputs = document.querySelectorAll('#socialLinksEditor input[data-idx]');
  inputs.forEach(inp => {
    const idx = parseInt(inp.dataset.idx);
    const field = inp.dataset.field;
    socialLinksData[idx][field] = inp.value;
  });
  try {
    await apiCall('/api/settings/social-links', { method: 'PUT', body: JSON.stringify(socialLinksData) });
    showToast('Redes sociais salvas!');
  } catch (e) { showToast(e.message, 'error'); }
}

// Init
checkAuth().then(loadDashboard);
