import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ subjectid: string }> }
) {
  const client = await pool.connect();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { subjectid } = await context.params;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'assignments') {
      const assignmentsQuery = `
        SELECT 
          a.*,
          COALESCE(
            (
              SELECT json_build_object(
                'status', CASE 
                  WHEN ase.deleted IS NULL THEN 'submitted'
                  ELSE 'pending'
                END,
                'submitted_at', ase.created,
                'document_status', json_build_object('files', ase.pdf)
              )
              FROM "Assignment_Sent" ase
              WHERE ase.assignment_id = a.assignmentid
              AND ase.deleted IS NULL
              LIMIT 1
            ),
            json_build_object(
              'status', 'pending',
              'submitted_at', NULL,
              'document_status', NULL
            )
          ) as validate
        FROM "Assignment" a
        WHERE a.subject_available_id = $1
        AND a.deleted IS NULL
        ORDER BY a.created DESC
      `;
      const result = await client.query(assignmentsQuery, [subjectid]);
      return NextResponse.json(result.rows);
    }

    // Updated query to handle JSONB teachers array
    const subjectQuery = `
      SELECT 
        sa.*,
        (
          SELECT json_agg(
            json_build_object(
              'userid', u.userid,
              'username', u.username,
              'userlastname', u.userlastname,
              'email', u.email
            )
          )
          FROM "User" u
          WHERE u.userid::text IN (
            SELECT jsonb_array_elements_text(sa.teachers)
          )
          AND u.deleted IS NULL
        ) as teachers
      FROM "Subject_Available" sa
      WHERE sa.subjectid = $1
      AND sa.deleted IS NULL
    `;

    const subjectResult = await client.query(subjectQuery, [subjectid]);
    if (subjectResult.rowCount === 0) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    return NextResponse.json(subjectResult.rows[0]);

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ subjectid: string }> }
) {
  const client = await pool.connect();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { subjectid } = await context.params;
    const { assignmentId, files, requirements } = await request.json();
    
    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    await client.query('BEGIN');

    
    const sentQuery = `
      INSERT INTO "Assignment_Sent" (
        assignment_id,
        pdf
      )
      VALUES ($1, $2)
      ON CONFLICT (assignment_id) 
      DO UPDATE SET
        pdf = $2,
        updated = CURRENT_TIMESTAMP;
    `;

    await client.query(sentQuery, [
      assignmentId,
      { files, requirements }
    ]);

    await client.query('COMMIT');
    return NextResponse.json({ success: true });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
