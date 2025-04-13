import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const userResult = await pool.query(
      'SELECT "type", "userid" FROM "User" WHERE "email" = $1',
      [userEmail || '']
    );
    
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const user = userResult.rows[0];

    if (!user || !user.type.includes('teacher')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const teacherId = user.userid;
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const subjectId = url.searchParams.get('subject');

    if (action === 'get-subjects') {
      
      const subjectsResult = await pool.query(
        `SELECT "subjectid", "subject_name", "section", "subject_semester", "subject_year" 
         FROM "Subject_Available" 
         WHERE "deleted" IS NULL
         ORDER BY "subject_year" DESC, "subject_semester" DESC, "subject_name" ASC`
      );
      
      return NextResponse.json(subjectsResult.rows);
    }
    if (action === 'get-teachers') {
      const teachersResult = await pool.query(
      `SELECT "userid", "username", "userlastname", "email" 
       FROM "User" 
       WHERE 'teacher' = ANY("type")
       AND "deleted" IS NULL
       ORDER BY "username" ASC`
      );
      
      return NextResponse.json(teachersResult.rows);
    }

    if (subjectId) {
    
      const hasAccessResult = await pool.query(
        `SELECT 1 FROM "Subject_Available" 
         WHERE "subjectid" = $1`,
        [parseInt(subjectId)]
      );
      
      if (hasAccessResult.rows.length === 0) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      const groupsResult = await pool.query(
        `SELECT "groupid", "groupname", "projectname", "subject", "teacher", "teacherother", "User" as user, "note" 
         FROM "Group" 
         WHERE "subject" = $1`,
        [parseInt(subjectId)]
      );
      const groups = groupsResult.rows;
      
      const studentIds = groups.flatMap(group => 
        Array.isArray(group.user) ? group.user : group.user
      );
      const uniqueStudentIds = [...new Set(studentIds)];
      
      let students = [];
      if (uniqueStudentIds.length > 0) {
        const studentsResult = await pool.query(
          `SELECT "userid", "username", "userlastname", "email", "track" 
           FROM "User" 
           WHERE "userid" = ANY($1)`,
          [uniqueStudentIds]
        );
        students = studentsResult.rows;
      }

      const groupsWithStudentDetails = groups.map(group => {
        const userIds = Array.isArray(group.user) ? group.user : group.user;
        interface Student {
          userid: string;
          username: string;
          userlastname: string;
          email: string;
          track?: string;
        }

        interface GroupStudent extends Student {
          track: string;
        }

        const groupStudents = userIds.map((userId: string) => {
          const student = students.find((student: Student) => student.userid === userId);
          
          if (student && group.groupname.startsWith('BIT')) {
            return {
              ...student,
              track: 'BIT'
            } as GroupStudent;
          }
          return student || null;
        }).filter(Boolean) as (Student | GroupStudent)[];

        return {
          ...group,
          students: groupStudents
        };
      });
      
      return NextResponse.json(groupsWithStudentDetails);
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
