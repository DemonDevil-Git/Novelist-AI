const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = 3001;
const NOVELS_DIR = path.join(__dirname, 'novels');
const IMAGES_DIR = path.join(__dirname, 'images');

// Ensure directories exist
if (!fs.existsSync(NOVELS_DIR)) {
  fs.mkdirSync(NOVELS_DIR);
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR);
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  // --- Static File Serving for Images ---
  if (req.method === 'GET' && pathname.startsWith('/images/')) {
    const filename = pathname.replace('/images/', '');
    // Basic security: prevent directory traversal
    const filepath = path.join(IMAGES_DIR, filename);
    if (!filepath.startsWith(IMAGES_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    if (fs.existsSync(filepath)) {
        const ext = path.extname(filepath).toLowerCase();
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        res.writeHead(200, { 
            'Access-Control-Allow-Origin': '*',
            'Content-Type': contentType 
        });
        fs.createReadStream(filepath).pipe(res);
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
    return;
  }

  // --- API Endpoints ---

  // POST /api/save-image
  if (req.method === 'POST' && pathname === '/api/save-image') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { image } = JSON.parse(body);
        if (!image) {
            throw new Error("No image data provided");
        }

        // Parse Data URI
        // Format: data:image/png;base64,.....
        const matches = image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        
        let buffer;
        let ext = 'png'; // Default
        
        if (matches && matches.length === 3) {
            ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
            buffer = Buffer.from(matches[2], 'base64');
        } else {
            // Try to treat as raw base64 if no header
            buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        }

        // Calculate MD5
        const hash = crypto.createHash('md5').update(buffer).digest('hex');
        const filename = `${hash}.${ext}`;
        const filepath = path.join(IMAGES_DIR, filename);

        // Write file
        fs.writeFileSync(filepath, buffer);

        // Return local server URL
        // Note: Using localhost implicitly here. 
        const imageUrl = `http://localhost:${PORT}/images/${filename}`;

        res.writeHead(200, headers);
        res.end(JSON.stringify({ url: imageUrl, filename: filename }));

      } catch (err) {
        console.error("Image save error:", err);
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /api/works - List all works
  if (req.method === 'GET' && pathname === '/api/works') {
    try {
      const works = [];
      const items = fs.readdirSync(NOVELS_DIR);
      
      items.forEach(item => {
        const itemPath = path.join(NOVELS_DIR, item);
        if (fs.statSync(itemPath).isDirectory()) {
          const dataPath = path.join(itemPath, 'data.json');
          if (fs.existsSync(dataPath)) {
            try {
              const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
              works.push(data);
            } catch (e) {
              console.error(`Error reading data.json for ${item}`, e);
            }
          }
        }
      });
      
      res.writeHead(200, headers);
      res.end(JSON.stringify(works));
    } catch (err) {
      res.writeHead(500, headers);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/works - Save/Update a work
  if (req.method === 'POST' && pathname === '/api/works') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const work = JSON.parse(body);
        
        // Sanitize title for folder name
        const safeTitle = (work.title || 'Untitled').replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').substring(0, 50);
        const folderName = `${safeTitle}-${work.id}`;
        const workDir = path.join(NOVELS_DIR, folderName);

        // Create directory if not exists
        if (!fs.existsSync(workDir)) {
          fs.mkdirSync(workDir, { recursive: true });
        }

        // 1. Save Full State (JSON) for the App
        fs.writeFileSync(path.join(workDir, 'data.json'), JSON.stringify(work, null, 2));

        // 2. Save Readable Markdown (.md) for the User
        let mdContent = `# ${work.title}\n\n`;
        if (work.chapters && Array.isArray(work.chapters)) {
            work.chapters.forEach(ch => {
                mdContent += `## ${ch.title}\n\n${ch.content}\n\n`;
            });
        }
        fs.writeFileSync(path.join(workDir, `${safeTitle}.md`), mdContent);

        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true, path: workDir }));
      } catch (err) {
        console.error(err);
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // DELETE /api/works - Delete a work
  if (req.method === 'DELETE' && pathname.startsWith('/api/works/')) {
    const id = pathname.split('/').pop();
    try {
        const items = fs.readdirSync(NOVELS_DIR);
        let found = false;
        
        // Find folder ending with this ID
        items.forEach(item => {
            if (item.endsWith(`-${id}`)) {
                const workDir = path.join(NOVELS_DIR, item);
                fs.rmSync(workDir, { recursive: true, force: true });
                found = true;
            }
        });

        if (found) {
            res.writeHead(200, headers);
            res.end(JSON.stringify({ success: true }));
        } else {
            res.writeHead(404, headers);
            res.end(JSON.stringify({ error: 'Work not found' }));
        }
    } catch (err) {
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  res.writeHead(404, headers);
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`Novelist AI Local Server running at http://localhost:${PORT}`);
  console.log(`- Novels saved to: ${NOVELS_DIR}`);
  console.log(`- Images saved to: ${IMAGES_DIR}`);
});