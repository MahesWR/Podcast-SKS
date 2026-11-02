const API_URL = '/api/episodes';

// Like Helper Functions
function getLikedEpisodes() {
    return JSON.parse(localStorage.getItem('liked_episodes') || '[]');
}

function toggleEpisodeLike(id) {
    let liked = getLikedEpisodes();
    const index = liked.indexOf(id);
    if (index === -1) {
        liked.push(id);
        localStorage.setItem('liked_episodes', JSON.stringify(liked));
        return 'like';
    } else {
        liked.splice(index, 1);
        localStorage.setItem('liked_episodes', JSON.stringify(liked));
        return 'unlike';
    }
}

// Mobile Menu Toggle
const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('.nav-menu');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Hide mobile menu on link click
document.querySelectorAll('.nav-links').forEach(link => {
    link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Scroll animations (Intersection Observer)
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

function observeElements() {
    document.querySelectorAll('.glass-card, .section-title, .hero-content, .hero-image, .episode-card').forEach((element) => {
        element.classList.add('hidden');
        observer.observe(element);
    });
}

observeElements(); // Initial call for existing elements

// NavBar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Global Data for Filtering
let allEpisodes = [];
let currentFilter = 'all';
let searchQuery = '';

// Dynamic Episode Fetching
async function loadEpisodes() {
    const container = document.getElementById('episodes-container');
    
    // Show Skeletons
    container.innerHTML = Array(3).fill('<div class="skeleton skeleton-card"></div>').join('');
    
    try {
        const response = await fetch(API_URL);
        allEpisodes = await response.json();
        
        // Update Stats with real data
        const statEpisodes = document.getElementById('about-stat1-value');
        if (statEpisodes) {
            statEpisodes.setAttribute('data-target', allEpisodes.length);
        }
        
        const statLikes = document.getElementById('about-stat3-value');
        if (statLikes) {
            const totalLikes = allEpisodes.reduce((acc, ep) => acc + (ep.likes || 0), 0);
            statLikes.setAttribute('data-target', totalLikes);
        }

        // Initialize Counter Animation
        initStatsCounter();
        
        renderEpisodes();

    } catch (error) {
        console.error('Error loading episodes:', error);
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #ef4444;">Gagal memuat episode. Pastikan server aktif.</p>';
    }
}

function renderEpisodes() {
    const container = document.getElementById('episodes-container');
    container.innerHTML = '';

    const filtered = allEpisodes.filter(ep => {
        const matchesFilter = currentFilter === 'all' || (ep.tags && ep.tags.some(t => t.toLowerCase() === currentFilter.toLowerCase()));
        const matchesSearch = ep.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             ep.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">Tidak ada episode yang sesuai dengan pencarian Anda.</p>';
        return;
    }

    filtered.forEach(ep => {
        const card = document.createElement('div');
        card.className = `episode-card glass-card ${ep.featured ? 'featured-episode' : ''}`;
        
        let mediaContent = '';
        if (ep.comingSoon) {
            mediaContent = `
                <div class="coming-soon-badge">
                    <div style="text-align: center; color: white;"><i class="fas fa-lock" style="transform: scale(1);"></i><span style="display:block; font-size:1rem; margin-top:10px; font-weight:bold;">Segera Hadir</span></div>
                </div>
            `;
        } else if (ep.audioSrc) {
            mediaContent = `
                <div class="play-overlay play-episode-btn" data-audio="${ep.audioSrc}" data-title="${ep.title}" data-image="${ep.image}" style="cursor: pointer;">
                    <div style="text-align: center; color: white;"><i class="fas fa-play"></i></div>
                </div>
            `;
        }

        const playbackUI = ep.comingSoon 
            ? `<div class="playback-options" style="margin-top: auto;">
                    <button class="btn-small" style="background: var(--border-color); color: var(--text-muted); width: 100%; justify-content: center; cursor: not-allowed;" disabled><i class="fas fa-clock"></i> Belum Tersedia</button>
               </div>`
            : `<div class="playback-options">
                    ${ep.audioSrc ? `<button class="btn-small play-episode-btn" data-audio="${ep.audioSrc}" data-title="${ep.title}" data-image="${ep.image}" style="background: var(--primary); color: white; width: 100%; justify-content: center;"><i class="fas fa-play"></i> Putar Episode</button>` : ''}
                    <div class="external-play" style="justify-content: center; margin-top: 5px;">
                        ${ep.youtubeLink ? `<a href="${ep.youtubeLink}" target="_blank" class="btn-small yt-btn"><i class="fab fa-youtube"></i></a>` : ''}
                        ${ep.spotifyLink ? `<a href="${ep.spotifyLink}" target="_blank" class="btn-small sp-btn"><i class="fab fa-spotify"></i></a>` : ''}
                    </div>
               </div>`;

        const alreadyLiked = getLikedEpisodes().includes(ep.id);
        const likeBtnUI = ep.comingSoon ? '' : `
            <button class="like-btn ${alreadyLiked ? 'liked' : ''}" data-id="${ep.id}" title="${alreadyLiked ? 'Anda menyukai ini' : 'Sukai episode ini'}">
                <i class="${alreadyLiked ? 'fas' : 'far'} fa-heart"></i>
                <span class="like-count">${ep.likes || 0}</span>
            </button>
        `;

        card.innerHTML = `
            <div class="episode-img">
                <img src="${ep.image}" alt="${ep.title}" onerror="this.src='assets/Logo Podcast 32.jpg'">
                ${ep.featured ? '<div class="featured-badge-tag"><i class="fas fa-star"></i> Featured</div>' : ''}
                ${mediaContent}
            </div>
            <div class="episode-info">
                <span class="episode-number">${ep.number}</span>
                <h3>${ep.title}</h3>
                <p>${ep.description}</p>
                ${playbackUI}
                <div class="episode-actions">
                    <div class="tags">
                        ${ep.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                    ${likeBtnUI}
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    observeElements();
}

// Search & Filter Listeners
const searchInput = document.getElementById('search-episode');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderEpisodes();
    });
}

document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelector('.filter-chip.active').classList.remove('active');
        chip.classList.add('active');
        currentFilter = chip.getAttribute('data-filter');
        renderEpisodes();
    });
});

// Back to Top Button
const backToTopBtn = document.getElementById('back-to-top');
window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
});

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ScrollSpy Logic
function initScrollSpy() {
    const sections = document.querySelectorAll('section, header');
    const navLinks = document.querySelectorAll('.nav-links');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active-nav');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active-nav');
            }
        });
    });
}

// Dynamic Content Loading
async function loadSettings() {
    try {
        const response = await fetch('/api/settings');
        const settings = await response.json();
        
        // Map settings to IDs
        const mapping = {
            'nav_home': 'nav-home',
            'nav_about': 'nav-about',
            'nav_episode': 'nav-episode',
            'nav_host': 'nav-host',
            'hero_title': 'hero-title',
            'hero_subtitle': 'hero-subtitle',
            'hero_desc': 'hero-desc',
            'hero_btn_play': 'hero-btn-play',
            'hero_btn_spotify': 'hero-btn-spotify',
            'about_title': 'about-title',
            'about_desc': 'about-desc',
            'about_stat1_value': 'about-stat1-value',
            'about_stat1_label': 'about-stat1-label',
            'about_stat2_value': 'about-stat2-value',
            'about_stat2_label': 'about-stat2-label',
            'about_stat3_value': 'about-stat3-value',
            'about_stat3_label': 'about-stat3-label',
            'episode_title': 'episode-title',
            'host_title': 'host-title',
            'footer_text': 'footer_text'
        };

        for (const [key, id] of Object.entries(mapping)) {
            const el = document.getElementById(id);
            if (el && settings[key]) {
                if (key.includes('btn')) {
                    // For buttons, update innerHTML but keep the icon if present
                    const icon = el.querySelector('i');
                    el.innerHTML = '';
                    if (icon) el.appendChild(icon);
                    el.appendChild(document.createTextNode(' ' + settings[key]));
                } else if (key === 'about_desc' || key === 'footer_text') {
                    el.innerHTML = settings[key];
                } else {
                    el.innerText = settings[key];
                }
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function loadHosts() {
    const container = document.getElementById('host-container');
    try {
        const response = await fetch('/api/hosts');
        const hosts = await response.json();
        
        container.innerHTML = '';
        
        if (hosts.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Belum ada host yang terdaftar.</p>';
            return;
        }

        hosts.forEach(host => {
            const card = document.createElement('div');
            card.className = 'host-card glass-card';
            card.innerHTML = `
                <img src="${host.image}" alt="${host.name}" onerror="this.src='assets/Logo Podcast 32.jpg'">
                <h3>${host.name}</h3>
                <p>${host.role}</p>
                <div class="social-links">
                    ${host.igLink ? `<a href="${host.igLink}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
                </div>
            `;
            container.appendChild(card);
        });

        observeElements();
    } catch (error) {
        console.error('Error loading hosts:', error);
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #ef4444;">Gagal memuat daftar host.</p>';
    }
}

// Initial Load update
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadEpisodes();
    loadHosts();
    initGlobalPlayer();
    initScrollSpy();
});

// Stats Counter Animation
function initStatsCounter() {
    const stats = document.querySelectorAll('.stat-item h3');
    
    const countObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const targetValue = parseInt(target.getAttribute('data-target'));
                animateCount(target, targetValue);
                countObserver.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(s => countObserver.observe(s));
}

function animateCount(el, target) {
    let current = 0;
    const duration = 2000; // 2 seconds
    const stepTime = Math.abs(Math.floor(duration / target));
    
    if (target === 0) {
        el.textContent = "0";
        return;
    }

    const timer = setInterval(() => {
        current += Math.ceil(target / 100); // Increment speed
        if (current >= target) {
            el.textContent = target >= 1000 ? (target / 1000).toFixed(0) + 'K+' : target + (el.id.includes('stat1') ? '+' : '');
            clearInterval(timer);
        } else {
            el.textContent = current;
        }
    }, 20);
}

// Global Player Logic
function initGlobalPlayer() {
    const audio = document.getElementById('global-audio');
    const playerUI = document.getElementById('global-player');
    
    // UI Elements
    const playPauseBtn = document.getElementById('btn-play-pause');
    const playPauseIcon = playPauseBtn.querySelector('i');
    const titleEl = document.getElementById('player-title');
    const imgEl = document.getElementById('player-img');
    const closeBtn = document.getElementById('btn-close-player');
    const speedBtn = document.getElementById('btn-speed');
    const btnForward = document.getElementById('btn-forward');
    const btnBackward = document.getElementById('btn-backward');
    
    // Progress
    const timeCurrent = document.getElementById('time-current');
    const timeTotal = document.getElementById('time-total');
    const progressBg = document.getElementById('progress-bg');
    const progressFill = document.getElementById('progress-fill');
    
    // Volume
    const volumeSlider = document.getElementById('volume-slider');
    const volumeIcon = document.getElementById('volume-icon');

    // Event Delegation for dynamically created Play Buttons
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.play-episode-btn');
        if (btn) {
            const src = btn.getAttribute('data-audio');
            const title = btn.getAttribute('data-title');
            const image = btn.getAttribute('data-image');
            
            // Check if clicking same audio that is currently playing
            if (audio.src.includes(src) && !audio.paused) {
                audio.pause();
                return;
            }

            titleEl.textContent = title;
            imgEl.src = image;
            
            if (!audio.src.includes(src)) {
                audio.src = src;
            }
            
            playerUI.classList.remove('hidden-player');
            audio.play();
        }

        // Like Button Click
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            const id = parseInt(likeBtn.getAttribute('data-id'));
            const isCurrentlyLiked = likeBtn.classList.contains('liked');
            
            // UI Update Logic
            const countEl = likeBtn.querySelector('.like-count');
            const iconEl = likeBtn.querySelector('i');
            let currentCount = parseInt(countEl.textContent);
            
            const action = toggleEpisodeLike(id);
            
            if (action === 'like') {
                countEl.textContent = currentCount + 1;
                likeBtn.classList.add('liked', 'animating');
                iconEl.classList.replace('far', 'fas');
            } else {
                countEl.textContent = Math.max(0, currentCount - 1);
                likeBtn.classList.remove('liked');
                likeBtn.classList.add('animating');
                iconEl.classList.replace('fas', 'far');
            }

            // API Call
            const endpoint = action === 'like' ? `/api/episodes/${id}/like` : `/api/episodes/${id}/unlike`;
            fetch(endpoint, { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        countEl.textContent = data.likes;
                    }
                    setTimeout(() => likeBtn.classList.remove('animating'), 400);
                })
                .catch(err => {
                    console.error('Error toggling like:', err);
                });
        }
    });

    // Close Player
    closeBtn.addEventListener('click', () => {
        audio.pause();
        playerUI.classList.add('hidden-player');
    });

    // Play/Pause
    playPauseBtn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play();
        } else {
            audio.pause();
        }
    });

    // Audio Event - Play
    audio.addEventListener('play', () => {
        playPauseIcon.classList.remove('fa-play');
        playPauseIcon.classList.add('fa-pause');
    });

    // Audio Event - Pause
    audio.addEventListener('pause', () => {
        playPauseIcon.classList.remove('fa-pause');
        playPauseIcon.classList.add('fa-play');
    });

    // Format Time function (seconds to M:SS)
    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // Update Progress Bar & Time
    audio.addEventListener('timeupdate', () => {
        const current = audio.currentTime;
        timeCurrent.textContent = formatTime(current);
        
        if (audio.duration) {
            const percentage = (current / audio.duration) * 100;
            progressFill.style.width = `${percentage}%`;
        }
    });

    // On Load Metadata (gets duration)
    audio.addEventListener('loadedmetadata', () => {
        timeTotal.textContent = formatTime(audio.duration);
    });

    // Click to Seek
    progressBg.addEventListener('click', (e) => {
        const rect = progressBg.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audio.currentTime = pos * audio.duration;
    });

    // Forward / Backward 10s
    btnForward.addEventListener('click', () => {
        audio.currentTime = Math.min(audio.currentTime + 10, audio.duration);
    });
    
    btnBackward.addEventListener('click', () => {
        audio.currentTime = Math.max(audio.currentTime - 10, 0);
    });

    // Speed Control
    let speeds = [1, 1.25, 1.5, 2];
    let speedIndex = 0;
    speedBtn.addEventListener('click', () => {
        speedIndex = (speedIndex + 1) % speeds.length;
        audio.playbackRate = speeds[speedIndex];
        speedBtn.textContent = `${speeds[speedIndex]}x`;
    });

    // Volume Control
    volumeSlider.addEventListener('input', (e) => {
        audio.volume = e.target.value;
        if (audio.volume === 0) {
            volumeIcon.className = 'fas fa-volume-mute';
        } else if (audio.volume < 0.5) {
            volumeIcon.className = 'fas fa-volume-down';
        } else {
            volumeIcon.className = 'fas fa-volume-up';
        }
    });
}

// Modal Selengkapnya Logic
const epDetailModal = document.getElementById('ep-detail-modal');

function openEpisodeDetail(id) {
    const ep = allEpisodes.find(e => e.id == id);
    if (!ep) return;

    document.getElementById('modal-ep-img').src = ep.image;
    document.getElementById('modal-ep-num').textContent = ep.number;
    document.getElementById('modal-ep-title').textContent = ep.title;
    document.getElementById('modal-ep-desc').textContent = ep.description;
    
    const contentEl = document.getElementById('modal-ep-content');
    const contentSection = document.getElementById('modal-ep-content-section');
    if (ep.content && ep.content.trim() !== '') {
        contentEl.innerHTML = ep.content.replace(/\n/g, '<br>');
        contentSection.style.display = 'block';
    } else {
        contentSection.style.display = 'none';
    }

    const tagsEl = document.getElementById('modal-ep-tags');
    tagsEl.innerHTML = ep.tags.map(tag => `<span class="tag">${tag}</span>`).join('');

    // Social Links in footer
    const socialBtns = document.getElementById('modal-social-btns');
    socialBtns.innerHTML = `
        ${ep.youtubeLink ? `<a href="${ep.youtubeLink}" target="_blank" class="btn-small yt-btn" title="Tonton di YouTube"><i class="fab fa-youtube"></i></a>` : ''}
        ${ep.spotifyLink ? `<a href="${ep.spotifyLink}" target="_blank" class="btn-small sp-btn" title="Dengarkan di Spotify"><i class="fab fa-spotify"></i></a>` : ''}
    `;

    const playBtn = document.getElementById('modal-play-btn');
    if (ep.comingSoon) {
        playBtn.style.display = 'none';
    } else {
        playBtn.style.display = 'flex';
        playBtn.onclick = () => {
            playEpisode(ep.audioSrc, ep.title, ep.image);
            epDetailModal.classList.remove('active');
        };
    }

    epDetailModal.classList.add('active');
}

document.addEventListener('click', (e) => {
    if (e.target.closest('.btn-more')) {
        const id = e.target.closest('.btn-more').dataset.id;
        openEpisodeDetail(id);
    }
    
    if (e.target === epDetailModal || e.target.closest('#close-ep-modal')) {
        epDetailModal.classList.remove('active');
    }
});
