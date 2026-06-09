# Lofi Radio - Self-Host Docker Deployment

🎵 **Easy Docker deployment for [Lofi Radio](https://github.com/joan-tomas-1995/lofi-radio)**

This repository provides everything you need to self-host the Lofi Radio application on your home server using Docker.

## 🚀 Quick Start

1. **Clone this repository:**
   ```bash
   git clone https://github.com/yourusername/lofi-radio-selfhost.git
   cd lofi-radio-selfhost
   ```

2. **Run the deployment script:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

   Or manually:
   ```bash
   # Clone the original lofi-radio app
   git clone https://github.com/joan-tomas-1995/lofi-radio.git
   
   # Copy Docker files to the app directory
   cp Dockerfile docker-compose.yml nginx.conf .dockerignore lofi-radio/
   
   # Build and run
   cd lofi-radio
   docker compose up -d
   ```

3. **Access your lofi radio:**
   Open `http://localhost:3000` in your browser

## 🎯 What You Get

- ✅ **One-command deployment** - Just run the script
- ✅ **Production-ready** - Optimized nginx configuration
- ✅ **Self-contained** - No external dependencies
- ✅ **Auto-restart** - Container restarts on failure
- ✅ **Health checks** - Monitors application health
- ✅ **Lightweight** - Multi-stage Docker build

## 📁 Repository Contents

```
lofi-radio-selfhost/
├── README.md           # This guide
├── deploy.sh           # One-click deployment script
├── Dockerfile          # Multi-stage build configuration
├── docker-compose.yml  # Container orchestration
├── nginx.conf          # Production web server config
└── .dockerignore       # Build optimization
```

## 🔧 Manual Commands

If you prefer to run commands manually:

```bash
# Clone this repo
git clone https://github.com/yourusername/lofi-radio-selfhost.git
cd lofi-radio-selfhost

# Clone the original app
git clone https://github.com/joan-tomas-1995/lofi-radio.git

# Copy Docker files
cp Dockerfile docker-compose.yml nginx.conf .dockerignore lofi-radio/

# Deploy
cd lofi-radio
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f lofi-radio
```

## 🏠 Home Server Setup

### Port Configuration
- Default: `http://localhost:3000`
- Change port in `docker-compose.yml`:
  ```yaml
  ports:
    - "8080:80"  # Use port 8080 instead
  ```

### Reverse Proxy (Optional)
For custom domains, add this to your reverse proxy:
```nginx
server {
    listen 80;
    server_name lofi.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🛠️ Management Commands

```bash
# Start the application
docker compose up -d

# Stop the application
docker compose down

# Update and rebuild
docker compose up --build -d

# View logs
docker compose logs -f lofi-radio

# Check container status
docker compose ps

# Remove everything (including volumes)
docker compose down --volumes --rmi all
```

## 🚨 Troubleshooting

### Common Issues & Solutions

**Problem:** `docker-compose: command not found`
```bash
# Solution: Use the newer Docker Compose plugin
docker compose up -d
```

**Problem:** Port 3000 already in use
```bash
# Solution: Change port in docker-compose.yml
ports:
  - "3001:80"  # Use port 3001 instead
```

**Problem:** Container keeps restarting
```bash
# Check logs for errors
docker compose logs lofi-radio

# Common fix: Ensure port isn't blocked by firewall
sudo ufw allow 3000
```

**Problem:** Can't access from other devices
```bash
# Solution: Bind to all interfaces in docker-compose.yml
ports:
  - "0.0.0.0:3000:80"
```

## 🔄 Updates

To update the lofi-radio app:

```bash
cd lofi-radio
git pull origin main
docker compose up --build -d
```

## 📊 System Requirements

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **RAM**: 256MB minimum
- **Storage**: 100MB
- **Network**: Port 3000 (or custom port)

## 🛡️ Security Notes

- Application runs as non-root user
- Nginx serves static files only
- No persistent data stored
- Health checks monitor uptime
- Automatic restart on failure

## 🤝 Contributing

Found an issue or want to improve the deployment?

1. Fork this repository
2. Create a feature branch
3. Submit a pull request

## 📄 License

This deployment configuration is provided under MIT License. 
The original [Lofi Radio](https://github.com/joan-tomas-1995/lofi-radio) app has its own license.

## 🙏 Credits

- Original app: [joan-tomas-1995/lofi-radio](https://github.com/joan-tomas-1995/lofi-radio)
- Docker deployment: This repository

---

**Enjoying the lofi vibes?** ⭐ Star this repo and the original project!
