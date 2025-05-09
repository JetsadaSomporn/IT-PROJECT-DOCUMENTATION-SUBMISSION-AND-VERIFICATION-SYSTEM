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
      return NextResponse.json([], { status: 401 }); // Return empty array instead of error object
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const track = searchParams.get('track');
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

      const values: any[] = [];
      let paramCount = 1;

      if (search) {
        query += ` AND LOWER(u.username) LIKE LOWER($${paramCount})`;
        values.push(`%${search}%`);
        paramCount++;
      }

      if (track) {
        query += ` AND u.track = $${paramCount}`;
        values.push(track);
        paramCount++;
      }

      if (subject) {
        
        const getSubjectQuery = `SELECT subject_name FROM "Subject_Available" WHERE subjectid = $1 AND deleted IS NULL`;
        const subjectResult = await client.query(getSubjectQuery, [subject]);
        if (subjectResult.rows.length > 0) {
          const subjectName = subjectResult.rows[0].subject_name;
          query += ` AND EXISTS (
            SELECT 1
            FROM "Subject_Available" s
            WHERE s.subject_name = $${paramCount}
            AND s.students::text LIKE '%' || u.userid || '%'
            AND s.deleted IS NULL
          )`;
          values.push(subjectName);
          paramCount++;
        }
      }

      query += ' ORDER BY u.username';

      const result = await client.query(query, values);

      
      if (!result || !result.rows) {
        console.error('Invalid query result:', result);
        return NextResponse.json([]); 
      }

      const users = result.rows.map(user => {
        
        const enrolledSubjects = Array.isArray(user.enrolled_subjects) ? user.enrolled_subjects : [];
        
        return {
          id: user.userid || '',
          name: user.username || '',
          lastName: user.userlastname || '', 
          email: user.email || '',
          userType: Array.isArray(user.usertype) ? user.usertype : [user.usertype || ''],
          track: user.track || '',
          Subject_Available: enrolledSubjects
        };
      });

      return NextResponse.json(users);

    } catch (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json([]); 
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('ข้อผิดพลาดฐานข้อมูล:', error);
    return NextResponse.json([]); 
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'ไม่ได้รับการยืนยันตัวตน' }, { status: 401 });
    }

    const { userId, newType } = await request.json();
    // Validate newType if necessary
    const validTypes = ['student', 'teacher', 'admin'];
    if (!validTypes.includes(newType)) {
        return NextResponse.json({ error: 'Invalid user type provided' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
    
      const updateQuery = `UPDATE "User" SET type = $1 WHERE userid = $2`;
      await client.query(updateQuery, [[newType], userId]); // Ensure type is stored as an array e.g., ['admin']
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('ข้อผิดพลาดการอัปเดต:', error);
    return NextResponse.json({ error: 'ไม่สามารถอัปเดตประเภทผู้ใช้ได้' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'ไม่ได้รับการยืนยันตัวตน' }, { status: 401 });
    }

    const { student_id, username, userlastname, email } = await request.json();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const checkQuery = `
        SELECT userid, deleted 
        FROM "User" 
        WHERE userid = $1
      `;
      const checkResult = await client.query(checkQuery, [student_id]);

      if (checkResult.rowCount && checkResult.rowCount > 0) {
        const updateQuery = `
          UPDATE "User"
          SET username = $2,
              userlastname = $3,
              email = $4,
              deleted = NULL,
              updated = CURRENT_TIMESTAMP
          WHERE userid = $1
          RETURNING *
        `;
        await client.query(updateQuery, [student_id, username, userlastname, email]);
      } else {
        const insertQuery = `
          INSERT INTO "User" (userid, username, userlastname, email, type, created, updated)
          VALUES ($1, $2, $3, $4, ARRAY['student'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        await client.query(insertQuery, [student_id, username, userlastname, email]);
      }

      await client.query('COMMIT');
      return NextResponse.json({ message: 'เพิ่มนักศึกษาเรียบร้อยแล้ว' }, { status: 200 });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('ข้อผิดพลาดในการเพิ่มนักศึกษา:', err);
      return NextResponse.json({ error: 'ไม่สามารถเพิ่มนักศึกษาได้' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('ข้อผิดพลาดใน POST handler:', error);
    return NextResponse.json({ error: 'ข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'ไม่ได้รับการยืนยันตัวตน' }, { status: 401 });
    }

    const { userId } = await request.json();
    const client = await pool.connect();

    try {
      const deleteQuery = `
        UPDATE "User"
        SET deleted = CURRENT_TIMESTAMP
        WHERE userid = $1
      `;
      await client.query(deleteQuery, [userId]);
      
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('ข้อผิดพลาดการลบ:', error);
    return NextResponse.json({ error: 'ไม่สามารถลบผู้ใช้ได้' }, { status: 500 });
  }
}


