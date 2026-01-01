const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3001;
const NOVELS_DIR = path.join(__dirname, 'novels');
const IMAGES_DIR = path.join(__dirname, 'images');
const DIST_DIR = path.join(__dirname, 'dist'); // Standard Vite build output directory

// Ensure data directories exist
if (!fs.existsSync(NOVELS_DIR)) {
  fs.mkdirSync(NOVELS_DIR);
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR);
}

const apiHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

const server = http.createServer((req, res) => {
  const baseURL = `http://${req.headers.host || 'localhost'}`;
  const parsedUrl = new URL(req.url, baseURL);
  const pathname = parsedUrl.pathname;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, apiHeaders);
    res.end();
    return;
  }

  // ==========================================
  // API Endpoints
  // ==========================================

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
      
      res.writeHead(200, apiHeaders);
      res.end(JSON.stringify(works));
    } catch (err) {
      res.writeHead(500, apiHeaders);
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

        res.writeHead(200, apiHeaders);
        res.end(JSON.stringify({ success: true, path: workDir }));
      } catch (err) {
        console.error(err);
        res.writeHead(500, apiHeaders);
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
                if (fs.rmSync) {
                    fs.rmSync(workDir, { recursive: true, force: true });
                } else {
                    fs.rmdirSync(workDir, { recursive: true });
                }
                found = true;
            }
        });

        if (found) {
            res.writeHead(200, apiHeaders);
            res.end(JSON.stringify({ success: true }));
        } else {
            res.writeHead(404, apiHeaders);
            res.end(JSON.stringify({ error: 'Work not found' }));
        }
    } catch (err) {
        res.writeHead(500, apiHeaders);
        res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

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
        const matches = image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        
        let buffer;
        let ext = 'png'; // Default
        
        if (matches && matches.length === 3) {
            ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
            buffer = Buffer.from(matches[2], 'base64');
        } else {
            buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        }

        // Calculate MD5 for unique filename
        const hash = crypto.createHash('md5').update(buffer).digest('hex');
        const filename = `${hash}.${ext}`;
        const filepath = path.join(IMAGES_DIR, filename);

        // Write file
        fs.writeFileSync(filepath, buffer);

        // Return local server URL
        const imageUrl = `http://localhost:${PORT}/images/${filename}`;

        res.writeHead(200, apiHeaders);
        res.end(JSON.stringify({ url: imageUrl, filename: filename }));

      } catch (err) {
        console.error("Image save error:", err);
        res.writeHead(500, apiHeaders);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ==========================================
  // Static File Serving (Images & Frontend)
  // ==========================================

  // 1. Serve Uploaded Images
  if (req.method === 'GET' && pathname.startsWith('/images/')) {
    const filename = pathname.replace('/images/', '');
    const filepath = path.join(IMAGES_DIR, filename);
    
    // Security check
    if (!filepath.startsWith(IMAGES_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    if (fs.existsSync(filepath)) {
        res.writeHead(200, { 
            'Access-Control-Allow-Origin': '*',
            'Content-Type': getContentType(filepath) 
        });
        fs.createReadStream(filepath).pipe(res);
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
    return;
  }

  // 2. Serve Frontend App (Static Files from /dist)
  if (req.method === 'GET') {
      // Logic:
      // 1. Try to find the exact file in DIST_DIR
      // 2. If not found, and it's a navigation route (no extension), serve index.html (SPA fallback)
      // 3. If DIST_DIR/index.html doesn't exist, show "Friendly Status Page"

      const safePath = pathname === '/' ? 'index.html' : pathname;
      const distFilePath = path.join(DIST_DIR, safePath);

      // Security check
      if (!distFilePath.startsWith(DIST_DIR)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
      }

      // Check if file exists
      if (fs.existsSync(distFilePath) && fs.statSync(distFilePath).isFile()) {
          res.writeHead(200, { 'Content-Type': getContentType(distFilePath) });
          fs.createReadStream(distFilePath).pipe(res);
          return;
      }

      // SPA Fallback: If requesting a route (e.g. /editor) and it's not a file, serve index.html
      const indexHtmlPath = path.join(DIST_DIR, 'index.html');
      if (path.extname(pathname) === '' && fs.existsSync(indexHtmlPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          fs.createReadStream(indexHtmlPath).pipe(res);
          return;
      }

      // 3. Friendly Status Page (Only if frontend is not built/found)
      // Only serve this for root URL or simple browser navigation, not for missing assets
      if (pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Novelist AI Server</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; color: #1f2937; }
                .container { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 28rem; width: 100%; text-align: center; }
                .icon { font-size: 3rem; margin-bottom: 1rem; }
                h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #111827; }
                p { color: #6b7280; margin-bottom: 1.5rem; line-height: 1.5; }
                .code-block { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 0.75rem; font-family: monospace; font-size: 0.875rem; color: #374151; margin-bottom: 1rem; text-align: left; }
            </style>
            </head>
            <body>
            <div class="container">
                <div class="icon">🟢</div>
                <h1>Server is Running</h1>
                <p>The backend is active on port <strong>${PORT}</strong>.</p>
                <div style="text-align: left; margin-bottom: 1rem;">
                <p style="margin-bottom: 0.5rem; font-weight: 500;">Frontend Status:</p>
                <div class="code-block">
                    Directory <code>/dist</code> not found or empty.
                </div>
                </div>
                <p>To view the app here, build the frontend:</p>
                <div class="code-block">npm run build</div>
                <p style="font-size: 0.875rem;">Or run the dev server separately: <code>npm run dev</code></p>
            </div>
            </body>
            </html>
        `);
        return;
      }
  }

  // 404 Fallback
  res.writeHead(404, apiHeaders);
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`Novelist AI Server running at http://localhost:${PORT}`);
  console.log(`- Novels: ${NOVELS_DIR}`);
  console.log(`- Images: ${IMAGES_DIR}`);
});