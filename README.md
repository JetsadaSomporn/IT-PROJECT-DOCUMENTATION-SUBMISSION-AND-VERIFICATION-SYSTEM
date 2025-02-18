This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# IT-Document-Verification-System

โปรเจคนี้เป็นระบบส่งและตรวจสอบเอกสารโครงงานของนิสิต โดยใช้ Next.js เป็น frontend และ PostgreSQL เป็นฐานข้อมูล รองรับการยืนยันตัวตนผ่าน NextAuth.js และมีระบบตรวจสอบเอกสารที่อัปโหลด

# คุณสมบัติหลัก (Features)
- ระบบล็อกอิน ด้วย NextAuth.js
- จัดการผู้ใช้ (นักศึกษา / อาจารย์)
- อัปโหลดและตรวจสอบเอกสาร
- เก็บข้อมูลใน PostgreSQL
- รองรับ UI/UX ด้วย TailwindCSS + Framer Motion

# 1. Clone repo
git clone [https://github.com/username/project-name.git  ](https://github.com/JetsadaSomporn/IT-Document-Verification-System)
# 2. เข้าไปที่โฟลเดอร์โปรเจค
cd IT-Document-Verification-System
# 3. ติดตั้ง dependencies  
npm install  
# 4. ตั้งค่า environment variables  
cp .env.example .env  
# แก้ไข .env   
# 5. รันโปรเจค  
npm run dev  

# การตั้งค่า Environment Variables
ในไฟล์ .env
DATABASE_URL=postgres://username:password@localhost:5432/database_name  
NEXTAUTH_SECRET=your-secret-key  
NEXTAUTH_URL=http://localhost:3000  

# วิธีใช้งาน (Usage)
 1. เปิด http://localhost:3000/ ในเบราว์เซอร์
 2. ลงทะเบียน / ล็อกอิน
 3. อัปโหลดเอกสาร
 4. ตรวจสอบเอกสารผ่านระบบ
    
# Dependencies ที่ใช้
npm install next-auth  
npm install next@latest  
npm install --save-dev @types/next-auth  
npm install bcrypt  
npm install pg @types/pg  
npm install --save-dev @types/bcrypt  
npm install react-router-dom  
npm install --save-dev @types/react-router-dom  
npm install @fortawesome/free-solid-svg-icons  
npm install --save-dev @types/react-fontawesome  
npm install xlsx  
npm install autoprefixer --save-dev  
npm install @next/font  
npm install react-modal @types/react-modal  
npm install react  
npm install @fortawesome/react-fontawesome @fortawesome/free-solid-svg-icons @fortawesome/fontawesome-svg-core  
npm install -D tailwindcss postcss autoprefixer  
npm install framer-motion  
npm install date-fns  
npm install --save-dev @types/react-datepicker  
npm install @headlessui/react  
npm install react-icons  

