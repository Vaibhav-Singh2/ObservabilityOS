# Deployment Guide — ObservabilityOS

This guide covers deploying the ObservabilityOS monorepo to production using **Vercel** (Frontend Next.js app) and **Railway** (MongoDB Database).

---

## 1. Database Setup (Railway)

We recommend using **Railway** to provision your production MongoDB database:

1. Log in to [Railway](https://railway.app/).
2. Click **New Project** and select **Provision MongoDB**.
3. Once the database is provisioned, navigate to the **Variables** tab of the MongoDB service.
4. Copy the connection string from `MONGO_URL` or `MONGODB_URI` (looks like `mongodb://mongo:...`).
5. Save this URI for the Next.js environment variables.

---

## 2. Web Application Setup (Vercel)

Deploy the Next.js frontend (`apps/web`) to **Vercel**:

1. Log in to [Vercel](https://vercel.com/) and click **Add New** > **Project**.
2. Import the GitHub repository for `ObservabilityOS`.
3. In the **Configure Project** step:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web` (Leave unchecked to run from monorepo root, or select `apps/web` if your setup allows workspace builds).
     - _Recommended Monorepo settings_: Keep the root directory as the repo root, and configure:
       - **Build Command**: `npx turbo run build --filter=web`
       - **Output Directory**: `apps/web/.next`
       - **Install Command**: `yarn install`
4. Add the following **Environment Variables**:
   - `MONGODB_URI`: _Your Railway connection string_
   - `JWT_SECRET`: _A secure random string for JWT session signing_
   - `GITHUB_CLIENT_ID`: _Your production GitHub OAuth app Client ID_
   - `GITHUB_CLIENT_SECRET`: _Your production GitHub OAuth app Client Secret_
   - `NEXT_PUBLIC_APP_URL`: _Your production Vercel deployment URL_ (e.g. `https://your-app.vercel.app`)
5. Click **Deploy**.

---

## 3. GitHub OAuth Application Configuration

Ensure your OAuth application on GitHub matches your production URL:

1. Go to **Settings** > **Developer Settings** > **OAuth Apps** in GitHub.
2. Select your OAuth app or create a new one.
3. Update the URLs:
   - **Homepage URL**: `https://your-app.vercel.app`
   - **Authorization callback URL**: `https://your-app.vercel.app/api/auth/callback`
4. Copy the **Client ID** and generate a new **Client Secret**, updating your Vercel deployment variables if they have changed.
