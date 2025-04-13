import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT DISTINCT ON (g.groupid, a.assignmentid) 
          ass.assignment_sent_id, 
          ass.assignment_id, 
          ass.group_id, 
          ass.pdf,
          ass.created,
          g.groupname,
          g.subject as subject_id,
          a.assignment_name,
          s.subject_name
        FROM "Assignment_Sent" ass
        JOIN "Group" g ON ass.group_id = g.groupid
        JOIN "Assignment" a ON ass.assignment_id = a.assignmentid
        JOIN "Subject_Available" s ON g.subject = s.subjectid
        WHERE 
          ass.deleted IS NULL AND
          (ass.pdf->>'validations')::jsonb IS NOT NULL AND
          ((ass.pdf->'validations'->>'file_corrupted')::boolean = true OR
           (ass.pdf->'validations'->>'signature_missing')::boolean = true)
        ORDER BY g.groupid, a.assignmentid, ass.created DESC
      `;
      
      const result = await client.query(query);
      
      const notifications = result.rows.map(row => {
        const pdf = typeof row.pdf === 'string' ? JSON.parse(row.pdf) : row.pdf;
        const validations = pdf.validations || {};
        
        let issue = '';
        if (validations.file_corrupted) {
          issue = 'ไฟล์เสียหาย';
        } else if (validations.signature_missing) {
          issue = 'ไม่มีลายเซ็น';
        }
        
        return {
          id: row.assignment_sent_id,
          assignmentId: row.assignment_id,
          groupId: row.group_id,
          subjectId: row.subject_id,
          groupName: row.groupname,
          subjectName: row.subject_name,
          assignmentName: row.assignment_name,
          fileName: pdf.file_name,
          filePath: pdf.file_path,
          fileSize: pdf.file_size,
          uploadedBy: pdf.uploaded_by,
          created: row.created,
          issue,
          isRead: false
        };
      });
      
      return NextResponse.json(notifications);
      
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลการแจ้งเตือนได้' }, { status: 500 });
  }
}