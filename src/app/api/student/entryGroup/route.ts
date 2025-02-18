import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  const client = await pool.connect();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get('action');
    const subject = searchParams.get('subject');
    const student = searchParams.get('student');

    if (action === 'get-subjects') {
      const subjectsQuery = `
        SELECT 
          subjectid, 
          subject_name,
          section,
          subject_semester,
          subject_year
        FROM "Subject_Available"
        WHERE deleted IS NULL
        ORDER BY subject_name, section;
      `;
      const result = await client.query(subjectsQuery);
      return NextResponse.json(result.rows);
    }

    if (subject && student) {
      const groupQuery = `
        WITH group_members AS (
          SELECT 
            g.groupid,
            u.userid,
            u.username,
            u.userlastname,
            u.email,
            u.track
          FROM "Group" g
          CROSS JOIN unnest(g."User") AS member_id
          LEFT JOIN "User" u ON u.userid = member_id::text
          WHERE u.deleted IS NULL
        ),
        group_teachers AS (
          SELECT 
            g.groupid,
            u.userid,
            u.username,
            u.userlastname,
            u.email
          FROM "Group" g
          CROSS JOIN unnest(g.teacher) AS teacher_id
          LEFT JOIN "User" u ON u.userid = teacher_id::text
          WHERE u.deleted IS NULL
        )
        SELECT 
          g.groupid, 
          g.groupname, 
          g.projectname, 
          g.subject,
          g.teacher,
          g.note,
          json_agg(DISTINCT jsonb_build_object(
            'userid', t.userid,
            'username', t.username,
            'userlastname', t.userlastname,
            'email', t.email
          )) FILTER (WHERE t.userid IS NOT NULL) as teachers,
          json_agg(DISTINCT jsonb_build_object(
            'userid', m.userid,
            'username', m.username,
            'userlastname', m.userlastname,
            'email', m.email,
            'track', m.track 
          )) FILTER (WHERE m.userid IS NOT NULL) as students
        FROM "Group" g
        LEFT JOIN group_members m ON m.groupid = g.groupid
        LEFT JOIN group_teachers t ON t.groupid = g.groupid
        WHERE g.subject = $1
        AND $2 = ANY(g."User")
        AND g.deleted IS NULL
        GROUP BY 
          g.groupid, 
          g.groupname, 
          g.projectname,
          g.subject,
          g.teacher,
          g.note
        ORDER BY g.groupname;
      `;

      const result = await client.query(groupQuery, [subject, student]);
      return NextResponse.json(result.rows);
    }

    return NextResponse.json([]);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  } finally {
    client.release();
  }
}
