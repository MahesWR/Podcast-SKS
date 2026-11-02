const API_URL = '/api/episodes';
const AUTH_URL = '/api/login';

let episodes = [];
let originalEpisodes = []; // Untuk fitur batal perubahan
let hasChanges = false;
let settings = {};
let originalSettings = {};
let settingsChanged = false;
let hosts = [];
let originalHosts = [];

const saveBar = document.getElementById('save-bar');
const btnApplyChanges = document.getElementById('btn-save-changes');

// Auth Logic
const loginOverlay = document.getElementById('login-overlay');
const adminContent = document.getElementById('admin-main-content');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

// Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'info') icon = 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('active'), 10);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}
window.showToast = showToast;

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
        
        // Refresh analytics if moving to dashboard
        if (tabId === 'tab-dashboard') {
            updateAnalytics();
        }
    });
});

function checkAuth() {
    const token = sessionStorage.getItem('admin_token');
    console.log('Checking auth, token present:', !!token);
    
    // Re-fetch elements if they are null (safeguard)
    const overlay = document.getElementById('login-overlay');
    const content = document.getElementById('admin-main-content');
    
    if (token) {
        if (overlay) overlay.style.display = 'none';
        if (content) content.style.display = 'block';
        fetchEpisodes();
        fetchSettings();
        fetchHosts();
    } else {
        if (overlay) overlay.style.display = 'flex';
        if (content) content.style.display = 'none';
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    
    try {
        const response = await fetch(AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password })
        });
        const result = await response.json();
        
        if (result.success) {
            console.log('Login successful, setting token...');
            sessionStorage.setItem('admin_token', result.token);
            showToast('Login berhasil! Selamat datang Admin.', 'success');
            setTimeout(() => {
                console.log('Triggering checkAuth via timeout');
                checkAuth();
            }, 100);
        } else {
            loginError.style.display = 'block';
            showToast('Password salah!', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Terjadi kesalahan koneksi.', 'error');
    }
});

function logout() {
    if (confirm('Logout sekarang?')) {
        sessionStorage.removeItem('admin_token');
        location.reload();
    }
}
window.logout = logout;

// --- SETTINGS MANAGEMENT ---
async function fetchSettings() {
    try {
        const response = await fetch('/api/settings');
        settings = await response.json();
        originalSettings = JSON.parse(JSON.stringify(settings));
        
        document.querySelectorAll('[data-key]').forEach(input => {
            const key = input.getAttribute('data-key');
            if (settings[key] !== undefined) {
                input.value = settings[key];
            }
            
            // Add change listener to settings inputs
            input.removeEventListener('input', detectSettingsChange);
            input.addEventListener('input', detectSettingsChange);
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
    }
}

function detectSettingsChange() {
    hasChanges = true;
    settingsChanged = true;
    updateSaveBar();
}

function updateStatsAutoValues() {
    if (episodes && episodes.length > 0) {
        const totalLikes = episodes.reduce((acc, ep) => acc + (ep.likes || 0), 0);
        const stat3Input = document.querySelector('[data-key="about_stat3_value"]');
        if (stat3Input) {
            stat3Input.value = totalLikes;
            settings['about_stat3_value'] = totalLikes;
        }
    }
}

// Standalone settings save removed, now handled by btnApplyChanges

// --- EPISODE MANAGEMENT ---
const tableBody = document.getElementById('episodes-table-body');
const modal = document.getElementById('episode-modal');
const btnAdd = document.getElementById('btn-add-episode');
const btnClose = document.getElementById('btn-close-modal');
const btnCancel = document.getElementById('btn-cancel');
const form = document.getElementById('episode-form');

async function fetchEpisodes() {
    try {
        const response = await fetch(API_URL);
        episodes = await response.json();
        originalEpisodes = JSON.parse(JSON.stringify(episodes));
        hasChanges = false;
        updateSaveBar();
        renderTable();
        updateStatsAutoValues();
        updateAnalytics(); // New function
    } catch (error) {
        console.error('Error fetching episodes:', error);
    }
}

function updateAnalytics() {
    const totalEp = episodes.length;
    const totalLikes = episodes.reduce((acc, ep) => acc + (ep.likes || 0), 0);
    const totalHosts = hosts.length;
    
    // Top Episode
    let topEp = '-';
    if (episodes.length > 0) {
        const sorted = [...episodes].sort((a, b) => (b.likes || 0) - (a.likes || 0));
        topEp = sorted[0].title;
        
        // Render Leaderboard
        const leaderboardBody = document.getElementById('analytics-leaderboard');
        if (leaderboardBody) {
            leaderboardBody.innerHTML = '';
            const maxLikes = sorted[0].likes || 1;
            sorted.slice(0, 5).forEach(ep => {
                const percentage = ((ep.likes || 0) / maxLikes) * 100;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${ep.title}</strong></td>
                    <td>${ep.likes || 0}</td>
                    <td>
                        <div class="popularity-bar">
                            <div class="popularity-fill" style="width: ${percentage}%"></div>
                        </div>
                    </td>
                `;
                leaderboardBody.appendChild(tr);
            });
        }
    }

    // Update UI
    const elTotalEp = document.getElementById('stat-total-ep');
    const elTotalLikes = document.getElementById('stat-total-likes');
    const elTotalHosts = document.getElementById('stat-total-hosts');
    const elTopEp = document.getElementById('stat-top-episode');

    if (elTotalEp) elTotalEp.textContent = totalEp;
    if (elTotalLikes) elTotalLikes.textContent = totalLikes;
    if (elTotalHosts) elTotalHosts.textContent = totalHosts;
    if (elTopEp) elTopEp.textContent = topEp;

    // Fetch and show recent like logs
    fetchLikeLogs();
}

async function fetchLikeLogs() {
    try {
        const response = await fetch('/api/analytics/likes');
        const logs = await response.json();
        renderLikeLogs(logs);
    } catch (error) {
        console.error('Error fetching like logs:', error);
    }
}

function renderLikeLogs(logs) {
    const body = document.getElementById('like-logs-body');
    if (!body) return;
    body.innerHTML = '';
    
    if (logs.length === 0) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">Belum ada riwayat like tercatat.</td></tr>';
        return;
    }
    
    logs.forEach(log => {
        const date = new Date(log.timestamp);
        const dateStr = date.toLocaleString('id-ID', { 
            day: '2-digit', 
            month: 'short', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Parse user agent for device
        let device = 'Desktop';
        let icon = 'fa-laptop';
        const ua = log.userAgent || '';
        if (ua.includes('Android')) {
            device = 'Android';
            icon = 'fa-android';
        } else if (ua.includes('iPhone') || ua.includes('iPad')) {
            device = 'iOS';
            icon = 'fa-apple';
        }
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="ep-num" style="font-size:0.75rem;"><i class="far fa-clock"></i> ${dateStr}</span></td>
            <td><strong>${log.episodeTitle}</strong></td>
            <td>
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <i class="fab ${icon}" style="color:var(--text-muted);"></i>
                    <span style="font-size:0.85rem;">${device}</span>
                </div>
            </td>
            <td style="font-family: monospace; font-size: 0.8rem; color: var(--text-muted);">${log.ip}</td>
        `;
        body.appendChild(tr);
    });
}

function renderTable() {
    if (!tableBody) return;
    tableBody.innerHTML = '';
    
    const searchVal = document.getElementById('admin-search').value.toLowerCase();
    const filterVal = document.getElementById('admin-filter').value;
    
    const filteredEpisodes = episodes.filter(ep => {
        // Search filter
        const matchesSearch = ep.title.toLowerCase().includes(searchVal) || 
                              ep.number.toLowerCase().includes(searchVal);
        
        // Status filter
        let matchesFilter = true;
        if (filterVal === 'published') matchesFilter = !ep.comingSoon;
        if (filterVal === 'coming-soon') matchesFilter = ep.comingSoon;
        
        return matchesSearch && matchesFilter;
    });
    
    filteredEpisodes.forEach((ep) => {
        const tr = document.createElement('tr');
        // Find actual index in global episodes array for move actions
        const actualIndex = episodes.findIndex(e => e.id === ep.id);
        
        tr.innerHTML = `
            <td>
                <div class="order-controls">
                    <button class="btn-icon" onclick="moveEpisode(${actualIndex}, 'up')" ${actualIndex === 0 ? 'disabled style="opacity:0.3"' : ''}><i class="fas fa-chevron-up"></i></button>
                    <button class="btn-icon" onclick="moveEpisode(${actualIndex}, 'down')" ${actualIndex === episodes.length - 1 ? 'disabled style="opacity:0.3"' : ''}><i class="fas fa-chevron-down"></i></button>
                </div>
            </td>
            <td><img src="${ep.image}" class="table-img" onerror="this.src='assets/Logo Podcast 32.jpg'"></td>
            <td>
                <div class="ep-info">
                    <span class="ep-num">${ep.number}</span>
                    <span class="ep-title">${ep.title}</span>
                </div>
            </td>
            <td>
                <div class="tags-container">${ep.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}</div>
                ${ep.comingSoon ? '<span class="tag coming-soon">Coming Soon</span>' : '<span class="tag published">Published</span>'}
            </td>
            <td>
                <div style="font-weight: 700; color: #ef4444;"><i class="fas fa-heart"></i> ${ep.likes || 0}</div>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="editEpisode(${actualIndex})"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon delete" onclick="deleteEpisode(${ep.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// Add Filter Event Listeners
document.getElementById('admin-search').addEventListener('input', renderTable);
document.getElementById('admin-filter').addEventListener('change', renderTable);

window.moveEpisode = (index, direction) => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= episodes.length) return;
    [episodes[index], episodes[target]] = [episodes[target], episodes[index]];
    hasChanges = true;
    updateSaveBar();
    renderTable();
};

window.editEpisode = (index) => {
    const ep = episodes[index];
    document.getElementById('ep-id').value = ep.id;
    document.getElementById('ep-number').value = ep.number;
    document.getElementById('ep-date').value = ep.date;
    document.getElementById('ep-title').value = ep.title;
    document.getElementById('ep-desc').value = ep.description;
    document.getElementById('ep-image').value = ep.image;
    document.getElementById('ep-tags').value = ep.tags.join(', ');
    document.getElementById('ep-audio').value = ep.audioSrc;
    document.getElementById('ep-youtube').value = ep.youtubeLink;
    document.getElementById('ep-spotify').value = ep.spotifyLink;
    document.getElementById('ep-featured').checked = ep.featured;
    document.getElementById('ep-coming-soon').checked = ep.comingSoon;
    
    document.getElementById('modal-title').innerText = 'Edit Episode';
    form.setAttribute('data-edit-index', index);
    modal.classList.add('active');
};

btnAdd.addEventListener('click', () => {
    form.reset();
    document.getElementById('ep-id').value = '';
    document.getElementById('modal-title').innerText = 'Tambah Episode Baru';
    form.removeAttribute('data-edit-index');
    modal.classList.add('active');
});

const closeModal = () => modal.classList.remove('active');
btnClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const editIndex = form.getAttribute('data-edit-index');
    
    const epData = {
        id: document.getElementById('ep-id').value || 0,
        number: document.getElementById('ep-number').value,
        date: document.getElementById('ep-date').value,
        title: document.getElementById('ep-title').value,
        description: document.getElementById('ep-desc').value,
        image: document.getElementById('ep-image').value,
        tags: document.getElementById('ep-tags').value.split(',').map(s => s.trim()),
        audioSrc: document.getElementById('ep-audio').value,
        youtubeLink: document.getElementById('ep-youtube').value,
        spotifyLink: document.getElementById('ep-spotify').value,
        featured: document.getElementById('ep-featured').checked,
        comingSoon: document.getElementById('ep-coming-soon').checked
    };

    if (editIndex !== null) {
        episodes[editIndex] = { ...episodes[editIndex], ...epData };
    } else {
        episodes.push(epData);
    }

    hasChanges = true;
    updateSaveBar();
    renderTable();
    updateStatsAutoValues();
    closeModal();
});

window.deleteEpisode = (id) => {
    if(confirm('Yakin ingin menghapus episode?')) {
        episodes = episodes.filter(e => e.id !== id);
        hasChanges = true;
        updateSaveBar();
        renderTable();
    }
};

function updateSaveBar() {
    saveBar.classList.toggle('active', hasChanges);
}

window.revertChanges = () => {
    if(confirm('Batalkan semua perubahan yang belum disimpan?')) {
        // Revert Episodes
        episodes = JSON.parse(JSON.stringify(originalEpisodes));
        
        // Revert Settings
        settings = JSON.parse(JSON.stringify(originalSettings));
        document.querySelectorAll('[data-key]').forEach(input => {
            const key = input.getAttribute('data-key');
            if (settings[key] !== undefined) {
                input.value = settings[key];
            }
        });
        
        hasChanges = false;
        settingsChanged = false;
        updateSaveBar();
        renderTable();
    }
};

btnApplyChanges.addEventListener('click', async () => {
    try {
        // 1. Save Settings if changed
        if (settingsChanged) {
            const newSettings = {};
            document.querySelectorAll('[data-key]').forEach(input => {
                newSettings[input.getAttribute('data-key')] = input.value;
            });

            const sResponse = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });
            if (sResponse.ok) {
                settings = newSettings;
                originalSettings = JSON.parse(JSON.stringify(newSettings));
                settingsChanged = false;
            }
        }

        // 2. Save Episodes
        const eResponse = await fetch('/api/episodes/batch-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episodes: episodes.map((ep, i) => ({ ...ep, position: i })) })
        });
        
        if (eResponse.ok) {
            showToast('Semua perubahan berhasil diterapkan pada website!', 'success');
            fetchEpisodes();
        }
    } catch (error) {
        console.error('Error applying changes:', error);
        showToast('Terjadi kesalahan saat menyimpan perubahan.', 'error');
    }
});

// --- HOST MANAGEMENT ---
const hostTableBody = document.getElementById('hosts-table-body');
const hostModal = document.getElementById('host-modal');
const btnAddHost = document.getElementById('btn-add-host');
const btnCloseHostModal = document.getElementById('btn-close-host-modal');
const btnCancelHost = document.getElementById('btn-cancel-host');
const hostForm = document.getElementById('host-form');

async function fetchHosts() {
    try {
        const response = await fetch('/api/hosts');
        hosts = await response.json();
        originalHosts = JSON.parse(JSON.stringify(hosts));
        renderHostsTable();
        updateAnalytics(); // Refresh analytics when hosts are loaded
    } catch (error) {
        console.error('Error fetching hosts:', error);
    }
}

function renderHostsTable() {
    if (!hostTableBody) return;
    hostTableBody.innerHTML = '';
    
    hosts.forEach((host, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="order-controls">
                    <button class="btn-icon" onclick="moveHost(${index}, 'up')" ${index === 0 ? 'disabled style="opacity:0.3"' : ''}><i class="fas fa-chevron-up"></i></button>
                    <button class="btn-icon" onclick="moveHost(${index}, 'down')" ${index === hosts.length - 1 ? 'disabled style="opacity:0.3"' : ''}><i class="fas fa-chevron-down"></i></button>
                </div>
            </td>
            <td><img src="${host.image}" style="width:50px; height:50px; border-radius:50%; object-fit:cover;" onerror="this.src='assets/Logo Podcast 32.jpg'"></td>
            <td><strong>${host.name}</strong></td>
            <td>${host.role}</td>
            <td><a href="${host.igLink}" target="_blank">${host.igLink ? 'Link IG' : '-'}</a></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="editHost(${index})"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon delete" onclick="deleteHost(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        `;
        hostTableBody.appendChild(tr);
    });
}

window.moveHost = (index, direction) => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= hosts.length) return;
    [hosts[index], hosts[target]] = [hosts[target], hosts[index]];
    hosts.forEach((h, i) => h.position = i);
    saveHosts();
};

window.editHost = (index) => {
    const host = hosts[index];
    document.getElementById('host-modal-title').innerText = 'Edit Host';
    document.getElementById('host-id').value = host.id || '';
    document.getElementById('host-name').value = host.name;
    document.getElementById('host-role').value = host.role;
    document.getElementById('host-image').value = host.image;
    document.getElementById('host-ig').value = host.igLink || '';
    hostForm.setAttribute('data-edit-index', index);
    hostModal.classList.add('active');
};

window.deleteHost = (index) => {
    if (confirm('Hapus host ini?')) {
        hosts.splice(index, 1);
        saveHosts();
    }
};

btnAddHost.addEventListener('click', () => {
    hostForm.reset();
    document.getElementById('host-id').value = '';
    document.getElementById('host-modal-title').innerText = 'Tambah Host Baru';
    hostForm.removeAttribute('data-edit-index');
    hostModal.classList.add('active');
});

const closeHostModal = () => hostModal.classList.remove('active');
btnCloseHostModal.addEventListener('click', closeHostModal);
btnCancelHost.addEventListener('click', closeHostModal);

hostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editIndex = hostForm.getAttribute('data-edit-index');
    const hostData = {
        id: document.getElementById('host-id').value || 0,
        name: document.getElementById('host-name').value,
        role: document.getElementById('host-role').value,
        image: document.getElementById('host-image').value,
        igLink: document.getElementById('host-ig').value,
    };

    if (editIndex !== null) {
        hosts[editIndex] = { ...hosts[editIndex], ...hostData };
    } else {
        hostData.position = hosts.length;
        hosts.push(hostData);
    }

    await saveHosts();
    closeHostModal();
});

async function saveHosts() {
    try {
        const response = await fetch('/api/hosts/batch-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hosts })
        });
        if (response.ok) {
            fetchHosts();
        }
    } catch (error) {
        console.error('Error saving hosts:', error);
    }
}

// Upload Helpers
async function uploadFile(inputId, targetInputId) {
    const fileInput = document.getElementById(inputId);
    if (!fileInput.files || fileInput.files.length === 0) return;
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (result.success) {
            document.getElementById(targetInputId).value = result.filePath;
        }
    } catch (error) {
        console.error('Upload error:', error);
    }
}

document.getElementById('upload-image').addEventListener('change', () => uploadFile('upload-image', 'ep-image'));
document.getElementById('upload-audio').addEventListener('change', () => uploadFile('upload-audio', 'ep-audio'));
document.getElementById('upload-host-image').addEventListener('change', () => uploadFile('upload-host-image', 'host-image'));

// --- GOOGLE DRIVE HELPER ---
function formatDriveLink(url) {
    if (!url) return '';
    
    // Pattern 1: sharing links (file/d/ID/view)
    const shareMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (shareMatch && shareMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${shareMatch[1]}`;
    }
    
    // Pattern 2: open?id=ID links
    const openMatch = url.match(/id=([a-zA-Z0-9_-]+)/);
    if (openMatch && openMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
    }
    
    return url; // Return original if no match
}

window.promptDriveLink = function(targetId) {
    const link = prompt('Masukkan Link Google Drive yang sudah di-share (Akses Publik):');
    if (link) {
        const formatted = formatDriveLink(link);
        document.getElementById(targetId).value = formatted;
        showToast('Link Drive berhasil dikoversi ke format direct!', 'success');
    }
};

// Auto-convert on paste/input
['ep-image', 'host-image'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val.includes('drive.google.com')) {
                e.target.value = formatDriveLink(val);
                showToast('Link Drive terdeteksi dan dikonversi otomatis.', 'info');
            }
        });
    }
});

// Initial Check
checkAuth();
