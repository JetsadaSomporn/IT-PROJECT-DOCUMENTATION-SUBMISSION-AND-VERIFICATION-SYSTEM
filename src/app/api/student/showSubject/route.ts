import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  const client = await pool.connect();
  try {
    // First, inspect what's in the Subject_Available table
    const inspectQuery = `
      SELECT subjectid, subject_name, students, created, deleted 
      FROM "Subject_Available" 
      WHERE deleted IS NULL
      LIMIT 5
    `;
    
    const inspectResult = await client.query(inspectQuery);
    console.log('Sample data from Subject_Available:', JSON.stringify(inspectResult.rows, null, 2));

    const session = await getServerSession(authOptions);
    console.log('Current user session:', JSON.stringify(session?.user, null, 2));

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const studentId = session.user.id;
    console.log('Looking for student ID:', studentId);

    // Query with array check
    const query = `
      SELECT * 
      FROM "Subject_Available" 
      WHERE students::text[] @> ARRAY[$1]
      AND deleted IS NULL
    `;

    const result = await client.query(query, [studentId]);
    console.log('Query executed:', {
      sql: query,
      params: [studentId],
      rowCount: result.rowCount,
      firstRow: result.rows[0]
    });

    return NextResponse.json(result.rows);

  } catch (error) {
    console.error('Error with full details:', error);
    return NextResponse.json({ error: 'Failed to fetch subjects' }, { status: 500 });
  } finally {
    client.release();
  }
}
