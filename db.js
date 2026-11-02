const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'podcast.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the podcast database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS episodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            number TEXT,
            date TEXT,
            title TEXT,
            description TEXT,
            image TEXT,
            tags TEXT,
            audioSrc TEXT,
            youtubeLink TEXT,
            spotifyLink TEXT,
            featured INTEGER DEFAULT 0,
            comingSoon INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            position INTEGER DEFAULT 0,
            isLocked INTEGER DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error('Error creating episodes table:', err.message);
            else {
                // Ensure 'likes' column exists for existing databases
                db.run("ALTER TABLE episodes ADD COLUMN likes INTEGER DEFAULT 0", (err) => {
                    if (err) {
                        if (err.message.includes("duplicate column name")) {
                            // Column already exists, ignore
                        } else {
                            console.error('Error adding likes column:', err.message);
                        }
                    }
                });
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`, (err) => {
            if (err) console.error('Error creating settings table:', err.message);
        });

        db.run(`CREATE TABLE IF NOT EXISTS likes_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            episodeId INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip TEXT,
            userAgent TEXT,
            FOREIGN KEY (episodeId) REFERENCES episodes(id)
        )`, (err) => {
            if (err) console.error('Error creating likes_log table:', err.message);
        });

        db.run(`CREATE TABLE IF NOT EXISTS hosts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            role TEXT,
            image TEXT,
            igLink TEXT,
            position INTEGER DEFAULT 0
        )`, (err) => {
            if (err) console.error('Error creating hosts table:', err.message);
            else {
                console.log('Database tables ready.');
                seedData();
            }
        });
    });
}

function seedData() {
    // Seed Episodes
    db.get("SELECT COUNT(*) as count FROM episodes", (err, row) => {
        if (err) return console.error(err.message);
        if (row.count === 0) {
            const initialEpisodes = [
                {
                    number: "Episode 1",
                    date: "Terbaru",
                    title: "Pertukaran Pelajar: Pengalaman & Cerita Manca Negara",
                    description: "Dengarkan keseruan ngobrol bareng siswa Smansa yang baru saja pulang dari program pertukaran pelajar. Penasaran bagaimana serunya sekolah dan hidup di luar negeri? Langsung putar episodenya di bawah ini! ✈️🌍",
                    image: "assets/eps_pertukaran_pelajar.png",
                    tags: "Inspirasi Pilihan, Global",
                    audioSrc: "https://res.cloudinary.com/dunn1jgze/video/upload/v1773031397/Episode_1_Pertukaran_Pelajar_Compress_vzsofi.mp3",
                    youtubeLink: "https://youtube.com/@podcastsks-64",
                    spotifyLink: "https://open.spotify.com/user/31oqp2azrzhm6odujr5lwwluzmfq",
                    featured: 0,
                    comingSoon: 0,
                    position: 0,
                    isLocked: 1
                }
            ];

            const stmt = db.prepare(`INSERT INTO episodes (number, date, title, description, image, tags, audioSrc, youtubeLink, spotifyLink, featured, comingSoon, position, isLocked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            initialEpisodes.forEach(ep => {
                stmt.run(ep.number, ep.date, ep.title, ep.description, ep.image, ep.tags, ep.audioSrc, ep.youtubeLink, ep.spotifyLink, ep.featured, ep.comingSoon, ep.position, ep.isLocked);
            });
            stmt.finalize();
            console.log('Seeded initial episodes.');
        }
    });

    // Seed Settings
    db.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
        if (err) return console.error(err.message);
        if (row.count === 0) {
            const initialSettings = [
                ['nav_home', 'Beranda'],
                ['nav_about', 'Tentang'],
                ['nav_episode', 'Episode'],
                ['nav_host', 'Host'],
                ['hero_title', 'Swara Karmany Smansa'],
                ['hero_subtitle', 'Suara Kita, Cerita Kita'],
                ['hero_desc', 'Podcast eksklusif dari SMAN 1 Denpasar (Smansa) yang membahas seputar kehidupan sekolah, inspirasi, curhat, dan obrolan seru para siswa bersama bintang tamu istimewa.'],
                ['hero_btn_play', 'Dengarkan Sekarang'],
                ['hero_btn_spotify', 'Spotify'],
                ['about_title', 'Tentang Podcast'],
                ['about_desc', '<strong>Podcast Swara Karmany Smansa</strong> adalah wadah kreativitas siswa SMAN 1 Denpasar dalam menyalurkan ide, pengalaman, dan opini melalui media audio. Kami menghadirkan narasumber dari berbagai kalangan, mulai dari siswa berprestasi, guru inspiratif, hingga alumni yang sukses di bidangnya. Mari dengarkan cerita unik mereka yang menginspirasi!'],
                ['about_stat1_value', '50+'],
                ['about_stat1_label', 'Episode Seru'],
                ['about_stat2_value', '10K+'],
                ['about_stat2_label', 'Pendengar Aktif'],
                ['about_stat3_value', '0'],
                ['about_stat3_label', 'Total Menyukai'],
                ['episode_title', 'Episode Terbaru'],
                ['host_title', 'Host Andalan Kami'],
                ['footer_text', 'Copyright &copy; 2026 Podcast Swara Karmany Smansa.']
            ];

            const stmt = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`);
            initialSettings.forEach(setting => {
                stmt.run(setting[0], setting[1]);
            });
            stmt.finalize();
            console.log('Seeded initial settings.');
        }
    });

    // Seed Hosts
    db.get("SELECT COUNT(*) as count FROM hosts", (err, row) => {
        if (err) return console.error(err.message);
        if (row.count === 0) {
            const initialHosts = [
                { name: "Sang Made", role: "Panitia SEC", image: "assets/SangMadeSudirgaBotak.jpeg", igLink: "https://www.instagram.com/sgmade1?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==", position: 0 },
                { name: "Nabila", role: "Panitia SJC", image: "assets/Nabila.jpeg", igLink: "https://www.instagram.com/kdknabilaa/?utm_source=ig_web_button_share_sheet", position: 1 },
                { name: "Nanda", role: "Panitia SEC", image: "assets/SangMadeSudirgaBotak.jpeg", igLink: "https://www.instagram.com/_nandaprdy?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==", position: 2 },
                { name: "Anjani", role: "Panitia SJC", image: "assets/Nabila.jpeg", igLink: "https://www.instagram.com/nuranjaniii_?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==", position: 3 }
            ];

            const stmt = db.prepare(`INSERT INTO hosts (name, role, image, igLink, position) VALUES (?, ?, ?, ?, ?)`);
            initialHosts.forEach(host => {
                stmt.run(host.name, host.role, host.image, host.igLink, host.position);
            });
            stmt.finalize();
            console.log('Seeded initial hosts.');
        }
    });
}

module.exports = db;
