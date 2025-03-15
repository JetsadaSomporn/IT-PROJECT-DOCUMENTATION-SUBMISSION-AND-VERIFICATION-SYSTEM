import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

const ensureUploadDirectoryExists = async () => {
  try {
    const baseUploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (!await exists(baseUploadsDir)) {
      await mkdir(baseUploadsDir, { recursive: true });
    }
    
    const subdirs = ['documents', 'signatures', 'temp'];
    for (const subdir of subdirs) {
      const dirPath = path.join(baseUploadsDir, subdir);
      if (!await exists(dirPath)) {
        await mkdir(dirPath, { recursive: true });
      }
    }
  } catch (error) {
    // Silent error
  }
};

ensureUploadDirectoryExists();

export async function POST(request: Request) {
  try {
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'อัพโหลดไม่สำเร็จ' }, { status: 500 });
  }
}
