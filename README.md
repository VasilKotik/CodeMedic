# FixlyCode - AI Code Assistant

AI-powered code assistant for debugging, optimizing, and analyzing code with secure backend deployment on Vercel.

## 🚀 Deployment to Vercel

### Prerequisites

1. A Vercel account
2. GitHub repository with this code
3. API keys for:
   - Google Gemini API
   - OpenRouter API

### Step 1: Set Environment Variables in Vercel

Go to your Vercel project settings and add the following environment variables:

- `GEMINI_API_KEY` - Your Google Gemini API key
- `OPENROUTER_API_KEY` - Your OpenRouter API key  
- `INTERNAL_SECRET_KEY` - Secret token for authentication (must match `INTERNAL_TOKEN_CLIENT` in `script.js`)
- `ALLOWED_ORIGINS` - (Optional) Comma-separated list of allowed origins for CORS

**Important:** The `INTERNAL_SECRET_KEY` value must exactly match the `INTERNAL_TOKEN_CLIENT` constant in `script.js`.

### Step 2: Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the project
3. Click "Deploy"
4. Your app will be available at `https://your-project.vercel.app`

### Step 3: Verify Deployment

- Frontend: `https://your-project.vercel.app`
- API endpoint: `https://your-project.vercel.app/api/ai-request`
- Health check: `https://your-project.vercel.app/api/ai-request` (GET request)

## 📁 Project Structure

```
FixlyCode/
├── api/
│   └── ai-request.js      # Vercel serverless function
├── index.html             # Frontend application
├── script.js              # Client-side JavaScript
├── style.css              # Styles
├── package.json           # Node.js dependencies
├── vercel.json            # Vercel configuration
└── .gitignore             # Git ignore rules
```

## 🔒 Security Features

- ✅ All API keys stored server-side only
- ✅ Internal token authentication
- ✅ CORS protection
- ✅ Rate limiting (via Vercel)
- ✅ No sensitive data in client code

## 🛠️ Local Development

For local development, you can use the Express server:

```bash
npm install
npm run dev
```

Make sure to create a `.env` file with your API keys:

```
GEMINI_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
INTERNAL_SECRET_KEY=your_secret_here
```

## 📝 Notes

- The serverless function uses CommonJS (`module.exports`) for Vercel compatibility
- Node.js 18+ is required (has built-in `fetch`)
- The API endpoint is `/api/ai-request` which routes to `api/ai-request.js`
