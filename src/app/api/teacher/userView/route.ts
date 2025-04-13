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
      return NextResponse.json({ error: 'ไม่ได้รับการยืนยันตัวตน' }, { status: 401 });
    }

    if (!session.user?.userType?.includes('teacher') && !session.user?.userType?.includes('admin')) {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const userType = searchParams.get('userType');
    const subject = searchParams.get('subject');

    const client = await pool.connect();
    try {
     
      let query = `
        SELECT DISTINCT
          u.userid,
          u.username,
          u.userlastname,
          u.email,
          u.track,
          u.type as usertype,
          COALESCE(
            (
              SELECT array_agg(s.subject_name)
              FROM "Subject_Available" s
              WHERE s.students::text LIKE '%' || u.userid || '%'
              AND s.deleted IS NULL
            ),
            ARRAY[]::text[]
          ) as enrolled_subjects
        FROM "User" u
        WHERE u.deleted IS NULL
      `;

      let values: any[] = [];
      let paramCount = 1;

      query += ` AND NOT (u.type @> ARRAY['admin']::text[])`;

      if (search) {
        query += ` AND (
          LOWER(u.username) LIKE LOWER($${paramCount}) OR
          LOWER(u.userlastname) LIKE LOWER($${paramCount}) OR
          LOWER(u.email) LIKE LOWER($${paramCount}) OR
          LOWER(u.userid) LIKE LOWER($${paramCount})
        )`;
        values.push(`%${search}%`);
        paramCount++;
      }

      if (userType && userType !== 'all') {
        query += ` AND u.type @> ARRAY[$${paramCount}]::text[]`;
        values.push(userType);
        paramCount++;
      }

      if (subject) {
    
        query += ` AND EXISTS (
          SELECT 1
          FROM "Subject_Available" s
          WHERE s.subject_name = $${paramCount}
          AND s.students::text LIKE '%' || u.userid || '%'
          AND s.deleted IS NULL
        )`;
        values.push(subject);
        paramCount++;
      }

      query += ' ORDER BY u.username';

      const result = await client.query(query, values);

     
      const users = result.rows.map(user => {
      
        const subjectsList = user.enrolled_subjects || [];
        
        return {
          id: user.userid,
          name: user.username,
          lastName: user.userlastname, 
          email: user.email,
          userType: Array.isArray(user.usertype) ? user.usertype : [user.usertype],
          track: user.track,
          Subject_Available: subjectsList
        };
      });

      return NextResponse.json(users);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('ข้อผิดพลาดฐานข้อมูล:', error);
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้ได้' }, { status: 500 });
  }
}
