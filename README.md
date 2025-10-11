# Mr. Deepseeks - AI Web App Builder

Build complete web applications instantly with AI-powered streaming code generation.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create `.env.local`:
```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

Get your key from: https://platform.deepseek.com

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 4. Set Up Supabase (Optional)
1. Create a project at [https://supabase.com](https://supabase.com)
2. Update `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Run the database schema:
```sql
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  html text,
  css text,
  js text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table projects enable row level security;

-- Users can only see their own projects
create policy "Users can view own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can insert own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete own projects"
  on projects for delete
  using (auth.uid() = user_id);
```

4. Enable Magic Link authentication in Supabase dashboard.

## ✅ Features

### **Real Streaming**
- See code appear character by character
- Auto-switches tabs as it writes each file
- Live preview updates as code generates

### **Guest Mode**
- Save/load projects to localStorage
- No account required to start building

### **Cloud Save (Optional)**
- Magic Link authentication
- Save projects to Supabase when logged in
- Automatic migration from localStorage

### **No BS**
- ❌ No "plan first" architecture
- ❌ No ad interference
- ❌ No timeout issues (5min max)
- ✅ Just works

## 🎯 How It Works

1. **User types prompt** → "Build me a calculator"
2. **DeepSeek streams** → Generates HTML, CSS, JS
3. **UI auto-switches tabs** → Shows which file is being written
4. **Preview updates** → Live iframe with generated code
5. **User sees it build** → Real-time streaming text

## 🔧 Tech Stack

- **Next.js 14** - App Router with TypeScript
- **DeepSeek API** - Streaming code generation
- **Supabase** - Authentication & database
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## 📊 Cost Estimate

DeepSeek pricing: **$1.68 per 1M tokens**

Typical app generation:
- Input: ~500 tokens (prompt + system)
- Output: ~2000 tokens (HTML + CSS + JS)
- **Cost per app: $0.0042** (less than half a penny!)

## 🚀 Deploy

Deploy to Vercel:
```bash
npm run build
vercel --prod
```

Add environment variables in Vercel dashboard:
- `DEEPSEEK_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

**Ready to ship!** 🚀