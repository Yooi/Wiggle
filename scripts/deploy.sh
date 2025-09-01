#!/bin/bash

# Wiggle One-Click Deployment Script
# Usage: ./deploy.sh [platform]
# Platform options: vercel, netlify, zeabur, github, railway

set -e

PLATFORM=${1:-"help"}
PROJECT_NAME="wiggle"

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Print colored messages
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check dependencies
check_dependencies() {
    print_step "Checking project dependencies..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json file not found"
        exit 1
    fi
    
    if [ ! -d "node_modules" ]; then
        print_warning "node_modules not found, installing dependencies..."
        npm install
    fi
    
    print_message "Dependencies check completed"
}

# Build project
build_project() {
    print_step "Building project..."
    npm run build
    if [ $? -ne 0 ]; then
        print_error "Build failed"
        exit 1
    fi
    print_message "Project build completed"
}

# Vercel deployment
deploy_vercel() {
    print_step "Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not installed, installing..."
        npm install -g vercel
    fi
    
    vercel --prod
    if [ $? -eq 0 ]; then
        print_success "✅ Vercel deployment completed!"
    else
        print_error "Vercel deployment failed"
        exit 1
    fi
}

# GitHub Pages deployment
deploy_github() {
    print_step "Deploying to GitHub Pages..."
    
    if ! command -v gh-pages &> /dev/null; then
        print_warning "gh-pages not installed, installing..."
        npm install -g gh-pages
    fi
    
    build_project
    gh-pages -d dist
    if [ $? -eq 0 ]; then
        print_success "✅ GitHub Pages deployment completed!"
    else
        print_error "GitHub Pages deployment failed"
        exit 1
    fi
}

# Netlify deployment
deploy_netlify() {
    print_step "Deploying to Netlify..."
    
    if ! command -v netlify &> /dev/null; then
        print_warning "Netlify CLI not installed, installing..."
        npm install -g netlify-cli
    fi
    
    build_project
    netlify deploy --prod --dir=dist
    if [ $? -eq 0 ]; then
        print_success "✅ Netlify deployment completed!"
    else
        print_error "Netlify deployment failed"
        exit 1
    fi
}

# Railway deployment
deploy_railway() {
    print_step "Deploying to Railway..."
    
    if ! command -v railway &> /dev/null; then
        print_warning "Railway CLI not installed, installing..."
        npm install -g @railway/cli
    fi
    
    build_project
    railway up
    if [ $? -eq 0 ]; then
        print_success "✅ Railway deployment completed!"
    else
        print_error "Railway deployment failed"
        exit 1
    fi
}

# Zeabur deployment instructions
deploy_zeabur() {
    print_step "Zeabur deployment instructions..."
    print_message "Zeabur supports automatic deployment from Git repositories"
    print_message "Please visit: https://zeabur.com"
    print_message "1. Connect your GitHub account"
    print_message "2. Select this repository"
    print_message "3. System will automatically recognize zbpack.json configuration"
    print_message "4. Click deploy to start"
    echo ""
    print_message "For more details, visit: https://zeabur.com/docs"
}

# Show help information
show_help() {
    echo -e "${BLUE}Wiggle One-Click Deployment Script${NC}"
    echo ""
    echo "Usage:"
    echo "  ./deploy.sh [platform]"
    echo ""
    echo "Supported platforms:"
    echo "  vercel     - Deploy to Vercel"
    echo "  github     - Deploy to GitHub Pages" 
    echo "  netlify    - Deploy to Netlify"
    echo "  railway    - Deploy to Railway"
    echo "  zeabur     - Show Zeabur deployment instructions"
    echo "  all        - Show all deployment options"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh vercel"
    echo "  ./deploy.sh github"
    echo "  ./deploy.sh netlify"
    echo ""
    echo "Requirements:"
    echo "  - Node.js 18 or higher"
    echo "  - npm or yarn package manager"
    echo "  - Git repository setup"
    echo ""
    echo "For more information, see: DEPLOY.md"
}

# Show all deployment options
show_all_options() {
    echo -e "${BLUE}=== Wiggle Deployment Options ===${NC}"
    echo ""
    echo -e "${GREEN}1. One-Click Deploy Buttons:${NC}"
    echo "   - Vercel: https://vercel.com/new/clone?repository-url=YOUR_REPO"
    echo "   - Netlify: https://app.netlify.com/start/deploy?repository=YOUR_REPO"
    echo "   - Zeabur: https://zeabur.com/templates/TEMPLATE_ID"
    echo "   - Railway: https://railway.app/new/template?template=YOUR_TEMPLATE"
    echo ""
    echo -e "${GREEN}2. Command Line Deployment:${NC}"
    echo "   - ./deploy.sh vercel"
    echo "   - ./deploy.sh github"
    echo "   - ./deploy.sh netlify"
    echo "   - ./deploy.sh railway"
    echo ""
    echo -e "${GREEN}3. Online Development:${NC}"
    echo "   - Gitpod: https://gitpod.io/#YOUR_REPO"
    echo "   - CodeSandbox: https://codesandbox.io/s/github/YOUR_REPO"
    echo "   - StackBlitz: https://stackblitz.com/github/YOUR_REPO"
    echo ""
    echo -e "${GREEN}4. Manual Deployment:${NC}"
    echo "   - Build: npm run build"
    echo "   - Deploy dist folder to any static hosting"
}

# Main function
main() {
    echo -e "${PURPLE}🚀 Wiggle Deployment Tool${NC}"
    echo "================================"
    
    case $PLATFORM in
        "vercel")
            check_dependencies
            deploy_vercel
            ;;
        "github")
            check_dependencies
            deploy_github
            ;;
        "netlify")
            check_dependencies
            deploy_netlify
            ;;
        "railway")
            check_dependencies
            deploy_railway
            ;;
        "zeabur")
            deploy_zeabur
            ;;
        "all")
            show_all_options
            ;;
        "help"|*)
            show_help
            ;;
    esac
    
    echo ""
    print_success "Deployment script completed successfully!"
}

# Run main function
main
