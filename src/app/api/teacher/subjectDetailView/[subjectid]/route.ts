import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request, { params }: { params: { subjectid: string } }) {
  const client = await pool.connect();
  try {
    // Verify session and teacher authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const teacherId = session.user.id;

    // Await params and parse subject ID
    const { subjectid } = await params;
    const parsedSubjectId = Number(subjectid);
    if (isNaN(parsedSubjectId)) {
      return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

   
    if (action === 'assignments') {
      console.log('Fetching assignments for subject:', parsedSubjectId);
      try {
        // Using the same query as subjectDetailManagement route
        const assignmentsQuery = `
          SELECT * FROM "Assignment" 
          WHERE subject_available_id = $1 
          AND deleted IS NULL
          ORDER BY created DESC
        `;
        
        const result = await client.query(assignmentsQuery, [parsedSubjectId]);
        console.log('Assignments query result:', result.rows);

        if (result.rowCount === 0) {
          console.log('No assignments found');
          return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json(result.rows, { 
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('Error fetching assignments:', error);
        return NextResponse.json([], { status: 200 });
      }
    }

    // Fetch subject details 
    const subjectResult = await client.query(
      `SELECT * FROM "Subject_Available" 
       WHERE subjectid = $1 AND deleted IS NULL`,
      [parsedSubjectId]
    );

  
    if (subjectResult.rowCount === 0) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    
    const subject = subjectResult.rows[0];

    // Fetch associated data (teachers and students)
    if (subject.teachers && subject.teachers.length > 0) {
      const teacherResult = await client.query(
        `SELECT userid, username, userlastname, email 
         FROM "User" 
         WHERE userid = ANY($1::text[]) 
         AND deleted IS NULL`,
        [subject.teachers]
      );
      subject.teachers = teacherResult.rows;
    }

    if (subject.students && subject.students.length > 0) {
      const studentResult = await client.query(
        `SELECT userid as student_id, username, userlastname, email 
         FROM "User" 
         WHERE userid = ANY($1::text[]) 
         AND deleted IS NULL`,
        [subject.students]
      );
      subject.students = studentResult.rows;
    }

    return NextResponse.json(subject, { status: 200 });

  } catch (error) {
    console.error('Error in GET handler:', error);
    const errorUrl = new URL(request.url);
    if (errorUrl.searchParams.get('action') === 'assignments') {
      return NextResponse.json([], { status: 200 });
    }
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
