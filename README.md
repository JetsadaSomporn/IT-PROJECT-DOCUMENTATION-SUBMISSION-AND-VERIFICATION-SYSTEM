# IT-Document-Verification-System

![Next.js](https://img.shields.io/badge/Next.js-14.0.0-black?style=flat&logo=next.js) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat&logo=postgresql) ![License](https://img.shields.io/badge/license-MIT-green)

**IT-Document-Verification-System** เป็นระบบจัดการและตรวจสอบเอกสารโครงงานสำหรับนักศึกษาและอาจารย์ พัฒนาด้วย [Next.js](https://nextjs.org) เป็น frontend และใช้ [PostgreSQL](https://www.postgresql.org) เป็นฐานข้อมูล รองรับการยืนยันตัวตนผ่าน [NextAuth.js](https://next-auth.js.org) และมีฟีเจอร์การอัปโหลดและตรวจสอบเอกสารอย่างครบถ้วน

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Learn More](#learn-more)

---

## Features
- **Authentication**: ระบบล็อกอินด้วย NextAuth.js รองรับการยืนยันตัวตนที่ปลอดภัย
- **User Management**: จัดการข้อมูลผู้ใช้ (นักศึกษาและอาจารย์) ผ่านฐานข้อมูล
- **Document Upload & Verification**: อัปโหลดเอกสาร PDF และตรวจสอบความถูกต้องอัตโนมัติ
- **Responsive UI/UX**: ออกแบบด้วย TailwindCSS และเพิ่ม动画ด้วย Framer Motion
- **Database Integration**: ใช้ PostgreSQL ในการเก็บข้อมูลอย่างมีโครงสร้าง

---

## Tech Stack
- **Frontend**: Next.js 14, React, TailwindCSS, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **Dependencies**: react-datepicker, react-modal, react-icons, และอื่น ๆ (ดูรายละเอียดใน [Dependencies](#dependencies))

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) (v18 หรือสูงกว่า)
- [PostgreSQL](https://www.postgresql.org/download/) (ติดตั้งและรัน locally หรือใช้ service เช่น Supabase)
- [Git](https://git-scm.com) (สำหรับ clone repository)

### Installation
1. **Clone the Repository**
   ```bash
   git clone https://github.com/JetsadaSomporn/IT-Document-Verification-System.git
   ```

2. **Navigate to Project Directory**
   ```bash
   cd IT-Document-Verification-System
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Set Up Environment Variables**
   - คัดลอกไฟล์ `.env.example` ไปเป็น `.env`:
     ```bash
     cp .env.example .env
     ```
   - แก้ไขไฟล์ `.env` ตามข้อมูลของระบบคุณ (ดูรายละเอียดใน [Environment Variables](#environment-variables))

5. **Run the Development Server**
   ```bash
   npm run dev
   ```
   เปิด [http://localhost:3000](http://localhost:3000) ในเบราว์เซอร์เพื่อดูผลลัพธ์

### Environment Variables
สร้างไฟล์ `.env` ใน root directory และกำหนดค่าต่อไปนี้:
```
DATABASE_URL=postgres://username:password@localhost:5432/database_name
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```
- `DATABASE_URL`: Connection string สำหรับ PostgreSQL
- `NEXTAUTH_SECRET`: คีย์ลับสำหรับ NextAuth.js (สร้างได้ด้วย `openssl rand -base64 32`)
- `NEXTAUTH_URL`: URL ฐานของแอปพลิเคชัน

---

## Usage
1. เปิด [http://localhost:3000](http://localhost:3000) ในเบราว์เซอร์
2. ลงทะเบียนหรือล็อกอินด้วยบัญชีนักศึกษาหรืออาจารย์
3. อัปโหลดเอกสารโครงงานในรูปแบบ PDF
4. ตรวจสอบสถานะเอกสารผ่านหน้า Dashboard

การแก้ไขโค้ดสามารถทำได้ที่ `app/page.tsx` หรือไฟล์อื่น ๆ ในโฟลเดอร์ `app` ซึ่งจะอัปเดตอัตโนมัติเมื่อบันทึก

---

## Deployment
วิธีที่ง่ายที่สุดในการ deploy คือใช้ [Vercel Platform](https://vercel.com/new):
1. สร้างบัญชี Vercel และเชื่อมต่อกับ GitHub repository
2. ตั้งค่า environment variables ใน Vercel dashboard
3. Deploy โปรเจกต์ด้วยคำสั่ง:
   ```bash
   vercel
   ```
ดูรายละเอียดเพิ่มเติมได้ที่ [Next.js Deployment Documentation](https://nextjs.org/docs/app/building-your-application/deploying)

---

## Contributing
เรายินดีรับการมีส่วนร่วมจากชุมชน! หากต้องการมีส่วนร่วม:
1. Fork โปรเจกต์นี้
2. สร้าง branch ใหม่ (`git checkout -b feature/your-feature`)
3. Commit การเปลี่ยนแปลง (`git commit -m "Add your feature"`)
4. Push ไปยัง branch ของคุณ (`git push origin feature/your-feature`)
5. สร้าง Pull Request บน GitHub

---

## License
โปรเจกต์นี้อยู่ภายใต้ [MIT License](LICENSE)

---

## Learn More
- [Next.js Documentation](https://nextjs.org/docs) - คู่มือและ API ของ Next.js
- [NextAuth.js Documentation](https://next-auth.js.org/getting-started/introduction) - การตั้งค่าระบบล็อกอิน
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) - การจัดการฐานข้อมูล
- [TailwindCSS Documentation](https://tailwindcss.com/docs) - การออกแบบ UI

ตรวจสอบ [Next.js GitHub Repository](https://github.com/vercel/next.js) สำหรับข้อมูลเพิ่มเติมและการมีส่วนร่วม

---

## Dependencies
รายการ dependencies ที่ใช้ในโปรเจกต์:
- `next-auth`: การยืนยันตัวตน
- `next`: Framework หลัก
- `bcrypt`: การเข้ารหัสข้อมูล
- `pg`: การเชื่อมต่อ PostgreSQL
- `react-router-dom`: การจัดการเส้นทาง
- `@fortawesome/react-fontawesome`: ไอคอน
- `xlsx`: การจัดการไฟล์ Excel
- `react-modal`: โมดัล UI
- `framer-motion`: การทำอนิเมชัน
- `react-datepicker`: การเลือกวันที่และเวลา
- `@headlessui/react`: คอมโพเนนต์ UI
- `react-icons`: ไอคอนเพิ่มเติม
- `tailwindcss`, `postcss`, `autoprefixer`: การจัดการสไตล์

ติดตั้งทั้งหมดด้วย:
```bash
npm install
```

---

### **หมายเหตุ**
- โปรเจกต์นี้ใช้ [Geist](https://vercel.com/font) เป็นฟอนต์เริ่มต้นผ่าน `@next/font`
- หากมีคำถามหรือต้องการความช่วยเหลือเพิ่มเติม ติดต่อได้ที่ [JetsadaSomporn](https://github.com/JetsadaSomporn)

หวังว่า README นี้จะช่วยให้โปรเจกต์ของคุณดูเป็นมืออาชีพและพร้อมใช้งาน! 😊 หากต้องการปรับแต่งเพิ่มเติม โปรดแจ้งมาเลยครับ
