# School Attendance Tracking System

A professional, interactive web application for managing school attendance, tracking low attendance alerts, and managing student accounts with integrated debtor tracking.

## Features

- 📋 **Attendance Marking** - Mark student attendance with reasons and comments
- 🚨 **Smart Alerts** - Automatic alerts for low attendance patterns
- 💰 **Debtor Tracking** - Integrated payment tracking linked to attendance
- 📊 **Reports & Analytics** - Detailed attendance reports and visualizations
- 👥 **Role-Based Access** - Admin and Teacher roles with appropriate permissions
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui components
- **Backend:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Database:** PostgreSQL with Row Level Security
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works fine)
- GitHub account
- Vercel account

### Local Development (Optional)

```bash
# Install dependencies
npm install

# Create .env.local with your Supabase credentials
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in the project details:
   - **Organization:** Your organization
   - **Project Name:** robotics-attendance
   - **Database Password:** Create a strong password
   - **Region:** Choose closest to your location
4. Wait for project to be created
5. Go to Project Settings > API
6. Copy your credentials:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Set Up Database

1. In Supabase, go to SQL Editor
2. Click "New Query"
3. Copy and paste the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run" to create all tables, functions, and triggers

### Step 3: Create Admin User

In Supabase Auth:

1. Go to Authentication > Users
2. Click "Invite new user"
3. Enter admin email (e.g., admin@example.com)
4. Click "Send invite"
5. Copy the invite link
6. In a new incognito window, visit the link and set password
7. User will be created in auth.users

Then add the user profile:

1. Go back to Supabase SQL Editor
2. Run this query (replace with your admin user ID from auth.users):

```sql
INSERT INTO public.user_profiles (id, email, full_name, role)
VALUES (
  'YOUR_ADMIN_USER_ID_HERE',
  'admin@example.com',
  'System Administrator',
  'admin'
);
```

### Step 4: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: School Attendance System"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/Robotics.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 5: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" > "Project"
3. Select your GitHub repository "Robotics"
4. In "Environment Variables" add:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
   - `NEXT_PUBLIC_APP_URL` = your Vercel app URL (e.g., https://robotics-attendance.vercel.app)
5. Click "Deploy"

### Step 6: Configure Supabase Auth Redirect

1. In Supabase, go to Authentication > URL Configuration
2. Add your Vercel URL to "Redirect URLs":
   - `https://your-vercel-app.vercel.app/auth/callback`
   - `https://your-vercel-app.vercel.app/login`

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Protected dashboard routes
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components (Sidebar, Header)
│   ├── attendance/        # Attendance-specific components
│   ├── admin/             # Admin panel components
│   └── ...
├── lib/
│   ├── supabase/          # Supabase client setup
│   ├── utils.ts           # Utility functions
│   └── validations.ts     # Zod schemas
├── types/                 # TypeScript type definitions
├── hooks/                 # Custom React hooks
└── middleware.ts          # Auth middleware
```

## Database Schema

### Key Tables

- **user_profiles** - Extends Supabase auth.users with role and profile info
- **schools** - School information
- **classes** - Classes with schedule information
- **students** - Student data
- **attendance_records** - Daily attendance tracking
- **student_accounts** - Account balances for billing
- **payment_history** - Payment records
- **attendance_alerts** - Low attendance alerts
- **email_notifications** - Email notification log

### Key Features

- ✅ Row Level Security (RLS) for data protection
- ✅ Automatic alert generation via database triggers
- ✅ Automatic payment status calculation
- ✅ Indexed queries for performance
- ✅ Database views for complex queries

## Default Login

For testing (create actual users after first login):

- **Email:** admin@example.com
- **Password:** (set during Supabase user creation)

## Key Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=              # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # Anonymous public key
SUPABASE_SERVICE_ROLE_KEY=             # Service role key (for admin operations)
NEXT_PUBLIC_APP_URL=                   # Your Vercel app URL
NEXT_PUBLIC_ENABLE_EMAIL_ALERTS=true   # Enable email notifications
NEXT_PUBLIC_ENABLE_BULK_IMPORT=true    # Enable CSV import
```

## API Routes

The application includes API endpoints for:

- **Attendance** - GET/POST/PUT attendance records
- **Students** - CRUD operations for students
- **Classes** - CRUD operations for classes
- **Schools** - CRUD operations for schools
- **Alerts** - Query and manage low attendance alerts
- **Debtors** - Track and manage student accounts

See API documentation in code comments for details.

## Development Workflow

1. Create a branch for your feature
2. Make changes locally or directly in GitHub
3. Push to GitHub
4. Vercel will automatically deploy your changes
5. Test in the live environment

## Performance Considerations

- Real-time updates via Supabase Realtime (optional)
- Database indexes on frequently queried columns
- React Query for client-side caching
- Code splitting for admin routes
- Debounced search inputs

## Security

- ✅ Row Level Security in Supabase
- ✅ HTTP-only cookies for auth tokens
- ✅ CSRF protection (Next.js built-in)
- ✅ Input validation with Zod
- ✅ Server-side authorization checks

## Support & Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)

## Troubleshooting

### Authentication Issues

If you see "Invalid API key" errors:
1. Check your Supabase credentials in Vercel
2. Ensure they're correctly set in Environment Variables
3. Redeploy after updating env vars

### Database Connection Issues

1. Check Supabase project is active
2. Verify service role key has correct permissions
3. Check Row Level Security policies aren't too restrictive

### Deployment Issues

1. Check build logs in Vercel
2. Ensure all environment variables are set
3. Verify package.json has all required dependencies

## Roadmap

- [ ] QR code check-in system
- [ ] SMS notifications to parents
- [ ] Mobile app (React Native)
- [ ] Parent portal
- [ ] Advanced ML-based attendance predictions
- [ ] Calendar integration
- [ ] Offline mode (PWA)

## License

Private - School Attendance System

## Contact

For questions or issues, contact the development team.

---

**Last Updated:** January 2026
**Version:** 1.0.0 (Initial Release)
