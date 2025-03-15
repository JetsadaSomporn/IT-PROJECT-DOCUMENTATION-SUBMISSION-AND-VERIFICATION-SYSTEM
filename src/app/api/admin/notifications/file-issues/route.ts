import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      // Query for assignments with file issues (corrupted or missing signatures)
      const query = `
        SELECT 
          as_sent.assignment_sent_id as id, 
          as_sent.group_id, 
          g.groupname as group_name,
          a.assignment_name,
          as_sent.created,
          as_sent.pdf->>'file_name' as file_name,
          CASE 
            WHEN as_sent.pdf->'validations'->>'file_corrupted' = 'true' THEN 'corrupted'
            WHEN as_sent.pdf->'validations'->>'signature_missing' = 'true' THEN 'signature_missing'
            ELSE NULL
          END as issue_type
        FROM 
          "Assignment_Sent" as_sent
        JOIN 
          "Assignment" a ON as_sent.assignment_id = a.assignmentid
        JOIN
          "Group" g ON as_sent.group_id = g.groupid
        WHERE 
          (as_sent.pdf->'validations'->>'file_corrupted' = 'true' OR 
           as_sent.pdf->'validations'->>'signature_missing' = 'true')
          AND as_sent.deleted IS NULL
        ORDER BY 
          as_sent.created DESC
        LIMIT 20
      `;
      
      const result = await client.query(query);
      
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching file issues:', error);
    return NextResponse.json({ error: 'Failed to fetch file issues' }, { status: 500 });
  }
}
