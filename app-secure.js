const express = require('express')
const fileUpload = require('express-fileupload');
const undici = require('undici')
const path = require('path')
const fs = require('fs');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express()
const port = process.env.PORT || 8080

// Security middleware
app.use(helmet());

// Secure API key usage from environment variables
const api_key = process.env.API_KEY_1;
const api_key2 = process.env.API_KEY_2;
const api_key3 = process.env.API_KEY_3;
const api_key4 = process.env.API_KEY_4;

// Validate that required environment variables are set
if (!api_key || !api_key2 || !api_key3 || !api_key4) {
    console.error('❌ Error: Required API keys not found in environment variables');
    console.error('Please set API_KEY_1, API_KEY_2, API_KEY_3, and API_KEY_4 in your .env file');
    process.exit(1);
}

function parseUrl(usrUrl){
  const slashIndex = usrUrl.indexOf('/')
  const slashNextIndex = usrUrl.indexOf('/', (slashIndex + 2))
  return usrUrl.slice(slashNextIndex), usrUrl.slice(0, slashNextIndex)
}

function makeid(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

// Secure file upload configuration
app.use(fileUpload({
  parseNested: false,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  abortOnLimit: true,
  createParentPath: true
}));

app.get('/', (req, res) => {
  console.log(path.join(__dirname+'/views/index.html'))
  res.sendFile(path.join(__dirname+'/views/index.html'));
})

// Secure file upload endpoint
app.post("/uploadFile", (req, res) => {
  if (!req.files) {
    return res.status(400).send("No files were uploaded.");
  }

  const file = req.files.myFile;
  
  // Security validations
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  // Validate file type
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).send("Invalid file type. Only images are allowed.");
  }
  
  // Validate file size
  if (file.size > maxSize) {
    return res.status(400).send("File too large. Maximum size is 5MB.");
  }
  
  // Generate secure filename to prevent path traversal
  const fileExtension = path.extname(file.name);
  const secureFilename = uuidv4() + fileExtension;
  const safePath = path.join(__dirname, "uploads", secureFilename);

  file.mv(safePath, (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(500).send("File upload failed.");
    }
    return res.send({ 
      status: "success", 
      filename: secureFilename,
      message: "File uploaded successfully" 
    });
  });
});

// Enhanced SSRF protection
app.post("/uploadPath", async (req, res) => {
  const allowedHosts = ["example.com", "httpbin.org"]; // Whitelist approach
  const { URL } = require('url');
  const net = require('net');

  function isPrivateIP(hostname) {
    // Enhanced private IP detection
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') || // Link-local
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) return true;
    
    // Check for private IPv6 ranges
    if (hostname.startsWith('fd') || hostname.startsWith('fe80:')) return true;
    
    return false;
  }

  function isValidURL(urlString) {
    try {
      const url = new URL(urlString);
      // Only allow HTTP/HTTPS
      if (!['http:', 'https:'].includes(url.protocol)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  const usrUrl = req.body.myURL;
  
  // Input validation
  if (!usrUrl || typeof usrUrl !== 'string') {
    return res.status(400).send({ error: "Invalid or missing URL" });
  }
  
  if (!isValidURL(usrUrl)) {
    return res.status(400).send({ error: "Invalid URL format or protocol" });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(usrUrl);
  } catch (e) {
    return res.status(400).send({ error: "Invalid URL" });
  }

  // Enhanced security checks
  if (!allowedHosts.includes(parsedUrl.hostname)) {
    return res.status(400).send({ error: "Host not in allowlist" });
  }
  
  if (isPrivateIP(parsedUrl.hostname)) {
    return res.status(400).send({ error: "Private IP addresses not allowed" });
  }

  try {
    // Add timeout and size limits
    const response = await undici.request(parsedUrl.href, {
      maxRedirections: 3,
      headersTimeout: 10000,
      bodyTimeout: 30000
    });
    
    // Check content type
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.includes('text/')) {
      return res.status(400).send({ error: "Only text content allowed" });
    }
    
    const body = await response.body.text();
    
    // Limit response size
    if (body.length > 1024 * 1024) { // 1MB limit
      return res.status(400).send({ error: "Response too large" });
    }
    
    const secureFilename = uuidv4();
    const safePath = path.join(__dirname, "uploads", secureFilename);
    
    fs.writeFile(safePath, body, { encoding: 'utf8' }, err => {
      if (err) {
        console.error('File write error:', err);
        return res.status(500).send({ error: "Failed to save content" });
      }
      return res.send({ 
        status: "success", 
        filename: secureFilename,
        message: "Content fetched and saved successfully"
      });
    });
  } catch (err) {
    console.error('Request error:', err);
    return res.status(500).send({ error: "Failed to fetch content" });
  }
})

app.listen(port, () => {
  console.log(`🚀 Secure server listening on port ${port}`)
  console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`)
})