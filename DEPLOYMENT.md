# Deployment Guide - School Attendance System

This guide will walk you through deploying your School Attendance System to Vercel and connecting it to Supabase.

## Prerequisites

- GitHub account with the Robotics repository created
- Supabase account (free tier works fine)
- Vercel account
- All code pushed to GitHub

## Step 1: Create Supabase Project

### 1.1 Create New Project
1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in the project details:
   - **Organization:** Your organization (create one if needed)
   - **Project Name:** `robotics-attendance`
   - **Database Password:** Create a strong password (save this!)
   - **Region:** Choose the region closest to your users
5. Click "Create new project" and wait for it to be created (2-3 minutes)

### 1.2 Get Your Credentials
1. Once the project is created, go to **Settings > API**
2. Copy these values (you'll need them later):
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

## Step 2: Set Up Database

### 2.1 Create Tables and Functions
1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Open the file `supabase/migrations/001_initial_schema.sql` from your project
4. Copy the **entire** contents of that file
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** (execute the query)
7. Wait for all tables and functions to be created (should complete in a few seconds)

### 2.2 Verify Database Setup
In the SQL Editor, run this test query:
```sql
SELECT * FROM schools;
```

If you see no errors, your database is set up correctly!

## Step 3: Create Admin User

### 3.1 Create User in Supabase Auth
1. Go to **Authentication > Users** in Supabase
2. Click **"Invite new user"**
3. Enter your admin email (e.g., `admin@example.com`)
4. Click **"Send Invite"**
5. Copy the invite link provided
6. Open the link in a **new incognito/private window**
7. Create a password
8. You'll be redirected and logged in - copy your **User ID** from the URL

### 3.2 Create User Profile
1. Go back to Supabase **SQL Editor**
2. Create a new query and run this (replace `YOUR_USER_ID` with the ID you copied):

```sql
INSERT INTO public.user_profiles (id, email, full_name, role)
VALUES (
  'YOUR_USER_ID',
  'admin@example.com',
  'System Administrator',
  'admin'
);
```

3. Click **"Run"**

Now your admin user is created with admin permissions!

## Step 4: Push to GitHub

### 4.1 Initialize Git
```bash
cd C:\Users\User\robotics
git init
```

### 4.2 Configure Git (if not already done)
```bash
git config user.email "your.email@example.com"
git config user.name "Your Name"
```

### 4.3 Commit Code
```bash
git add .
git commit -m "Initial commit: School Attendance System"
```

### 4.4 Create Repository on GitHub
1. Go to [github.com/new](https://github.com/new)
2. Repository name: `Robotics`
3. Make it **Public** (so Vercel can access it)
4. **DO NOT** initialize with README, .gitignore, or license (you already have these)
5. Click **"Create repository"**

### 4.5 Push Code to GitHub
```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/Robotics.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 5: Deploy to Vercel

### 5.1 Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New" > "Project"**
3. Click **"Import Git Repository"**
4. Select your `Robotics` repository
5. Click **"Import"**

### 5.2 Configure Environment Variables
1. Under **Environment Variables**, add these variables:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | Your Vercel app URL (e.g., `https://robotics-attendance.vercel.app`) |

**Note:** You don't know the Vercel URL yet. You can add it after the first deployment.

### 5.3 Deploy
1. Click **"Deploy"**
2. Wait for the build to complete (3-5 minutes)
3. Once deployment is successful, you'll get your Vercel URL

### 5.4 Update Supabase Auth Configuration
Now that you have your Vercel URL:

1. Go back to Supabase
2. Go to **Authentication > URL Configuration**
3. Add your Vercel URL to **"Redirect URLs"**:
   - `https://your-vercel-app.vercel.app/auth/callback`
   - `https://your-vercel-app.vercel.app/login`

### 5.5 Update Vercel Environment Variables
1. Go back to Vercel project settings
2. Add/update `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
3. Redeploy (Vercel should auto-redeploy, but you can manually trigger it if needed)

## Step 6: Test Your Application

### 6.1 Access Your App
Go to your Vercel URL: `https://your-app-name.vercel.app`

### 6.2 Login
Use these credentials:
- **Email:** `admin@example.com` (or whatever email you used)
- **Password:** The password you created in Supabase Auth

### 6.3 Verify Features
1. ✅ Login works
2. ✅ Dashboard loads
3. ✅ Can navigate to Admin > Schools
4. ✅ Can add a school
5. ✅ Can add a class
6. ✅ Can add students
7. ✅ Can mark attendance

## Step 7: Add Initial Data (Optional)

Once deployed, you'll want to add some schools, classes, and students:

1. Go to **Admin > Schools** and create your school(s)
2. Go to **Admin > Classes** and create classes for each school
3. Go to **Admin > Students > Bulk Import** and import your students

Or add them manually through the UI.

## Troubleshooting

### "Invalid API key" Error
- Check that your environment variables are correctly set in Vercel
- Make sure you copied the exact keys from Supabase
- Redeploy after adding environment variables

### Login Not Working
- Verify the admin user exists in Supabase Auth
- Check that the user profile was created in the database
- Make sure your email and password are correct

### Database Connection Error
- Check that Supabase project is still active
- Verify service role key has correct permissions
- Make sure the schema migration ran successfully in step 2

### Page Shows "Loading" Forever
- Check browser console for errors (F12 > Console tab)
- Check Vercel deployment logs
- Make sure all environment variables are set

## Next Steps

1. **Create More Users:** Go to Supabase Auth > Users to invite teachers
2. **Import Students:** Use the bulk import feature to add all students at once
3. **Set Up Attendance:** Start marking attendance through the dashboard
4. **Monitor Alerts:** Check the Alerts section regularly
5. **Review Reports:** View attendance reports and analytics

## Support

If you encounter issues:

1. **Check Supabase Status:** Visit [supabase.com/status](https://supabase.com/status)
2. **Check Vercel Status:** Visit [vercel.com/status](https://vercel.com/status)
3. **Review Logs:**
   - Supabase: Check SQL Editor or error messages
   - Vercel: Check the Deployments tab for build logs
4. **Test Locally:** You can run `npm install && npm run dev` locally to test

## Important Notes

- **Security:** Never commit `.env.local` to GitHub (it's in `.gitignore`)
- **Backups:** Supabase automatically backs up your database
- **Scalability:** The free tier of both Supabase and Vercel can handle 1000+ users
- **Costs:** Both services have free tiers; you only pay when you exceed limits

## Congratulations! 🎉

Your School Attendance System is now live and ready to use!

For any questions or issues, refer to the main [README.md](README.md).
