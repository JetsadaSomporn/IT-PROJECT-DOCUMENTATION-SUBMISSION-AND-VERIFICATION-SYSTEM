import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});


const authenticate = async (request: Request) => {
  console.log('Authenticating request...'); 
  const session = await getServerSession(authOptions);
  console.log('Session:', session);
  if (!session) {
    console.log('No session found. Unauthorized access.');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log('test edit subj.');
  
  console.log('session authenticated. edit test ');
  return null;
};

export async function GET(request: Request, { params }: { params: { subjectid: string } }) {
  const client = await pool.connect();
  try {
    console.log('\n=== GET Request Started ===');
    const { subjectid } = await params;
    console.log('Fetching subject:', subjectid);

    const authResponse = await authenticate(request);
    if (authResponse) return authResponse;

    const parsedSubjectId = Number(subjectid);
    if (isNaN(parsedSubjectId)) {
      console.log('Invalid subject ID');
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const url = new URL(request.url);
    console.log('Full request URL:', url.toString());
    const action = url.searchParams.get('action') || 'fetch-subject';
    console.log('Action:', action);

    if (action === 'all-assignments') {
      console.log('Fetching assignments for subject:', parsedSubjectId);
      const res = await client.query(
        'SELECT * FROM "Assignment" WHERE subject_available_id = $1 AND deleted IS NULL ORDER BY created DESC',
        [parsedSubjectId]
      );
    
      return NextResponse.json(res.rows || [], { 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    
    if (action === "all-users") {
      const result = await client.query(
        `SELECT * FROM "User" WHERE type && ARRAY['teacher', 'admin']`
      );
      return NextResponse.json(result.rows);
    }

    try {
      // Get subject details
      console.log('\n=== Fetching Subject Data ===');
      const subjectResult = await client.query(
        `SELECT * FROM "Subject_Available" 
         WHERE subjectid = $1 AND deleted IS NULL`,
        [parsedSubjectId]
      );
      console.log('Subject query result:', subjectResult.rows[0]);

      if (subjectResult.rowCount === 0) {
        console.log('Subject not found');
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      const subject = subjectResult.rows[0];

      // Get teacher details
      console.log('\n=== Fetching Teacher Data ===');
      if (subject.teachers && subject.teachers.length > 0) {
        console.log('Teacher IDs:', subject.teachers);
        const teacherResult = await client.query(
          `SELECT userid, username, userlastname, email, type 
           FROM "User" 
           WHERE userid = ANY($1::text[]) 
           AND deleted IS NULL`,
          [subject.teachers]
        );
        console.log('Teacher details:', teacherResult.rows);
        subject.teachers = teacherResult.rows;
      }

      // Get student details
      console.log('\n=== Fetching Student Data ===');
      if (subject.students && subject.students.length > 0) {
        console.log('Student IDs:', subject.students);
        const studentResult = await client.query(
          `SELECT userid as student_id, username, userlastname, email 
           FROM "User" 
           WHERE userid = ANY($1::text[]) 
           AND deleted IS NULL`,
          [subject.students]
        );
        console.log('Student details:', studentResult.rows);
        subject.students = studentResult.rows;
      }

      console.log('\n=== Final Subject Data ===');
      console.log(JSON.stringify(subject, null, 2));

      return NextResponse.json(subject, { status: 200 });

    } catch (err) {
      console.error('Database error:', err);
      throw err;
    }

  } catch (err) {
    console.error('GET handler error:', err);
    // Return empty array on error for assignments
    const errorUrl = new URL(request.url);
    if (errorUrl.searchParams.get('action') === 'all-assignments') {
      return NextResponse.json([], { 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return NextResponse.json({ 
      error: 'Server Error',
      details: err instanceof Error ? err.message : 'Unknown error'
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
      console.log('Managing teachers - Start');
      
      const requestBody = await request.json();
      const { teachers } = requestBody;
      
      console.log('Received teachers for update:', teachers);
    
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
        console.log('Teacher IDs being saved:', teacherIds);
    
        const result = await client.query(updateQuery, [teacherIds, parsedSubjectId]);
        console.log('Update result:', result.rows[0]);
    
        if (result.rowCount === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
        }
    
        await client.query('COMMIT');
    
        const response = {
          ...result.rows[0],
          teachers: teacherDetails.rows // Include full teacher details in response
        };
    
        console.log('Final response with teachers:', response);
    
        return NextResponse.json({
          message: 'Teachers updated successfully',
          data: response
        });
    
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating teachers:', error);
        throw error;
      }
    }

    if (action === 'edit-subject') {
      // console.log('1. PUT handler started');
      // console.log('2. Subject ID:', subjectid);

      const authResponse = await authenticate(request);
      // console.log('3. Auth response:', authResponse);
      
      if (authResponse) {
      // console.log('4. Exiting due to auth response');
      return authResponse;
      }

      // console.log('5. Parsing request body');
      const parsedSubjectId = Number(subjectid);
      
      if (isNaN(parsedSubjectId)) {
      // console.log('6. Invalid subject ID');
      return NextResponse.json({ error: 'invalit subject ID' }, { status: 400 });
      }
      // console.log('7. About to parse request body');
      const requestBody = await request.json();
      // console.log('8. Request body:', requestBody);

      // trim and validate value
      const subjectName = (requestBody.subject_name ?? '').toString().trim();
      const subjectSemester = (requestBody.subject_semester ?? '').toString().trim();
      const subjectYear = (requestBody.subject_year ?? '').toString().trim();
      const sectionValue = (requestBody.section ?? '').toString().trim();
      const groupData = requestBody.group_data ?? {};

      // console.log('9. Parsed values:', {
      // subjectName,
      // subjectSemester,
      // subjectYear,
      // sectionValue,
      // groupData
      // });

      if (!subjectName || !subjectSemester || !subjectYear || !sectionValue) {
      // console.log('10. Validation failed');
      return NextResponse.json({ 
        error: 'missing required fields',
        details: { subjectName, subjectSemester, subjectYear, sectionValue }
      }, { status: 400 });
      }

      // console.log('11. Getting database connection');
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
        console.error('error updating subject:', error);
        return NextResponse.json({ 
          error: 'Failed to update subject',
          details: error.message 
        }, { status: 500 });
      } finally {
        client.release();
      }
    }

    if (action === 'update-assignment') {
      const client = await pool.connect();
      try {
        const requestBody = await request.json();
        console.log('get val assign data:', requestBody);

        const { 
          assignmentid, 
          assignment_name, 
          assignment_description, 
          assignment_date, 
          assignment_due_date, 
          validates 
        } = requestBody;

        // Match the same format as create assignment
        const validateItem = {
          type: 'verification_requirements',
          requirements: validates[0]?.requirements || {}
        };

        const updateQuery = `
          UPDATE "Assignment"
          SET 
            assignment_name = $1,
            assignment_description = $2,
            assignment_date = $3::date,
            assignment_due_date = $4::date,
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
          assignment_due_date,
          JSON.stringify(validateItem),
          assignmentid,
          parsedSubjectId
        ];

        const result = await client.query(updateQuery, values);
        console.log('Update result:', result.rows[0]);

        if (result.rowCount === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'failed to update assignment' }, { status: 404 });
        }

        await client.query('COMMIT');

        
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
        console.error('database error:', error);
        return NextResponse.json({ 
          error: 'failed to update assignment',
          details: error.message 
        }, { status: 500 });
      } finally {
        client.release();
      }
    }
    return NextResponse.json({ error: 'no matching action provided' }, { status: 400 });

  } catch (err: any) {
    console.error('Error in PUT handler:', err);
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
      // console.log('Invalid subject ID');
      return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'fetch-subject';
    if (!action) {
      console.log('No action param found, returning error.');
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

        // console.log(`subject with ID ${parsedSubjectId} removed successfully`);
        return NextResponse.json({
        message: 'Subject removed successfully',
        data: result.rows[0]
        }, { status: 200 });
      }

      if (action === 'remove-student') {
        const { student_id } = await request.json();

        if (!student_id) {
          console.log('student_id is missing in the request body.');
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

          // console.log(`student with ID ${student_id} removed from subject ${parsedSubjectId}`);
          return NextResponse.json({ 
            message: 'Student removed successfully',
            data: result.rows[0]
          }, { status: 200 });
        } catch (error) {
          console.error('Error removing student:', error);
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
        
        // console.log('Executing delete query for subject:', parsedSubjectId);
        const result = await client.query(deleteQuery, [parsedSubjectId]);

        if (result.rowCount === 0) {
          console.log('Subject not found or already deleted');
          return NextResponse.json({ 
            error: 'Subject not found or already deleted' 
          }, { status: 404 });
        }

        // console.log('Subject deleted successfully:', result.rows[0]);
        return NextResponse.json({
          success: true,
          message: 'Subject deleted successfully',
          data: result.rows[0]
        }, { status: 200 });
      }

      return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });

    } catch (error: any) {
      // console.error('Error in DELETE operation:', error);
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
      // console.log('Invalid subject ID');
      return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'fetch-subject';
    if (!action) {
      console.log('No action param found, returning error.');
      return NextResponse.json({ error: 'Missing action param' }, { status: 400 });
    }

    // console.log('Action:', action);

    try {
      if (action === 'students') {
        const { students } = await request.json();
        // console.log('Received students:', students);

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
            // console.log('Processing student:', student);
            
            // Validate student_id
            if (!student_id || typeof student_id !== 'string') {
              console.warn('Invalid or missing student_id for student:', student);
              continue; 
            }
            if (!username || !userlastname || !email) {
              console.warn('Incomplete student data:', student);
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
          // console.error('Error saving students:', err);
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
          console.log('\n=== Fetching Assignments ===');
          console.log('Subject ID:', parsedSubjectId);
          
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
  
          const assignments = result.rows;
          console.log('Returning assignments:', assignments);
          return NextResponse.json(assignments, { status: 200 });
  
        } catch (error) {
          console.error('Error fetching assignments:', error);
          throw error;
        }
      }

      if (action === 'teachers') {
        const { teachers } = await request.json();
        // console.log('Received teachers:', teachers);

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
        // console.log('Subject updated with teacher IDs:', validTeacherIds);

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
      
            const validateItem = {
              type: 'verification_requirements',
              requirements: documentVerification
            };
      
            const insertQuery = `
              INSERT INTO "Assignment" (
                subject_available_id,
                assignment_name,
                assignment_description,
                assignment_date,
                assignment_due_date,
                validates,
                created,
                updated
              )
              VALUES ($1, $2, $3, $4, $5, ARRAY[$6::json], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              RETURNING *;
            `;
      
            const values = [
              parsedSubjectId,
              assignment_name,
              assignment_description || '',
              assignment_date,
              assignment_due_date,
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
          console.error('error creating assignment:', error);
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
          console.error('error inserting teachers as JSON:', err);
          return NextResponse.json({ error: err.message }, { status: 500 });
        }
      }

      if (action === 'update-assignment') {
        try {
          const requestBody = await request.json();
          console.log('received val:', requestBody);
      
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
      
            const updateQuery = `
              UPDATE "Assignment"
              SET 
                assignment_name = $1,
                assignment_description = $2,
                assignment_date = $3::date,
                assignment_due_date = $4::date,
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
              assignment_due_date,
              JSON.stringify(validateItem),
              assignmentid,
              parsedSubjectId
            ];
      
            console.log('updating 2:', values);
      
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
          console.error('Assignment update failed:', error);
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
      // console.error('Error processing POST action:', err);
      return NextResponse.json({ 
        error: 'Operation failed',
        details: err.message 
      }, { status: 500 });
    }
  } finally {
    client.release();
  }
}
