
# Cloud Deployment Guide (Serverless)

Your application has been refactored to be **Backend-Less (Serverless)**. This means you do **not** need to deploy the Node.js server to the cloud. The frontend (React) communicates directly with Supabase (Database/Auth) and Microsoft Azure (AI).

## 1. Prerequisites (Cloud Services)

### A. Supabase (Database & Auth)
1.  Go to [supabase.com](https://supabase.com) and create a new project.
2.  Go to **Project Settings -> API** and copy:
    *   `Project URL`
    *   `anon` public key

### B. Database Setup (SQL)
1.  In your Supabase Dashboard, go to the **SQL Editor**.
2.  Open the file `supabase_schema.sql` from this repository on your computer.
3.  Copy the entire content and paste it into the Supabase SQL Editor.
4.  Click **Run**. This will create all your tables (Projects, Invoices, etc.) and security rules.

### C. Authentication Configuration
1.  In Supabase, go to **Authentication -> Providers**.
2.  Ensure **Email** is enabled.
3.  (Optional) Disable "Confirm email" if you want users to log in immediately without verifying email first.

## 2. Deploying to Vercel (Recommended)

1.  Go to [vercel.com](https://vercel.com) and sign up/login.
2.  Click **Add New -> Project**.
3.  Import your GitHub repository: `nexile-intellifin`.
4.  **Configure Project:**
    *   **Framework Preset:** Vite
    *   **Root Directory:** `./` (default)
    *   **Build Command:** `npm run build` (default)
    *   **Output Directory:** `dist` (default)

5.  **Environment Variables (CRITICAL):**
    Add the following variables in the "Environment Variables" section before clicking Deploy:

    | Name | Value |
    |------|-------|
    | `VITE_SUPABASE_URL` | *Your Supabase Project URL* |
    | `VITE_SUPABASE_ANON_KEY` | *Your Supabase Anon Key* |
    | `VITE_GITHUB_TOKENS` | *Your GitHub Tokens (comma-separated) for AI* |

    *Note: `VITE_GITHUB_TOKENS` were previously hardcoded. You need to add them here. Format: `ghp_key1,ghp_key2`*

6.  Click **Deploy**.

## 3. Verify Deployment
Once Vercel finishes:
1.  Open the deployment URL.
2.  Sign up for a new account (this creates a user in your *production* Supabase database).
3.  Try creating a project or invoice.

## Troubleshooting
*   **White Screen?** Check the browser console (F12) for errors.
*   **"Missing Supabase variables"?** Ensure you added them exactly as named above in Vercel settings and redeployed.
*   **AI Not Working?** Ensure `VITE_GITHUB_TOKENS` is valid and contains at least one working GitHub Model token.
