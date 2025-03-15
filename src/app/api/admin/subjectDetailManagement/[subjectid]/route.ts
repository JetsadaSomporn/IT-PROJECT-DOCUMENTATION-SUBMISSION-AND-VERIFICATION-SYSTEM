import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface AssignmentSubmission {
  assignment_sent_id: number;
  assignment_id: number;
  group_id: number;
  pdf: {
    file_name: string;
    file_path: string;
    file_size: string;
    uploaded_by: string;
  };
  created: string;
  updated: string;
  deleted: string | null;
}

const authenticate = async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return null;
};

export async function GET(request: Request, { params }: { params: { subjectid: string } }) {
  const client = await pool.connect();
  try {
    const { subjectid } = await params;

    const authResponse = await authenticate(request);
    if (authResponse) return authResponse;

    const parsedSubjectId = Number(subjectid);
    if (isNaN(parsedSubjectId)) {
      return NextResponse.json({ error: 'รหัสวิชาไม่ถูกต้อง' }, { status: 400 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'fetch-subject';

    if (action === 'all-assignments') {
      const res = await client.query(
        'SELECT * FROM "Assignment" WHERE subject_available_id = $1 AND deleted IS NULL ORDER BY created DESC',
        [parsedSubjectId]
      );

      // Process the results to include the full timestamp from validates
      const assignments = res.rows.map(assignment => {
        // Check if validates contains the full due date time
        if (assignment.validates && assignment.validates.length > 0) {
          const validate = assignment.validates[0];
          if (validate.fullDueDateTime) {
            // Use the full timestamp from validates
            assignment.assignment_due_date_with_time = validate.fullDueDateTime;
          }
        }
        return assignment;
      });
    
      return NextResponse.json(assignments || [], { 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'dashboard-data') {
      try {
        const assignmentId = url.searchParams.get('assignmentId');
        if (!assignmentId) {
          return NextResponse.json({ error: 'รหัสงานไม่ถูกต้อง' }, { status: 400 });
        }
    
        const assignmentResult = await client.query(
          `SELECT * FROM "Assignment" 
           WHERE assignmentid = $1 
           AND subject_available_id = $2 
           AND deleted IS NULL`,
          [assignmentId, parsedSubjectId]
        );
    
        if (assignmentResult.rowCount === 0) {
          return NextResponse.json({ error: 'ไม่พบข้อมูลงาน' }, { status: 404 });
        }
    
        const assignment = assignmentResult.rows[0];
        
        // First, get valid groups for this subject
        const groupsQuery = `
          SELECT g.groupid, g.groupname, g."User", g.projectname
          FROM "Group" g
          WHERE g.subject = $1 AND g.deleted IS NULL AND g."User" IS NOT NULL AND array_length(g."User", 1) > 0
        `;
        const groupsResult = await client.query(groupsQuery, [parsedSubjectId]);
        
        // Get total count of valid groups
        const totalValidGroups = groupsResult.rows.length;
        
        // Get list of group IDs that have submitted
        const submittedGroupsQuery = `
          SELECT DISTINCT group_id
          FROM "Assignment_Sent"
          WHERE assignment_id = $1 AND deleted IS NULL
        `;
        const submittedGroupsResult = await client.query(submittedGroupsQuery, [assignmentId]);
        const submittedGroupIds = submittedGroupsResult.rows.map(row => row.group_id);
        
        // Get all submitted groups with details
        const submittedGroupsDetailsQuery = `
          SELECT g.groupid, g.groupname, g.projectname
          FROM "Group" g
          WHERE g.groupid = ANY($1) AND g.deleted IS NULL
        `;
        const submittedGroupsDetailsResult = await client.query(
          submittedGroupsDetailsQuery,
          [submittedGroupIds]
        );
        
        const submittedGroupsDetails = submittedGroupsDetailsResult.rows;
        
        // Count submitted groups and calculate not submitted
        const submittedCount = submittedGroupIds.length;
        const notSubmittedCount = Math.max(0, totalValidGroups - submittedCount);
        
        // Process the due date for comparing submission times
        let dueDate;
        if (assignment.validates && 
            Array.isArray(assignment.validates) && 
            assignment.validates.length > 0 && 
            assignment.validates[0].fullDueDateTime) {
          dueDate = new Date(assignment.validates[0].fullDueDateTime);
        } else {
          dueDate = new Date(assignment.assignment_due_date);
        }
    
        // Get submission details for all submitted assignments with expanded details
        const submissionsQuery = `
          SELECT 
            ass.*,
            u.username,
            u.userlastname,
            u.email,
            g.groupname as group_name,
            g.projectname,
            (ass.pdf->>'file_name') as file_name,
            (ass.pdf->>'file_path') as file_path,
            CASE
              WHEN ass.pdf->>'file_size' ~ '^[0-9]+(\.[0-9]+)?$' THEN (ass.pdf->>'file_size')::numeric
              WHEN ass.pdf->>'file_size' ~ '.*MB.*' THEN REPLACE(REPLACE(ass.pdf->>'file_size', 'MB', ''), ' ', '')::numeric
              ELSE 0
            END as file_size,
            (SELECT array_agg(u2.username || ' ' || u2.userlastname)
             FROM "User" u2
             WHERE u2.userid = ANY(g."User")) as group_members
          FROM "Assignment_Sent" ass
          LEFT JOIN "User" u ON u.userid = (ass.pdf->>'uploaded_by')
          LEFT JOIN "Group" g ON g.groupid = ass.group_id
          WHERE ass.assignment_id = $1 
          AND ass.deleted IS NULL
          ORDER BY ass.created DESC
        `;
    
        const submissionsResult = await client.query(submissionsQuery, [assignmentId]);
        const submissions = submissionsResult?.rowCount && submissionsResult.rowCount > 0 ? submissionsResult.rows : [];
    
        // Get not submitted groups details
        const notSubmittedGroups = groupsResult.rows
          .filter(group => !submittedGroupIds.includes(group.groupid))
          .map(group => ({
            groupid: group.groupid,
            groupname: group.groupname,
            projectname: group.projectname
          }));
    
        // Calculate statistics by group instead of by individual submission
        const stats = {
          timeliness: {
            onTime: 0,
            late: 0
          },
          fileSizes: [] as { name: string; size: number }[],
          fileTypes: {} as { [key: string]: number },
          timeline: {
            dates: [] as string[],
            onTime: [] as number[],
            late: [] as number[]
          },
          hourlyDistribution: Array(24).fill(0),
          dayOfWeekDistribution: Array(7).fill(0),
          verificationResults: {
            totalChecks: 0,
            passedChecks: 0,
            documents: {} as { [key: string]: { checked: number, total: number } }
          },
          submissionTimeGap: [] as number[],
          totalGroups: totalValidGroups,
          submittedGroups: submittedCount,
          notSubmittedGroups: notSubmittedCount,
          submissionRate: submittedCount / totalValidGroups || 0,
          averageSubmissionHours: 0
        };
    
        // Track the earliest submission for each group
        const groupSubmissionMap: { [groupId: string]: { date: Date, isOnTime: boolean } } = {};
        
        // Process each submission to track by group and collect additional stats
        submissions.forEach(sub => {
          const groupId = sub.group_id;
          const submitDate = new Date(sub.created);
          const isOnTime = submitDate <= dueDate;
          
          // Track file sizes for all submissions
          const fileSize = parseFloat(sub.file_size);
          if (!isNaN(fileSize) && fileSize > 0) {
            stats.fileSizes.push({
              name: sub.file_name || 'Unknown file',
              size: fileSize
            });
          }
    
          // Track file types
          if (sub.file_name) {
            const fileExt = sub.file_name.split('.').pop()?.toLowerCase() || 'unknown';
            stats.fileTypes[fileExt] = (stats.fileTypes[fileExt] || 0) + 1;
          }
    
          // Track hourly submission distribution
          stats.hourlyDistribution[submitDate.getHours()]++;
          
          // Track day of week submission distribution (0 = Sunday, 6 = Saturday)
          stats.dayOfWeekDistribution[submitDate.getDay()]++;
    
          // Calculate submission gap (hours between assignment due and submission)
          const creationDate = new Date(assignment.created);
          const gapHours = Math.round((submitDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60));
          if (gapHours >= 0) {
            stats.submissionTimeGap.push(gapHours);
          }
    
          // For timeline tracking, add each submission to its date bucket
          const dateKey = submitDate.toISOString().split('T')[0];
          const dateIndex = stats.timeline.dates.indexOf(dateKey);
          if (dateIndex === -1) {
            stats.timeline.dates.push(dateKey);
            stats.timeline.onTime.push(0);
            stats.timeline.late.push(0);
            const newIndex = stats.timeline.dates.length - 1;
            if (isOnTime) {
              stats.timeline.onTime[newIndex]++;
            } else {
              stats.timeline.late[newIndex]++;
            }
          } else {
            if (isOnTime) {
              stats.timeline.onTime[dateIndex]++;
            } else {
              stats.timeline.late[dateIndex]++;
            }
          }
    
          // Process verification results if available
          if (sub.verification_results) {
            try {
              const results = typeof sub.verification_results === 'string' 
                ? JSON.parse(sub.verification_results) 
                : sub.verification_results;
              
              if (results && typeof results === 'object') {
                for (const [docName, checks] of Object.entries(results)) {
                  if (!stats.verificationResults.documents[docName]) {
                    stats.verificationResults.documents[docName] = { checked: 0, total: 0 };
                  }
                  
                  if (typeof checks === 'object' && checks !== null) {
                    const checkResults = checks as { passed?: boolean, failed?: boolean };
                    stats.verificationResults.totalChecks++;
                    if (checkResults.passed) {
                      stats.verificationResults.passedChecks++;
                      stats.verificationResults.documents[docName].checked++;
                    }
                    stats.verificationResults.documents[docName].total++;
                  }
                }
              }
            } catch (e) {
              // Silent error
            }
          }
    
          // Track the earliest submission for each group
          if (!groupSubmissionMap[groupId] || submitDate < groupSubmissionMap[groupId].date) {
            groupSubmissionMap[groupId] = { date: submitDate, isOnTime };
          }
        });
    
        // Now count timeliness based on the earliest submission for each group
        Object.values(groupSubmissionMap).forEach(submission => {
          if (submission.isOnTime) {
            stats.timeliness.onTime++;
          } else {
            stats.timeliness.late++;
          }
        });
    
        // Calculate average submission time gap
        stats.averageSubmissionHours = stats.submissionTimeGap.length > 0
          ? stats.submissionTimeGap.reduce((sum, gap) => sum + gap, 0) / stats.submissionTimeGap.length
          : 0;
    
        // Adjust timeliness counts if needed
        if (stats.timeliness.onTime + stats.timeliness.late !== submittedCount) {
          if (stats.timeliness.onTime + stats.timeliness.late > submittedCount) {
            // Too many counted - prioritize preserving on-time count
            stats.timeliness.late = Math.max(0, submittedCount - stats.timeliness.onTime);
          }
        }
    
        // Sort file sizes by size (descending)
        stats.fileSizes.sort((a, b) => b.size - a.size);
    
        // Sort timeline dates
        const sortedIndices = stats.timeline.dates
          .map((date, index) => ({ date, index }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .map(item => item.index);
    
        stats.timeline.dates = sortedIndices.map(i => stats.timeline.dates[i]);
        stats.timeline.onTime = sortedIndices.map(i => stats.timeline.onTime[i]);
        stats.timeline.late = sortedIndices.map(i => stats.timeline.late[i]);
    
        return NextResponse.json({
          assignment,
          stats,
          submissions: submissions.map(sub => ({
            ...sub,
            pdf: {
              file_name: sub.file_name,
              file_path: sub.file_path,
              file_size: sub.file_size,
              uploaded_by: sub.pdf.uploaded_by
            }
          })),
          submittedGroups: submittedGroupsDetails,
          notSubmittedGroups
        });
    
      } catch (error) {
        return NextResponse.json({ 
          error: 'กำลังดึงข้อมูลแดชบอร์ดล้มเหลว',
          details: error instanceof Error ? error.message : 'ข้อผิดพลาดที่ไม่รู้จัก'
        }, { status: 500 });
      }
    }
    
    if (action === "all-users") {
      const result = await client.query(
        `SELECT * FROM "User" WHERE type && ARRAY['teacher', 'admin']`
      );
      return NextResponse.json(result.rows);
    }

    if (action === 'submission-stats') {
      const assignmentId = url.searchParams.get('assignmentId');
      
      if (!assignmentId) {
        return NextResponse.json({ error: 'รหัสงานไม่ถูกต้อง' }, { status: 400 });
      }
  
      try {
        const client = await pool.connect();
        
        try {
          const groupsQuery = `
            SELECT g.groupid, g.groupname, g."User"
            FROM "Group" g
            WHERE g.subject = $1 AND g.deleted IS NULL AND g."User" IS NOT NULL AND array_length(g."User", 1) > 0
          `;
          const groupsResult = await client.query(groupsQuery, [subjectid]);
          
          const submissionsQuery = `
            SELECT DISTINCT group_id  
            FROM "Assignment_Sent"
            WHERE assignment_id = $1 AND deleted IS NULL
          `;
          const submissionsResult = await client.query(submissionsQuery, [assignmentId]);
          
          const submittedGroupIds = submissionsResult.rows.map(row => row.group_id);
          
          const totalGroups = groupsResult.rows.length;
          const submittedGroups = submittedGroupIds.length;
          const notSubmittedGroups = Math.max(0, totalGroups - submittedGroups);
          
          const result = {
            totalGroups: totalGroups,
            submittedGroups: submittedGroupIds,
            notSubmittedCount: notSubmittedGroups
          };
          
          return NextResponse.json(result);
        } finally {
          client.release();
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'กำลังดึงสถิติการส่งงานล้มเหลว' },
          { status: 500 }
        );
      }
    }

    try {
      const subjectResult = await client.query(
        `SELECT * FROM "Subject_Available" 
         WHERE subjectid = $1 AND deleted IS NULL`,
        [parsedSubjectId]
      );

      if (subjectResult.rowCount === 0) {
        return NextResponse.json({ error: 'ไม่พบวิชา' }, { status: 404 });
      }

      const subject = subjectResult.rows[0];

      if (subject.teachers && subject.teachers.length > 0) {
        const teacherResult = await client.query(
          `SELECT userid, username, userlastname, email, type 
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

    } catch (err) {
      throw err;
    }

  } catch (err) {
    // Return empty array on error for assignments
    const errorUrl = new URL(request.url);
    if (errorUrl.searchParams.get('action') === 'all-assignments') {
      return NextResponse.json([], { 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return NextResponse.json({ 
      error: 'เซิร์ฟเวอร์ผิดพลาด',
      details: err instanceof Error ? err.message : 'ข้อผิดพลาดที่ไม่รู้จัก'
    }, { status: 500 });
  } finally {
    client.release();
  }
}


export async function PUT(request: Request, { params }: { params: { subjectid: string } }) {
  const client = await pool.connect();
  try {
    const { subjectid } = await params;
    const parsedSubjectId = Number(subjectid);

    if (isNaN(parsedSubjectId)) {
      return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 });
    }

    const authResponse = await authenticate(request);
    if (authResponse) return authResponse;

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'fetch-subject';

    if (action === 'manage-teacher') {
      
      const requestBody = await request.json();
      const { teachers } = requestBody;
    
      try {
        await client.query('BEGIN');
    
        // First get teacher details
        const teacherDetails = await client.query(
          `SELECT userid, username, userlastname, email, type 
           FROM "User" 
           WHERE userid = ANY($1::text[])
           AND deleted IS NULL`,
          [teachers]
        );
    
        // Update Subject_Available with teacher IDs as JSONB array
        const updateQuery = `
          UPDATE "Subject_Available"
          SET 
            teachers = $1::jsonb,
            updated = CURRENT_TIMESTAMP
          WHERE subjectid = $2 AND deleted IS NULL
          RETURNING *;
        `;
    
        // Convert teacher IDs to JSONB array
        const teacherIds = JSON.stringify(teachers);
    
        const result = await client.query(updateQuery, [teacherIds, parsedSubjectId]);
    
        if (result.rowCount === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }
    
        await client.query('COMMIT');
    
        const response = {
          ...result.rows[0],
          teachers: teacherDetails.rows // Include full teacher details in response
        };
    
        return NextResponse.json({
          message: 'Teachers updated successfully',
          data: response
        });
    
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    if (action === 'edit-subject') {

      const authResponse = await authenticate(request);
      
      if (authResponse) {
      return authResponse;
      }

      const parsedSubjectId = Number(subjectid);
      
      if (isNaN(parsedSubjectId)) {
      return NextResponse.json({ error: 'invalit subject ID' }, { status: 400 });
      }
      const requestBody = await request.json();

      // trim and validate value
      const subjectName = (requestBody.subject_name ?? '').toString().trim();
      const subjectSemester = (requestBody.subject_semester ?? '').toString().trim();
      const subjectYear = (requestBody.subject_year ?? '').toString().trim();
      const sectionValue = (requestBody.section ?? '').toString().trim();
      const groupData = requestBody.group_data ?? {};


      if (!subjectName || !subjectSemester || !subjectYear || !sectionValue) {
      return NextResponse.json({ 
        error: 'missing required fields',
        details: { subjectName, subjectSemester, subjectYear, sectionValue }
      }, { status: 400 });
      }

      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // update the subject first
        const updateQuery = `
          UPDATE "Subject_Available"
          SET subject_name = $1,
            subject_semester = $2,
            subject_year = $3,
            section = $4,
            group_data = $5::json,
            updated = NOW()
          WHERE subjectid = $6 AND deleted IS NULL
          RETURNING *;
        `;
        
        const values = [
          subjectName,
          subjectSemester,
          subjectYear,
          sectionValue,
          JSON.stringify(groupData),
          parsedSubjectId
        ];

        const res = await client.query(updateQuery, values);

        if (res.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        // get teacher data
        const teacherIds = res.rows[0].teachers || [];
        let teachersData = [];
        
        if (Array.isArray(teacherIds) && teacherIds.length > 0) {
          const teachersQuery = `
            SELECT userid, username, userlastname, email, type 
            FROM "User" 
            WHERE userid = ANY($1::text[]) 
            AND deleted IS NULL
          `;
          const teachersResult = await client.query(teachersQuery, [teacherIds]);
          teachersData = teachersResult.rows;
        }

        // get students data
        const studentIds = res.rows[0].students || [];
        let studentsData = [];
        
        if (Array.isArray(studentIds) && studentIds.length > 0) {
          const studentsQuery = `
            SELECT 
              userid as student_id,
              username,
              userlastname,
              email
            FROM "User"
            WHERE userid = ANY($1::text[])
            AND deleted IS NULL
          `;
          const studentsResult = await client.query(studentsQuery, [studentIds]);
          studentsData = studentsResult.rows;
        }

        await client.query('COMMIT');

        // Combine all data
        const completeSubjectData = {
          ...res.rows[0],
          teachers: teachersData,
          students: studentsData
        };

        return NextResponse.json({
          message: 'subject updated successfully',
          data: completeSubjectData
        }, { status: 200 });
        
      } catch (error: any) {
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          error: 'Failed to update subject',
          details: error.message 
        }, { status: 500 });
      } finally {
        client.release();
      }
    }

    // แก้ไขฟังก์ชันในส่วนที่บันทึกเวลาลงฐานข้อมูล
    if (action === 'update-assignment') {
      const client = await pool.connect();
      try {
        const requestBody = await request.json();
  
        const { 
          assignmentid, 
          assignment_name, 
          assignment_description, 
          assignment_date, 
          assignment_due_date, 
          validates 
        } = requestBody;
  
        // Store the full timestamp in the validates array with proper error handling
        let validateItem;
        if (validates && Array.isArray(validates) && validates.length > 0) {
          validateItem = {
            ...validates[0],
            fullDueDateTime: assignment_due_date // Store the full ISO timestamp with timezone
          };
        } else {
          validateItem = {
            type: 'verification_requirements',
            requirements: requestBody.doc_verification || {},
            fullDueDateTime: assignment_due_date // Store the full ISO timestamp with timezone
          };
        }
        
        // Set timezone to correctly handle timestamps
        await client.query("SET timezone = 'Asia/Bangkok'");
        
        const updateQuery = `
          UPDATE "Assignment"
          SET 
            assignment_name = $1,
            assignment_description = $2,
            assignment_date = $3::date,
            assignment_due_date = $4::timestamp with time zone,
            validates = ARRAY[$5::json],
            updated = CURRENT_TIMESTAMP
          WHERE assignmentid = $6 
          AND subject_available_id = $7 
          AND deleted IS NULL
          RETURNING *;
        `;
        
        const values = [
          assignment_name,
          assignment_description || '',
          assignment_date,
          assignment_due_date, // Use the ISO string with timezone info
          JSON.stringify(validateItem),
          assignmentid,
          parsedSubjectId
        ];
  
  
        const result = await client.query(updateQuery, values);
  
        if (result.rowCount === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Failed to update assignment' }, { status: 404 });
        }
  
        await client.query('COMMIT');
  
        // Return the assignment with the proper fullDueDateTime
        const updatedAssignment = {
          ...result.rows[0],
          doc_verification: result.rows[0].validates?.[0]?.requirements || {}
        };
  
        return NextResponse.json({
          message: 'Assignment updated successfully',
          data: updatedAssignment
        });
  
      } catch (error: any) {
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          error: 'Failed to update assignment',
          details: error.message 
        }, { status: 500 });
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ error: 'no matching action provided' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ 
      error: 'error updating subject',
      details: err.message 
    }, { status: 500 });
  } finally {
    client.release();
  }
};


export async function DELETE(request: Request, { params }: { params: { subjectid: string } }) {
  const client = await pool.connect();
  try {
    const { subjectid } = await params;
    const parsedSubjectId = Number(subjectid);

    if (isNaN(parsedSubjectId)) {
      return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'fetch-subject';
    if (!action) {
      return NextResponse.json({ error: 'Missing action param' }, { status: 400 });
    }
    const client = await pool.connect();

    try {
   
      if (action === 'delete-subject') {
        const deleteQuery = `
        UPDATE "Subject_Available"
        SET deleted = CURRENT_TIMESTAMP
        WHERE subjectid = $1 AND deleted IS NULL
        RETURNING *;
        `;

        const result = await client.query(deleteQuery, [parsedSubjectId]);

        if (result.rowCount === 0) {
        return NextResponse.json({ error: 'Subject not found or already deleted' }, { status: 404 });
        }

        return NextResponse.json({
        message: 'Subject removed successfully',
        data: result.rows[0]
        }, { status: 200 });
      }

      if (action === 'remove-student') {
        const { student_id } = await request.json();

        if (!student_id) {
          return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
        }

        try {
          
          const currentSubject = await client.query(
            'SELECT students FROM "Subject_Available" WHERE subjectid = $1 AND deleted IS NULL',
            [parsedSubjectId]
          );

          if (currentSubject.rowCount === 0) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
          }

            // get all student
          const currentStudents = currentSubject.rows[0].students || [];
          const updatedStudents: string[] = currentStudents.filter((id: string) => id !== student_id);

          const updateQuery = `
            UPDATE "Subject_Available"
            SET students = $1::text[],
                number_of_students = array_length($1::text[], 1),
                updated = CURRENT_TIMESTAMP
            WHERE subjectid = $2 AND deleted IS NULL
            RETURNING *
          `;

          const result = await client.query(updateQuery, [updatedStudents, parsedSubjectId]);

          if (result.rowCount === 0) {
            throw new Error('Failed to update subject');
          }

          return NextResponse.json({ 
            message: 'Student removed successfully',
            data: result.rows[0]
          }, { status: 200 });
        } catch (error) {
          throw error;
        }
      }

      if (action === 'delete-assignment') {
        const { assignmentid } = await request.json();

        if (typeof assignmentid !== 'number') {
          return NextResponse.json({ error: 'Invalid assignment ID' }, { status: 400 });
        }

        const deleteQuery = `
          UPDATE "Assignment" 
          SET deleted = CURRENT_TIMESTAMP
          WHERE assignmentid = $1 AND subject_available_id = $2 AND deleted IS NULL
          RETURNING *`;
        
        const result = await client.query(deleteQuery, [assignmentid, parsedSubjectId]);

        if (result.rowCount === 0) {
          return NextResponse.json({ error: 'Assignment not found or already deleted' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: 'Assignment deleted successfully',
          data: result.rows[0]
        }, { status: 200 });
      }

      if (action === 'delete-subject') {
        const deleteQuery = `
          UPDATE "Subject_Available" 
          SET deleted = CURRENT_TIMESTAMP
          WHERE subjectid = $1 AND deleted IS NULL 
          RETURNING *`;
        
        const result = await client.query(deleteQuery, [parsedSubjectId]);

        if (result.rowCount === 0) {
          return NextResponse.json({ 
            error: 'Subject not found or already deleted' 
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: 'Subject deleted successfully',
          data: result.rows[0]
        }, { status: 200 });
      }

      return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

    } catch (error: any) {
      return NextResponse.json({ 
        error: 'Delete operation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    } finally {
      client.release();
    }
  } finally {
    client.release();
  }
}


export async function POST(request: Request, { params }: { params: { subjectid: string } }) {
  const client = await pool.connect();
  try {
    const { subjectid } = await params;
    const parsedSubjectId = Number(subjectid);

    if (isNaN(parsedSubjectId)) {
      return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'fetch-subject';
    if (!action) {
      return NextResponse.json({ error: 'Missing action param' }, { status: 400 });
    }


    try {
      if (action === 'students') {
        const { students } = await request.json();

        if (!Array.isArray(students)) {
          return NextResponse.json({ error: 'Invalid students data format' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // get subject
          const subjectResult = await client.query(
            `SELECT students FROM "Subject_Available" WHERE subjectid = $1 AND deleted IS NULL`,
            [parsedSubjectId]
          );

          if (subjectResult.rowCount === 0) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
          }

          const subjectRow = subjectResult.rows[0];
          const updatedStudents = Array.isArray(subjectRow.students) ? [...subjectRow.students] : [];

          for (const student of students) {
            const { student_id, username, userlastname, email } = student;
            
            // Validate student_id
            if (!student_id || typeof student_id !== 'string') {
              continue; 
            }
            if (!username || !userlastname || !email) {
              continue; 
            }

            // Insert user in User table
            await client.query(
              `
              INSERT INTO "User" (userid, username, userlastname, email, type, created, updated)
              VALUES ($1, $2, $3, $4, ARRAY['student'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              ON CONFLICT (userid) 
              DO UPDATE SET username = EXCLUDED.username, userlastname = EXCLUDED.userlastname, email = EXCLUDED.email, updated = CURRENT_TIMESTAMP
              `,
              [student_id, username, userlastname, email]
            );

            // make each student_id to subjectRow.students arr
            if (!updatedStudents.includes(student_id)) {
              updatedStudents.push(student_id);
            }
          }

        
          await client.query(
            `
            UPDATE "Subject_Available"
            SET students = $1::text[]
            WHERE subjectid = $2
            `,
            [updatedStudents, parsedSubjectId]
          );

          await client.query('COMMIT');
          return NextResponse.json({ message: 'Students imported successfully' }, { status: 200 });
        } catch (err: any) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Failed to save students', details: err.message }, { status: 500 });
        } finally {
          client.release();
        }
      }

      if (action === 'all-teachers') {
        const teachersResult = await pool.query(
          'SELECT userid, username, userlastname, email FROM "User" WHERE $1 = ANY(type) OR $2 = ANY(type)',
          ['teacher', 'admin']
        );
        return NextResponse.json(teachersResult.rows, { status: 200 });
      }

      if (action === 'all-users') {
        const usersResult = await pool.query(
          `SELECT userid, username, userlastname, email, type
           FROM "User"
           WHERE deleted IS NULL
           AND type && ARRAY['teacher', 'admin']::text[]`
        );
        return NextResponse.json(usersResult.rows, { status: 200 });
      }

      if (action === 'all-assignments') {
        try {
          
          const assignmentsQuery = `
            SELECT * FROM "Assignment" 
            WHERE subject_available_id = $1 
            AND deleted IS NULL
            ORDER BY created DESC
          `;
          
          const result = await client.query(assignmentsQuery, [parsedSubjectId]);
  
          if (result.rowCount === 0) {
            return NextResponse.json([], { status: 200 });
          }
  
          const assignments = result.rows;
          return NextResponse.json(assignments, { status: 200 });
  
        } catch (error) {
          throw error;
        }
      }

      if (action === 'teachers') {
        const { teachers } = await request.json();

        if (!Array.isArray(teachers) || teachers.some((id: any) => typeof id !== 'string')) {
          return NextResponse.json({ error: 'Invalid teachers data format' }, { status: 400 });
        }

        // get teacher details from User table
        const teachersResult = await pool.query(
          `SELECT userid, username, userlastname, email FROM "User" WHERE userid = ANY($1::text[]) AND 'teacher' = ANY(type)`,
          [teachers]
        );

        const validTeacherIds = teachersResult.rows.map(t => t.userid);

        // update subject with teacherid
        const updateQuery = `
          UPDATE "Subject_Available"
          SET teachers = $1::jsonb,
              updated = CURRENT_TIMESTAMP
          WHERE subjectid = $2
          RETURNING *
        `;
        const teachersJson = JSON.stringify(validTeacherIds);

        const result = await pool.query(updateQuery, [teachersJson, parsedSubjectId]);

        if (result.rowCount === 0) {
          return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }

        return NextResponse.json({
          message: 'Teachers updated successfully',
          data: {
            ...result.rows[0],
            teachers: teachersResult.rows
          }
        });
      }

      // อัปเดต action create-assignment เช่นกัน
      if (action === 'create-assignment') {
        try {
          const {
            assignment_name,
            assignment_description,
            assignment_date,
            assignment_due_date,
            documentVerification
          } = await request.json();
        
          if (!assignment_name || !assignment_date || !assignment_due_date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
          }
        
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
        
            // Parse the full date string to preserve time components
            const dueDate = new Date(assignment_due_date);
        
            const validateItem = {
              type: 'verification_requirements',
              requirements: documentVerification,
              fullDueDateTime: assignment_due_date // Store the full timestamp with timezone
            };
        
            // Set the PostgreSQL session timezone to Thailand for consistent handling
            await client.query("SET timezone = 'Asia/Bangkok'");
            
            const insertQuery = `
              INSERT INTO "Assignment" (
                subject_available_id,
                assignment_name,
                assignment_description,
                assignment_date,
                assignment_due_date, -- This should accept timestamp now
                validates,
                created,
                updated
              )
              VALUES ($1, $2, $3, $4::date, $5, ARRAY[$6::json], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              RETURNING *;
            `;
        
            const values = [
              parsedSubjectId,
              assignment_name,
              assignment_description || '',
              assignment_date,
              assignment_due_date, // Use the full ISO timestamp with timezone
              JSON.stringify(validateItem)
            ];
        
            const result = await client.query(insertQuery, values);
            await client.query('COMMIT');
        
          
            const newAssignment = {
              ...result.rows[0],
              doc_verification: result.rows[0].validates?.[0]?.requirements || {}
            };
        
            return NextResponse.json({
              message: 'Assignment created successfully',
              data: newAssignment
            });
        
          } catch (error: any) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
        } catch (error: any) {
          return NextResponse.json({ 
            error: 'Failed to create assignment',
            details: error.message 
          }, { status: 500 });
        }
      }

      if (action === 'make-user-teacher') {
        const { userid } = await request.json();

        if (!userid || typeof userid !== 'string') {
          return NextResponse.json({ error: 'Invalid userid provided' }, { status: 400 });
        }

        // check if the user teacher or admin already
        const userCheck = await pool.query(
          `SELECT type FROM "User" WHERE userid = $1`,
          [userid]
        );

        if (userCheck.rowCount === 0) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userTypes: string[] = userCheck.rows[0].type;

        if (userTypes.includes('teacher') || userTypes.includes('admin')) {
          return NextResponse.json({ message: 'User is already a teacher or admin', data: userCheck.rows[0] }, { status: 200 });
        }

        
        const updateTypeQuery = `
          UPDATE "User"
          SET type = array_append(type, 'teacher'),
              updated = CURRENT_TIMESTAMP
          WHERE userid = $1
          RETURNING userid, username, userlastname, email, type
        `;
        const updatedUserResult = await pool.query(updateTypeQuery, [userid]);

        if (updatedUserResult.rowCount === 0) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const updatedUser = updatedUserResult.rows[0];
        return NextResponse.json({ message: 'User promoted to teacher successfully', data: updatedUser }, { status: 200 });
      }

      if (action === 'fetch-users') {
        const { studentIds } = await request.json();
        if (!Array.isArray(studentIds)) {
          throw new Error('studentIds must be an array');
        }

        const userResult = await pool.query(
          'SELECT userid, username, userlastname FROM "User" WHERE userid = ANY($1) AND deleted IS NULL',
          [studentIds]
        );

        return NextResponse.json(userResult.rows, { status: 200 });
      }

      if (action === 'create-subject-teachers') {
        try {
          const reqBody = await request.json();
        
          const { teachers } = reqBody; 
          if (!Array.isArray(teachers)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
          }
    
          const updated = await pool.query(
            'UPDATE "Subject_Available" SET teachers = $1::jsonb WHERE subjectid = $2 AND deleted IS NULL RETURNING *',
            [JSON.stringify(teachers), parsedSubjectId]
          );
    
          return NextResponse.json(updated.rows[0], { status: 200 });
        } catch (err: any) {
          return NextResponse.json({ error: err.message }, { status: 500 });
        }
      }

      if (action === 'update-assignment') {
        try {
          const requestBody = await request.json();
      
          const { 
            assignmentid, 
            assignment_name, 
            assignment_description, 
            assignment_date, 
            assignment_due_date, 
            doc_verification 
          } = requestBody;
      
          if (!assignmentid || !assignment_name) {
            return NextResponse.json({ 
              error: 'Missing required fields' 
            }, { status: 400 });
          }
      
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
      
            // convert doc_verifi to validate format
            const validateItem = {
              type: 'verification_requirements',
              requirements: doc_verification
            };
      
            // Ensure we're working with a proper ISO format date string
            const dueDate = new Date(assignment_due_date);

            // First, set the PostgreSQL session timezone to UTC to avoid automatic conversions
            await client.query("SET timezone = 'UTC'");
            
            // Instead of using AT TIME ZONE, use timestamp literal with time zone
            const updateQuery = `
              UPDATE "Assignment"
              SET 
                assignment_name = $1,
                assignment_description = $2,
                assignment_date = $3::date,
                assignment_due_date = $4::timestamp with time zone, -- Use explicit timestamp with timezone
                validates = ARRAY[$5::json],
                updated = CURRENT_TIMESTAMP
              WHERE assignmentid = $6 
              AND subject_available_id = $7 
              AND deleted IS NULL
              RETURNING *;
            `;
      
            const values = [
              assignment_name,
              assignment_description || '',
              assignment_date,
              assignment_due_date, // Use the raw ISO string directly
              JSON.stringify(validateItem),
              assignmentid,
              parsedSubjectId
            ];
      
      
            const result = await client.query(updateQuery, values);
      
            if (result.rowCount === 0) {
              await client.query('ROLLBACK');
              return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
            }
      
            await client.query('COMMIT');
      
            // Transform response to include doc_verification
            const updatedAssignment = {
              ...result.rows[0],
              doc_verification: result.rows[0].validates?.[0]?.requirements || {}
            };
      
            return NextResponse.json({
              message: 'Assignment updated successfully',
              data: updatedAssignment
            });
      
          } catch (error: any) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
        } catch (error: any) {
          return NextResponse.json({ 
            error: 'Failed to process assignment update',
            details: error.message 
          }, { status: 500 });
        }
      }


      // get subject from Subject_Available
      const subjectResult = await pool.query(
        'SELECT * FROM "Subject_Available" WHERE subjectid = $1 AND deleted IS NULL',
        [parsedSubjectId]
      );

      if (subjectResult.rowCount === 0) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      return NextResponse.json(subjectResult.rows[0], { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ 
        error: 'Operation failed',
        details: err.message 
      }, { status: 500 });
    }
  } finally {
    client.release();
  }
}
