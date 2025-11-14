# Render Deployment Configuration Guide

## Environment Variables for Render

When deploying to Render, you need to set the following environment variables in your Render dashboard:

### Required Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here

# API Keys
DEEPGRAM_API_KEY=your_deepgram_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=10000
# Note: Render automatically sets PORT, but you can override it if needed

# CORS Configuration - Production Vercel URLs
CORS_ORIGIN=https://your-frontend.vercel.app,https://your-frontend-git-main.vercel.app,http://localhost:3000

# Localhost (disabled in production)
# Set ALLOW_LOCALHOST=true only if you need local development
# ALLOW_LOCALHOST=false

# Frontend Configuration (for fallback)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## How to Set Environment Variables in Render

1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add each environment variable:
   - Click "Add Environment Variable"
   - Enter the variable name (e.g., `SUPABASE_URL`)
   - Enter the variable value
   - Click "Save Changes"
5. Repeat for all variables above
6. **Important**: After adding all variables, restart your service

## CORS Configuration

The backend is configured to:
- ✅ Allow all Vercel `voicefrontend` deployments (automatically detected)
- ✅ Allow explicitly listed origins from `CORS_ORIGIN` environment variable
- ✅ Block localhost by default (unless `ALLOW_LOCALHOST=true` is set)
- ✅ Allow requests with no origin (for server-to-server calls)

## Vercel Deployment URLs

The following Vercel URLs are automatically allowed:
- `https://voicefrontend-kappa.vercel.app`
- `https://voicefrontend-git-development-karthavya-srivastavas-projects.vercel.app`
- `https://voicefrontend-nxaqfw463-karthavya-srivastavas-projects.vercel.app`
- `https://voicefrontend-karthavya-srivastavas-projects.vercel.app`
- `https://voicefrontend-b3te.vercel.app`
- `https://voicefrontend-b3te-git-main-karthavya-srivastavas-projects.vercel.app`
- `https://voicefrontend-b3te-1k7sedhbd-karthavya-srivastavas-projects.vercel.app`

**Note**: Any URL containing `voicefrontend` and `vercel.app` is automatically allowed, so new Vercel deployments will work automatically.

## Frontend Configuration (Vercel)

Make sure your frontend has these environment variables in Vercel:

```bash
REACT_APP_SUPABASE_URL=https://lqewkooprqatcjoydwgb.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
REACT_APP_BACKEND_URL=https://your-render-backend-url.onrender.com
```

## Testing CORS

After deployment, test CORS by:
1. Opening your Vercel frontend
2. Open browser DevTools → Network tab
3. Try uploading a video or accessing the dashboard
4. Check the console for CORS errors
5. Check Render logs for CORS approval messages

## Troubleshooting

### CORS Errors
- Check that your frontend URL is in the `CORS_ORIGIN` list
- Verify that the origin includes `voicefrontend` and `vercel.app`
- Check Render logs for CORS approval/block messages
- Ensure `credentials: true` is set in frontend fetch requests

### Environment Variables Not Working
- Restart your Render service after adding environment variables
- Check that variable names match exactly (case-sensitive)
- Verify no extra spaces in variable values
- Check Render logs for environment variable errors

### Backend Not Starting
- Check that all required environment variables are set
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check Render logs for startup errors
- Ensure `PORT` is set (Render usually sets this automatically)

## Security Notes

⚠️ **Important**:
- Never commit `.env` file to git (already in `.gitignore`)
- Service role key has full access - keep it secure
- Use environment variables in Render, not hardcoded values
- Regularly rotate API keys
- Monitor Render logs for unauthorized access attempts




