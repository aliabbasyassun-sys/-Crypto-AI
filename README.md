# Crypto AI Analyst - 10 Agents + Brain + MTF + Predictor

منصة تحليل عملات رقمية ببيانات حية من OKX، مع 10 وكلاء ذكاء اصطناعي وعقل مدبر،
تحليل متعدد الأطر (1H + 4H + 1D)، إدارة مخاطر (100$ / 5% لكل صفقة)، وتوقع 8 شموع 4H قادمة مع رسمها على الشارت.

## التشغيل المحلي

### Backend
cd worker
npm install
npm run dev
# يعمل على http://localhost:8787

### Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev
# يعمل على http://localhost:3000

## النشر

### Backend (Cloudflare)
cd worker
npx wrangler login
npx wrangler deploy

### Frontend (Vercel)
- ارفع على GitHub
- Vercel → New Project → Root Directory = frontend
- أضف NEXT_PUBLIC_API_URL = رابط الـ Worker
- Deploy

ثم عدّل worker/wrangler.toml → FRONTEND_ORIGIN = رابط Vercel، وأعد npx wrangler deploy.

## تحذير
هذا نظام تعليمي/تحليلي. ليس نصيحة مالية. التوقعات رياضية وليست ضمانًا.
