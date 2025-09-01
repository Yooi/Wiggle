# 🚀 Wiggle One-Click Deployment Guide

This project supports one-click deployment to multiple platforms. Choose the platform that best suits your needs:

## 📋 Quick Deployment Options

### 🟢 Option 1: One-Click Deploy Buttons (Recommended)

| Platform | Deploy Button | Description |
|----------|---------------|-------------|
| **Vercel** | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Yooi/Wiggle) | Fastest deployment, automatic CI/CD |
| **Netlify** | [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/Yooi/Wiggle) | User-friendly, global CDN acceleration |
| **Zeabur** | [![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/LWSTGM?referralCode=Yooi) | China-friendly access |
| **Railway** | [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/XXXXXX) | Container-based deployment |

### 🟡 Option 2: Online Development Environments

| Platform | Open Button | Description |
|----------|-------------|-------------|
| **Gitpod** | [![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/Yooi/Wiggle) | Cloud-based VS Code |
| **CodeSandbox** | [![Open in CodeSandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/github/Yooi/Wiggle) | Online editor |
| **StackBlitz** | [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/Yooi/Wiggle) | Quick preview |

---

## 🛠️ Manual Deployment Guide

### 1️⃣ GitHub Pages

**Automatic Deployment (Recommended):**
1. Fork this repository to your GitHub account
2. Go to repository Settings → Pages → Source, select "GitHub Actions"
3. Push code changes to automatically trigger deployment

**Manual Deployment:**
```bash
# Install gh-pages
npm install -g gh-pages

# Build and deploy
npm run deploy:gh-pages
```

### 2️⃣ Vercel

**Method A: Using Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Login and deploy
vercel login
npm run deploy:vercel
```

**Method B: Import from GitHub**
1. Visit [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import this repository from GitHub
4. Use default settings and click Deploy

### 3️⃣ Zeabur

**Steps:**
1. Visit [zeabur.com](https://zeabur.com)
2. Connect your GitHub account
3. Select this repository for deployment
4. The system will automatically recognize the `zbpack.json` configuration

### 4️⃣ Netlify

**Drag & Drop Deployment:**
```bash
# Build the project
npm run build

# Drag and drop the dist folder to netlify.com
```

**Git Deployment:**
1. Visit [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Select this repository
4. Build command: `npm run build`
5. Publish directory: `dist`

### 5️⃣ Railway

**Steps:**
1. Visit [railway.app](https://railway.app)
2. Click "Deploy from GitHub repo"
3. Select this repository
4. Railway will automatically detect the configuration from `railway.toml`

---

## ⚙️ Environment Variables Configuration

If your application requires environment variables, set them in your deployment platform:

```env
# Example environment variables
VITE_API_URL=https://api.example.com
VITE_APP_NAME=Wiggle
VITE_ENABLE_ANALYTICS=true
```

### Platform-Specific Environment Setup

**Vercel:**
- Add variables in Project Settings → Environment Variables
- Supports different environments (Development, Preview, Production)

**Netlify:**
- Set in Site Settings → Environment Variables
- Available during build and runtime

**GitHub Pages:**
- Use GitHub Secrets for sensitive variables
- Configure in repository Settings → Secrets and variables → Actions

---

## 🎯 Platform Selection Guide

| Use Case | Recommended Platform | Reason |
|----------|---------------------|---------|
| **Personal Projects** | Vercel | Generous free tier, fast performance |
| **Commercial Projects** | Vercel Pro | Enterprise features, high reliability |
| **China Users** | Zeabur | Domestic CDN, fast access speed |
| **Open Source Projects** | GitHub Pages | Integrated with code repository |
| **Quick Testing** | Netlify | Simple deployment, easy previews |
| **Advanced DevOps** | Railway | Container-based, advanced configuration |

---

## � Configuration Files Overview

This project includes comprehensive deployment configurations:

```
├── .github/workflows/deploy-github-pages.yml  # GitHub Actions workflow
├── vercel.json                                 # Vercel configuration
├── netlify.toml                                # Netlify build settings
├── zbpack.json                                 # Zeabur deployment config
├── railway.toml                                # Railway deployment config
├── .gitpod.yml                                 # Gitpod environment setup
└── scripts/
    ├── deploy.sh                               # Unix deployment script
    └── deploy.bat                              # Windows deployment script
```

### Configuration Details

**Vercel (`vercel.json`):**
- Static build configuration
- SPA routing support
- Framework detection

**Netlify (`netlify.toml`):**
- Build command and publish directory
- Headers and caching rules
- Redirect configuration for SPA

**GitHub Actions (`.github/workflows/deploy-github-pages.yml`):**
- Automated CI/CD pipeline
- Node.js setup and dependency caching
- Build artifacts upload

---

## �🚨 Troubleshooting

### Common Issues

**Q: Deployment fails with build errors?**
A: Check the following:
- Node.js version is >= 18
- Dependencies are correctly installed: `npm ci`
- Build command is correct: `npm run build`
- TypeScript compilation passes: `npm run lint`

**Q: How to set up custom domain?**
A: 
1. Add custom domain in your platform's project settings
2. Configure DNS records:
   - **A Record**: Point to platform's IP
   - **CNAME**: Point to platform's domain
3. Wait for DNS propagation (up to 24 hours)

**Q: How to enable HTTPS?**
A: Most platforms automatically provide HTTPS certificates. For custom certificates:
- **Vercel**: Automatic SSL/TLS certificates
- **Netlify**: Free Let's Encrypt certificates
- **GitHub Pages**: Automatic HTTPS for `.github.io` domains

**Q: Site shows 404 for routes?**
A: Ensure SPA routing is configured:
- **Vercel**: `vercel.json` includes route fallback
- **Netlify**: `_redirects` file or `netlify.toml` redirects
- **GitHub Pages**: Use hash routing or 404.html fallback

**Q: Build takes too long?**
A: Optimize build performance:
- Enable dependency caching
- Use `npm ci` instead of `npm install`
- Optimize bundle size with `npm run build -- --analyze`

### Getting Help

**Platform-Specific Support:**
- **Vercel**: [Vercel Docs](https://vercel.com/docs)
- **Netlify**: [Netlify Docs](https://docs.netlify.com)
- **GitHub Pages**: [GitHub Pages Docs](https://docs.github.com/en/pages)
- **Zeabur**: [Zeabur Docs](https://zeabur.com/docs)

**Project Support:**
- 🐛 [Submit Issues](https://github.com/Yooi/Wiggle/issues)
- 💬 [GitHub Discussions](https://github.com/Yooi/Wiggle/discussions)
- 📧 Contact: [Create an issue for support]

---

## 🚀 Advanced Deployment

### Custom Build Scripts

You can customize deployment with additional scripts:

```bash
# Build for specific environments
npm run build:production
npm run build:staging

# Deploy to specific platforms
npm run deploy:vercel
npm run deploy:netlify
```

### CI/CD Integration

**GitHub Actions Example:**
```yaml
name: Deploy to Multiple Platforms
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
```

### Performance Optimization

**Build Optimization:**
- Enable gzip compression
- Optimize images and assets
- Use CDN for static resources
- Implement proper caching strategies

**Runtime Optimization:**
- Enable service workers
- Implement lazy loading
- Optimize bundle splitting
- Monitor Core Web Vitals

---

## 📊 Deployment Comparison

| Feature | Vercel | Netlify | GitHub Pages | Zeabur | Railway |
|---------|--------|---------|--------------|---------|---------|
| **Free Tier** | ✅ Generous | ✅ Good | ✅ Unlimited | ✅ Limited | ✅ Limited |
| **Custom Domain** | ✅ Free SSL | ✅ Free SSL | ✅ Limited | ✅ Paid | ✅ Paid |
| **Global CDN** | ✅ Edge Network | ✅ Global | ✅ GitHub CDN | ✅ Regional | ❌ Single Region |
| **Build Time** | ⚡ Fast | ⚡ Fast | 🐌 Moderate | ⚡ Fast | 🐌 Moderate |
| **Analytics** | ✅ Built-in | ✅ Built-in | ❌ None | ✅ Basic | ❌ None |
| **Preview URLs** | ✅ Per PR | ✅ Per PR | ❌ None | ✅ Per Branch | ✅ Per PR |
| **Edge Functions** | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ❌ No |

---

## 🎉 Success!

After successful deployment, your Wiggle application will be live! Here's what to do next:

1. **Test Your Deployment**
   - Visit your live URL
   - Test voice chat functionality
   - Verify responsive design on mobile

2. **Share Your Project**
   - Add the live URL to your GitHub repository
   - Share on social media
   - Submit to showcases and directories

3. **Monitor Performance**
   - Set up analytics (optional)
   - Monitor Core Web Vitals
   - Track user engagement

4. **Continuous Improvement**
   - Set up automatic deployments
   - Monitor error rates
   - Gather user feedback

**� Congratulations on deploying Wiggle! Don't forget to star the repository if you found this helpful!**
