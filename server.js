require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(cors());
app.use(bodyParser.json());

// Setup Multer for file uploads
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'assets/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });

// File Upload Route
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    // Return the relative path
    res.json({ success: true, filePath: 'assets/uploads/' + req.file.filename });
});

// Serve static files for frontend
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Auth Route
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        res.json({ success: true, token: 'fake-jwt-token' });
    } else {
        res.status(401).json({ success: false, message: 'Username atau Password salah!' });
    }
});

// Routes
app.get('/api/episodes', (req, res) => {
    db.all("SELECT * FROM episodes ORDER BY position ASC, id DESC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Convert tags string to array
        const episodes = rows.map(row => ({
            ...row,
            tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
            featured: row.featured === 1,
            comingSoon: row.comingSoon === 1,
            isLocked: row.isLocked === 1
        }));
        res.json(episodes);
    });
});

app.post('/api/episodes', (req, res) => {
    const { number, date, title, description, image, tags, audioSrc, youtubeLink, spotifyLink, featured, comingSoon } = req.body;
    
    // Handle single featured episode logic
    if (featured) {
        db.run("UPDATE episodes SET featured = 0");
    }

    // Get current max position
    db.get("SELECT MAX(position) as maxPos FROM episodes", (err, row) => {
        const nextPos = (row && row.maxPos !== null) ? row.maxPos + 1 : 0;
        
        const query = `INSERT INTO episodes (number, date, title, description, image, tags, audioSrc, youtubeLink, spotifyLink, featured, comingSoon, position, isLocked) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [number, date, title, description, image, Array.isArray(tags) ? tags.join(', ') : tags, audioSrc, youtubeLink, spotifyLink, featured ? 1 : 0, comingSoon ? 1 : 0, nextPos, 0];

        db.run(query, params, function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, message: "Episode created successfully" });
        });
    });
});

app.put('/api/episodes/:id', (req, res) => {
    const { id } = req.params;
    const { number, date, title, description, image, tags, audioSrc, youtubeLink, spotifyLink, featured, comingSoon } = req.body;

    if (featured) {
        db.run("UPDATE episodes SET featured = 0");
    }

    const query = `UPDATE episodes SET number = ?, date = ?, title = ?, description = ?, image = ?, tags = ?, audioSrc = ?, youtubeLink = ?, spotifyLink = ?, featured = ?, comingSoon = ? WHERE id = ?`;
    const params = [number, date, title, description, image, Array.isArray(tags) ? tags.join(', ') : tags, audioSrc, youtubeLink, spotifyLink, featured ? 1 : 0, comingSoon ? 1 : 0, id];

    db.run(query, params, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Episode updated successfully" });
    });
});

app.delete('/api/episodes/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM episodes WHERE id = ?", id, function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Episode deleted successfully" });
    });
});

app.patch('/api/episodes/:id/toggle-lock', (req, res) => {
    const { id } = req.params;
    db.get("SELECT isLocked FROM episodes WHERE id = ?", [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Episode not found" });
        
        const newStatus = row.isLocked === 1 ? 0 : 1;
        db.run("UPDATE episodes SET isLocked = ? WHERE id = ?", [newStatus, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, isLocked: newStatus === 1 });
        });
    });
});

app.post('/api/episodes/:id/like', (req, res) => {
    const { id } = req.params;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    db.serialize(() => {
        db.run("UPDATE episodes SET likes = likes + 1 WHERE id = ?", [id]);
        db.run("INSERT INTO likes_log (episodeId, ip, userAgent) VALUES (?, ?, ?)", [id, ip, userAgent]);
        db.get("SELECT likes FROM episodes WHERE id = ?", [id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, likes: row.likes });
        });
    });
});

app.post('/api/episodes/:id/unlike', (req, res) => {
    const { id } = req.params;
    db.run("UPDATE episodes SET likes = MAX(0, likes - 1) WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get("SELECT likes FROM episodes WHERE id = ?", [id], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, likes: row.likes });
        });
    });
});

app.post('/api/episodes/reorder', (req, res) => {
    const { orders } = req.body; // Array of { id, position }
    if (!orders || !Array.isArray(orders)) {
        return res.status(400).json({ error: "Invalid data" });
    }

    const stmt = db.prepare("UPDATE episodes SET position = ? WHERE id = ?");
    orders.forEach(item => {
        stmt.run(item.position, item.id);
    });
    stmt.finalize();
    res.json({ success: true });
});

app.post('/api/episodes/batch-update', (req, res) => {
    const { episodes } = req.body;
    if (!episodes || !Array.isArray(episodes)) {
        return res.status(400).json({ error: "Invalid data" });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        // Use a Set for faster lookup of IDs that should stay
        const activeIds = episodes.filter(ep => ep.id > 0).map(ep => ep.id);
        
        // Delete episodes not in the updated list
        if (activeIds.length > 0) {
            db.run(`DELETE FROM episodes WHERE id NOT IN (${activeIds.join(',')})`);
        } else {
            db.run("DELETE FROM episodes");
        }

        const updateStmt = db.prepare(`
            UPDATE episodes SET 
                number = ?, date = ?, title = ?, description = ?, image = ?, 
                tags = ?, audioSrc = ?, youtubeLink = ?, spotifyLink = ?, 
                featured = ?, comingSoon = ?, position = ?, isLocked = ? 
            WHERE id = ?
        `);

        const insertStmt = db.prepare(`
            INSERT INTO episodes (
                number, date, title, description, image, 
                tags, audioSrc, youtubeLink, spotifyLink, 
                featured, comingSoon, position, isLocked
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        episodes.forEach(ep => {
            const tagsStr = Array.isArray(ep.tags) ? ep.tags.join(', ') : ep.tags;
            const params = [
                ep.number, ep.date, ep.title, ep.description, ep.image,
                tagsStr, ep.audioSrc, ep.youtubeLink, ep.spotifyLink,
                ep.featured ? 1 : 0, ep.comingSoon ? 1 : 0, ep.position, ep.isLocked ? 1 : 0
            ];

            if (ep.id > 0) {
                updateStmt.run(...params, ep.id);
            } else {
                insertStmt.run(...params);
            }
        });

        updateStmt.finalize();
        insertStmt.finalize();

        db.run("COMMIT", (err) => {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: "Changes applied successfully" });
        });
    });
});

// Settings Routes
app.get('/api/settings', (req, res) => {
    db.all("SELECT * FROM settings", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    });
});

app.post('/api/settings', (req, res) => {
    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: "Invalid data" });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
        
        for (const [key, value] of Object.entries(settings)) {
            stmt.run(key, value);
        }
        
        stmt.finalize();
        db.run("COMMIT", (err) => {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: "Settings updated successfully" });
        });
    });
});

// Hosts Routes
app.get('/api/hosts', (req, res) => {
    db.all("SELECT * FROM hosts ORDER BY position ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/hosts/batch-update', (req, res) => {
    const { hosts } = req.body;
    if (!hosts || !Array.isArray(hosts)) {
        return res.status(400).json({ error: "Invalid data" });
    }

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        const activeIds = hosts.filter(h => h.id > 0).map(h => h.id);
        if (activeIds.length > 0) {
            db.run(`DELETE FROM hosts WHERE id NOT IN (${activeIds.join(',')})`);
        } else {
            db.run("DELETE FROM hosts");
        }

        const updateStmt = db.prepare(`UPDATE hosts SET name=?, role=?, image=?, igLink=?, position=? WHERE id=?`);
        const insertStmt = db.prepare(`INSERT INTO hosts (name, role, image, igLink, position) VALUES (?, ?, ?, ?, ?)`);

        hosts.forEach(h => {
            if (h.id > 0) {
                updateStmt.run(h.name, h.role, h.image, h.igLink, h.position, h.id);
            } else {
                insertStmt.run(h.name, h.role, h.image, h.igLink, h.position);
            }
        });

        updateStmt.finalize();
        insertStmt.finalize();

        db.run("COMMIT", (err) => {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: "Hosts applied successfully" });
        });
    });
});

// Analytics Routes
app.get('/api/analytics/likes', (req, res) => {
    const query = `
        SELECT l.*, e.title as episodeTitle 
        FROM likes_log l 
        JOIN episodes e ON l.episodeId = e.id 
        ORDER BY l.timestamp DESC 
        LIMIT 100
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
