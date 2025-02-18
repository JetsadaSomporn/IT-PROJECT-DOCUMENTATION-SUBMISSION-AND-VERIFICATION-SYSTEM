import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// New separate function for fetching subjects
async function fetchSubjects(request: Request) {
  console.log('GET request received for teacher subjects');
  
  try {
    const session = await getServerSession(authOptions);
    console.log('Server session:', JSON.stringify(session, null, 2));

    if (!session) {
      console.log('No session found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!session.user) {
      console.log('No user in session');
      return NextResponse.json({ error: 'No user found' }, { status: 401 });
    }

    console.log('User from session:', session.user);
    console.log('User type:', session.user.type);
    console.log('User userType:', session.user.userType);
    
  
    const isTeacher = session.user.type?.includes('teacher') || 
                     session.user.userType?.includes('teacher');

    if (!isTeacher) {
      console.error('User is not teacher:', session.user);
      return NextResponse.json({ 
        error: 'Not authorized',
        userType: session.user.type
      }, { status: 403 });
    }

   
 
    const teacherId = session.user.id;
    console.log('Searching for teacher ID:', teacherId);

   
    let query = `
      SELECT subjectid, subject_name, teachers 
      FROM "Subject_Available" 
      WHERE deleted IS NULL
    `;
    
    const client = await pool.connect();
    try {
      // First query to inspect data
      const inspectResult = await client.query(query);
      console.log('All subjects and their teachers:');
      inspectResult.rows.forEach(row => {
        console.log(`Subject ${row.subjectid}:`, {
          name: row.subject_name,
          teachers: row.teachers
        });
      });

     
      query = `
        SELECT * FROM "Subject_Available" 
        WHERE deleted IS NULL 
        AND teachers::jsonb @> $1::jsonb
      `;
      
      // Wrap teacherId within a JSON array string
      const params = [`["${teacherId}"]`];
      console.log('Executing filtered query:', { query, params });
      
      const res = await client.query(query, params);
      return NextResponse.json(res.rows);
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ 
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 'fetchsubject') {
    return fetchSubjects(request);
  }

  // Placeholder for other actions
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
