import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth/[...nextauth]/route';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const filePath = url.searchParams.get('path');
  
  if (!filePath) {
    return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
  }

  try {
    let fileExists = false;
    let fullPath = '';
    
    const option1 = path.join(process.cwd(), 'public', filePath);
    if (fs.existsSync(option1)) {
      fullPath = option1;
      fileExists = true;
    }
    
    if (!fileExists && !filePath.includes('/')) {
      const option2 = path.join(process.cwd(), 'public', 'uploads', filePath);
      if (fs.existsSync(option2)) {
        fullPath = option2;
        fileExists = true;
      }
    }
    
    if (!fileExists) {
      const cleanPath = filePath.replace(/^[\/\\]*(public[\/\\]*)?/, '');
      const option3 = path.join(process.cwd(), 'public', cleanPath);
      if (fs.existsSync(option3)) {
        fullPath = option3;
        fileExists = true;
      }
    }
    
    if (!fileExists) {
      return NextResponse.json({ error: 'ไม่พบไฟล์' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const fileName = path.basename(fullPath);
    
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    headers.set('Content-Type', 'application/octet-stream');
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'ดาวน์โหลดไฟล์ไม่สำเร็จ'
    }, { status: 500 });
  }
}
