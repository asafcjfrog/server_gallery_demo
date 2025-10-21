#!/bin/bash

echo "🔒 Security Vulnerability Remediation Script"
echo "============================================="

# Navigate to project directory
cd "$(dirname "$0")"

echo "📍 Current directory: $(pwd)"

echo ""
echo "1️⃣  Creating .env file for environment variables..."
if [ ! -f .env ]; then
    cat > .env << EOL
# Replace these with your actual secure API keys
API_KEY_1=your_secure_key_here_replace_this
API_KEY_2=your_secure_key_here_replace_this  
API_KEY_3=your_secure_key_here_replace_this
API_KEY_4=your_secure_key_here_replace_this
EOL
    echo "✅ Created .env file"
else
    echo "⚠️  .env file already exists"
fi

echo ""
echo "2️⃣  Updating .gitignore to exclude sensitive files..."
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo ".env" >> .gitignore
    echo "node_modules/" >> .gitignore
    echo "uploads/" >> .gitignore
    echo "*.log" >> .gitignore
    echo "✅ Updated .gitignore"
else
    echo "⚠️  .gitignore already contains .env"
fi

echo ""
echo "3️⃣  Removing critical vulnerable dependency vm2..."
if npm list vm2 &>/dev/null; then
    npm uninstall vm2
    echo "✅ Removed vm2 package"
else
    echo "ℹ️  vm2 package not found or already removed"
fi

echo ""
echo "4️⃣  Updating vulnerable dependencies..."
echo "Updating minimist..."
npm update minimist

echo "Updating node-forge..."
npm update node-forge

echo "Updating jquery..."  
npm update jquery

echo "Updating undici..."
npm update undici

echo "✅ Dependencies updated"

echo ""
echo "5️⃣  Creating secure uploads directory..."
mkdir -p uploads
chmod 755 uploads
echo "✅ Created uploads directory with proper permissions"

echo ""
echo "6️⃣  Installing additional security packages..."
npm install --save helmet dotenv uuid
echo "✅ Installed security packages: helmet, dotenv, uuid"

echo ""
echo "🔍 Running security audit..."
npm audit

echo ""
echo "✅ Security remediation script completed!"
echo ""
echo "⚠️  MANUAL ACTIONS REQUIRED:"
echo "1. Edit the .env file and replace placeholder values with actual secure API keys"
echo "2. Update app.js to use environment variables instead of hardcoded keys"
echo "3. Implement secure file upload validation in app.js"
echo "4. Review and enhance SSRF protection in /uploadPath endpoint"
echo "5. Rotate any API keys that were previously exposed in source code"
echo ""
echo "📖 See SECURITY_ANALYSIS_REPORT.md for detailed remediation steps"