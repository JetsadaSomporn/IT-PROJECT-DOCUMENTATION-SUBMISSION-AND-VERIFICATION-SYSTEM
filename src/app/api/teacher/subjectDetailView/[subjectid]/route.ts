import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

// Create database connection pool
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

    // Parse subject ID from URL parameters
    const { subjectid } = params;
    const parsedSubjectId = Number(subjectid);
    if (isNaN(parsedSubjectId)) {
      return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 });
    }

    // Get requested action from URL query parameters
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // Handle specific actions based on query parameters
    if (action === 'all-assignments') {
      // Fetch all assignments for the subject
      const assignmentsQuery = `
        SELECT * FROM "Assignment" 
        WHERE subject_available_id = $1 
        AND deleted IS NULL
        ORDER BY created DESC
      `;
      
      const result = await client.query(assignmentsQuery, [parsedSubjectId]);
      
      // Return assignments array (empty if none found)
      return NextResponse.json(result.rows || [], { status: 200 });
    }
    
    else if (action === 'dashboard-data') {
      // Get assignment ID from query parameters
      const assignmentId = url.searchParams.get('assignmentId');
      if (!assignmentId) {
        return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
      }

      // Fetch assignment details
      const assignmentQuery = `
        SELECT * FROM "Assignment" 
        WHERE assignmentid = $1 AND subject_available_id = $2 AND deleted IS NULL
      `;
      const assignmentResult = await client.query(assignmentQuery, [assignmentId, parsedSubjectId]);
      
      if (assignmentResult.rowCount === 0) {
        return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
      }
      
      const assignment = assignmentResult.rows[0];

      // Fetch submissions data for this assignment
      const submissionsQuery = `
        SELECT 
          ass.*, 
          u.username, 
          u.userlastname, 
          u.email,
          g.groupname as group_name,
          (ass.pdf->>'file_name') as file_name,
          (ass.pdf->>'file_path') as file_path,
          (ass.pdf->>'file_size') as file_size,
          (ass.pdf->'validations') as file_validations
        FROM 
          "Assignment_Sent" ass
        LEFT JOIN 
          "User" u ON u.userid = (ass.pdf->>'uploaded_by')
        LEFT JOIN 
          "Group" g ON ass.group_id = g.groupid
        WHERE 
          ass.assignment_id = $1 AND ass.deleted IS NULL
        ORDER BY 
          ass.created DESC
      `;
      
      const submissionsResult = await client.query(submissionsQuery, [assignmentId]);
      
      // Calculate submission statistics
      const submittedGroups = new Set();
      let fileCorruptedCount = 0;
      let fileMissingSignatureCount = 0;
      
      submissionsResult.rows.forEach(submission => {
        if (submission.group_id) {
          submittedGroups.add(submission.group_id);
        }
        
        // Count file quality issues
        if (submission.file_validations) {
          try {
            const validations = typeof submission.file_validations === 'string'
              ? JSON.parse(submission.file_validations)
              : submission.file_validations;
              
            if (validations) {
              if (validations.file_corrupted) {
                fileCorruptedCount++;
              }
              if (validations.signature_missing) {
                fileMissingSignatureCount++;
              }
            }
          } catch (e) {
            console.error('Error parsing file validations:', e);
          }
        }
      });

      // Get total groups for this subject
      const groupsQuery = `
        SELECT COUNT(*) as total FROM "Group" WHERE subject = $1 AND deleted IS NULL
      `;
      const groupsResult = await client.query(groupsQuery, [parsedSubjectId]);
      const totalGroups = parseInt(groupsResult.rows[0]?.total || '0');
      
      // Return dashboard data
      return NextResponse.json({
        assignment,
        submissions: submissionsResult.rows,
        stats: {
          submittedGroups: submittedGroups.size,
          notSubmittedGroups: Math.max(0, totalGroups - submittedGroups.size),
          totalGroups,
          timeliness: {
            onTime: submissionsResult.rows.filter(s => new Date(s.created) <= new Date(assignment.assignment_due_date)).length,
            late: submissionsResult.rows.filter(s => new Date(s.created) > new Date(assignment.assignment_due_date)).length
          },
          // Add file quality metrics
          fileQuality: {
            corrupted: fileCorruptedCount,
            missingSignature: fileMissingSignatureCount,
            totalIssues: fileCorruptedCount + fileMissingSignatureCount
          },
          // Add timeline data
          timeline: {
            dates: submissionsResult.rows.map(s => new Date(s.created).toLocaleDateString()),
            onTime: submissionsResult.rows.map(() => 1)  // Simple count for each submission
          }
        }
      }, { status: 200 });
    }
    
    else if (action === 'submission-stats') {
      // Get assignment ID from query parameters
      const assignmentId = url.searchParams.get('assignmentId');
      if (!assignmentId) {
        return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
      }

      // Fetch submitted groups
      const submittedQuery = `
        SELECT DISTINCT group_id 
        FROM "Assignment_Sent" 
        WHERE assignment_id = $1 AND deleted IS NULL
      `;
      const submittedResult = await client.query(submittedQuery, [assignmentId]);
      
      // Get total groups count
      const totalQuery = `
        SELECT COUNT(*) as count 
        FROM "Group" 
        WHERE subject_available_id = $1 AND deleted IS NULL
      `;
      const totalResult = await client.query(totalQuery, [parsedSubjectId]);
      
      const totalGroups = parseInt(totalResult.rows[0]?.count || '0');
      const submittedGroups = submittedResult.rows;
      
      return NextResponse.json({
        submittedGroups,
        notSubmittedCount: Math.max(0, totalGroups - submittedGroups.length)
      }, { status: 200 });
    }

    // Default: Fetch subject details
    const subjectQuery = `
      SELECT * FROM "Subject_Available" 
      WHERE subjectid = $1 AND deleted IS NULL
    `;
    const subjectResult = await client.query(subjectQuery, [parsedSubjectId]);
    
    if (subjectResult.rowCount === 0) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    
    const subject = subjectResult.rows[0];

    // Verify teacher has access to this subject
    if (subject.teachers && !subject.teachers.includes(teacherId)) {
      return NextResponse.json({ error: 'Not authorized to access this subject' }, { status: 403 });
    }

    // Fetch teacher details
    if (subject.teachers && subject.teachers.length > 0) {
      const teacherQuery = `
        SELECT userid, username, userlastname, email 
        FROM "User" 
        WHERE userid = ANY($1::text[]) 
        AND deleted IS NULL
      `;
      const teacherResult = await client.query(teacherQuery, [subject.teachers]);
      subject.teachers = teacherResult.rows;
    }

    // Fetch student details
    if (subject.students && subject.students.length > 0) {
      const studentQuery = `
        SELECT userid as student_id, username, userlastname, email 
        FROM "User" 
        WHERE userid = ANY($1::text[]) 
        AND deleted IS NULL
      `;
      const studentResult = await client.query(studentQuery, [subject.students]);
      subject.students = studentResult.rows;
    }

    return NextResponse.json(subject, { status: 200 });

  } catch (error) {
    console.error('Error in teacher/subjectDetailView route:', error);
    
    // Return empty arrays for some actions to avoid frontend errors
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    if (action === 'all-assignments' || action === 'submission-stats') {
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
