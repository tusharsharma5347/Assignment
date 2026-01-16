# Deployment Guide

This guide explains how to deploy the Plinko game to production.

## Environment Variables Setup

### Backend (Server)

1. **Create `.env` file in `server/` directory:**
   ```bash
   cd server
   cp .env.example .env
   ```

2. **Configure the `.env` file:**
   ```env
   DATABASE_URL="file:./prod.db"
   PORT=3000
   NODE_ENV=production
   ```

   **Notes:**
   - For SQLite: Use `file:./prod.db` (relative path) or absolute path
   - For PostgreSQL: Use `postgresql://user:password@host:port/database`
   - `PORT` should match your hosting platform's requirements
   - Some platforms (Heroku, Render) set PORT automatically

### Frontend (Client)

1. **Create `.env` file in `client/` directory:**
   ```bash
   cd client
   cp .env.example .env
   ```

2. **Configure the `.env` file:**
   ```env
   VITE_API_URL=https://your-backend-domain.com
   ```

   **Notes:**
   - Replace `https://your-backend-domain.com` with your actual backend URL
   - No trailing slash needed
   - For local testing: `http://localhost:3000`

## Hosting Platforms

### Backend Deployment Options

#### Option 1: Render (Recommended)
1. Connect your GitHub repository
2. Create a new Web Service
3. Set build command: `cd server && npm install && npm run build`
4. Set start command: `cd server && npm start`
5. Add environment variables in Render dashboard:
   - `DATABASE_URL`
   - `NODE_ENV=production`
   - `PORT` (auto-set by Render)

#### Option 2: Railway
1. Connect GitHub repository
2. Create new project
3. Add environment variables
4. Railway auto-detects Node.js and runs `npm start`

#### Option 3: Fly.io
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Run `fly launch` in server directory
3. Configure environment variables
4. Deploy: `fly deploy`

#### Option 4: Heroku
1. Install Heroku CLI
2. `cd server && heroku create your-app-name`
3. `heroku config:set DATABASE_URL="file:./prod.db" NODE_ENV=production`
4. `git push heroku main`

### Frontend Deployment Options

#### Option 1: Vercel (Recommended)
1. Connect GitHub repository
2. Set root directory to `client`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable:
   - `VITE_API_URL` = your backend URL

#### Option 2: Netlify
1. Connect GitHub repository
2. Set base directory: `client`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variable:
   - `VITE_API_URL` = your backend URL

#### Option 3: GitHub Pages
1. Build: `cd client && npm run build`
2. Deploy `dist` folder to GitHub Pages
3. Set `VITE_API_URL` in build process

## Build Commands

### Backend
```bash
cd server
npm install
npm run build
npm start
```

### Frontend
```bash
cd client
npm install
npm run build
# Output is in client/dist/
```

## CORS Configuration

The backend already has CORS enabled. If you need to restrict it to your frontend domain:

Edit `server/src/index.ts`:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

## Database Setup

### SQLite (Default)
- Database file is created automatically
- Make sure the directory is writable
- For production, use absolute paths or ensure file persistence

### PostgreSQL (Optional)
1. Update `server/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Run migrations:
   ```bash
   cd server
   npx prisma migrate deploy
   npx prisma generate
   ```

## Quick Start Commands

### Local Development
```bash
# Terminal 1 - Backend
cd server
cp .env.example .env  # Edit if needed
npm install
npm run dev

# Terminal 2 - Frontend
cd client
cp .env.example .env  # Edit if needed
npm install
npm run dev
```

### Production Build
```bash
# Build backend
cd server
cp .env.example .env
# Edit .env with production values
npm install
npm run build

# Build frontend
cd client
cp .env.example .env
# Edit .env with production backend URL
npm install
npm run build
```

## Environment Variables Reference

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:./prod.db` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://api.example.com` |

## Troubleshooting

### Backend Issues
- **Database not found**: Ensure `DATABASE_URL` points to correct path
- **Port already in use**: Change `PORT` in `.env` or use platform's port
- **CORS errors**: Check CORS configuration matches frontend URL

### Frontend Issues
- **API calls failing**: Verify `VITE_API_URL` is correct
- **Build fails**: Ensure all dependencies are installed
- **Environment variables not working**: Vite requires `VITE_` prefix

## Security Notes

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use environment variables** on hosting platforms
3. **Keep `serverSeed` secret** - Never expose in client
4. **Validate inputs** - Server-side validation is already implemented

## Example Deployment URLs

After deployment, you should have:
- **Backend**: `https://plinko-api.example.com`
- **Frontend**: `https://plinko.example.com`

Set `VITE_API_URL=https://plinko-api.example.com` in frontend `.env`

