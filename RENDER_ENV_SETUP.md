# 🔧 Render Environment Variables Setup

## ❌ Current Error

Your Render deployment is failing because `SUPABASE_SERVICE_ROLE_KEY` is missing.

```
Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required
```

## ✅ Solution: Add Environment Variables to Render

### Step 1: Go to Render Dashboard

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Select your service (e.g., `voicebackend-development`)
3. Click on **"Environment"** in the left sidebar

### Step 2: Add Missing Environment Variable

Add this environment variable:

**Key**: `SUPABASE_SERVICE_ROLE_KEY`  
**Value**: `your_supabase_service_role_key_here` (Get this from Supabase Dashboard → Settings → API)

### Step 3: Verify All Required Variables

Make sure you have ALL these environment variables set in Render:

#### 🔐 Required Variables

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# JWT Secret
JWT_SECRET=your_jwt_secret_here
SUPABASE_JWT_SECRET=your_jwt_secret_here

# AI Service API Keys
DEEPGRAM_API_KEY=your_deepgram_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
HF_API_KEY=your_huggingface_api_key_here

# Server Configuration
PORT=7000
NODE_ENV=production

# CORS Configuration (add your frontend URLs)
CORS_ORIGIN=https://your-frontend.vercel.app,http://localhost:3000
```

#### 📋 Optional but Recommended

```env
# Database (optional direct connection)
DATABASE_URL=postgresql://postgres:your_password@db.your-project.supabase.co:5432/postgres

# React App Supabase (for convenience)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
REACT_APP_SUPABASE_BUCKET=projectai
```

### Step 4: Save and Redeploy

1. Click **"Save Changes"** at the bottom
2. Render will automatically trigger a new deployment
3. Wait for the deployment to complete
4. Check the logs to verify the server starts successfully

## 🔍 How to Verify

After adding the environment variable, check the deployment logs. You should see:

```
✅ Environment check:
SUPABASE_URL: ✅ Found
SUPABASE_KEY: ✅ Found
DEEPGRAM_API_KEY: ✅ Found
ELEVENLABS_API_KEY: ✅ Found
```

And the server should start without errors:

```
🏢 ===================================
🚪 SERVER IS RUNNING! 
🌐 Port: 7000
💚 Health: http://localhost:7000/health
===================================
```

## 📝 Quick Checklist

- [ ] `SUPABASE_URL` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set ⚠️ **THIS IS THE MISSING ONE**
- [ ] `SUPABASE_ANON_KEY` is set
- [ ] `JWT_SECRET` or `SUPABASE_JWT_SECRET` is set
- [ ] `DEEPGRAM_API_KEY` is set
- [ ] `ELEVENLABS_API_KEY` is set
- [ ] `PORT` is set (optional, defaults to 7000)
- [ ] `NODE_ENV` is set to `production`
- [ ] `CORS_ORIGIN` includes your frontend URLs

## 🚨 Important Notes

1. **Never commit `.env` files** to Git - they contain sensitive keys
2. **Service Role Key is sensitive** - it bypasses Row Level Security (RLS)
3. **Keep keys secure** - don't share them publicly
4. **Restart required** - Render automatically redeploys when you save environment variables

## 🔗 Where to Find Your Keys

### Supabase Service Role Key
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Find **"service_role"** key (⚠️ Keep this secret!)

### Supabase Anon Key
1. Same location as above
2. Find **"anon"** or **"public"** key

### JWT Secret
1. Go to **Settings** → **API** in Supabase
2. Find **"JWT Secret"** at the bottom

---

**After adding `SUPABASE_SERVICE_ROLE_KEY`, your deployment should work! 🎉**

