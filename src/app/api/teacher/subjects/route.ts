import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json([], { status: 401 }); 
    }

    if (!session.user?.userType?.includes('teacher') && !session.user?.userType?.includes('admin')) {
      return NextResponse.json([], { status: 403 }); 
    }

    const userId = session.user.id;
    if (!userId) {
      return NextResponse.json([], { status: 400 }); 
    }

    const client = await pool.connect();
    try {
    
      const query = `
        SELECT 
          subjectid as subject_id,
          subject_name
        FROM "Subject_Available"
        WHERE teachers::text LIKE '%' || $1 || '%'
        AND deleted IS NULL
        ORDER BY subject_name
      `;

      const result = await client.query(query, [userId]);
      
   
      return NextResponse.json(result.rows || []);
    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json([]); // Return empty array on error
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('ข้อผิดพลาดฐานข้อมูล:', error);
    return NextResponse.json([]); 
  }
}
