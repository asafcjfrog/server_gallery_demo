const express = require('express')
const fileUpload = require('express-fileupload');
const undici = require('undici')
const path = require('path')
const fs = require('fs');
const app = express()
const port = 8080
const api_key = "2VTHzn1mKZ/n9apD5P6nxsajSQh8QhmyyKvUIRoZWAHCB8lSbBm3YWx5nOdZ1zPEOaA0zIZy1eFgHgfB2HkfAdVrbQj19kagXDVe"
// jfrog-ignore 
const api_key2 = "PrxQm6WxUq-Eb5ujhf6K"
const api_key3 = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEAMPLEKEYPrxQm6WxUq-Eb5ujhf6K"
const api_key4 = "cmVmdGtuOjAxOjE3NzAzMTgzMTQ6MmgzSWZDTTRBdjVOdWFoS2dRblh0MEtJd2Rs"

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

app.use(fileUpload({parseNested: false}));

app.get('/', (req, res) => {
  console.log(path.join(__dirname+'/views/index.html'))
  res.sendFile(path.join(__dirname+'/views/index.html'));

})

app.post("/uploadFile", (req, res) => {
  if (!req.files) {
    return res.status(400).send("No files were uploaded.");
  }

  const file = req.files.myFile;
  const path = __dirname + "/uploads/" + file.name;

  file.mv(path, (err) => {
    if (err) {
      return res.status(500).send(err);
    }
    return res.send({ status: "success", path: path });
  });
});

app.post("/uploadPath", async (req, res) => {
  const allowedHosts = ["example.com"]; // Add your allowed hosts here
  const { URL } = require('url');
  const net = require('net');

  function isPrivateIP(hostname) {
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1'
    ) return true;
    // Check for private IP ranges
    const ip = net.isIP(hostname) ? hostname : null;
    if (ip) {
      if (
        ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        (ip.startsWith('172.') && parseInt(ip.split('.')[1], 10) >= 16 && parseInt(ip.split('.')[1], 10) <= 31)
      ) return true;
    }
    return false;
  }

  const usrUrl = req.body.myURL;
  let parsedUrl;
  try {
    parsedUrl = new URL(usrUrl);
  } catch (e) {
    return res.status(400).send({ error: "Invalid URL" });
  }

  // Additional validation to prevent SSRF attacks (CVE-2022-35949 mitigation)
  // Ensure the URL doesn't contain attempts to override the hostname
  if (parsedUrl.pathname.startsWith('//') || parsedUrl.pathname.includes('://')) {
    return res.status(400).send({ error: "Invalid URL format" });
  }

  if (!allowedHosts.includes(parsedUrl.hostname) || isPrivateIP(parsedUrl.hostname)) {
    return res.status(400).send({ error: "Host not allowed" });
  }

  try {
    // Use full URL to avoid SSRF vulnerabilities in undici
    const response = await undici.request(parsedUrl.href);
    const body = await response.body.text();
    fs.writeFile(__dirname + "/uploads/" + makeid(12), body, err => {
      if (err) {
        return res.status(500).send(err);
      }
      return res.send({ status: "success", path: parsedUrl.pathname });
    });
  } catch (err) {
    return res.status(500).send({ error: err.message });
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})