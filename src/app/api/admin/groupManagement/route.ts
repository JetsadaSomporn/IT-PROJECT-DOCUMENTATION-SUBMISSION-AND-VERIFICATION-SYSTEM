import { NextResponse, NextRequest } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get('action');
  const id = searchParams.get('id');
  const subject = searchParams.get('subject');

  const client = await pool.connect();
  try {
    if (action === 'get-student') {
      const normalizedId = id?.replace(/[^0-9]/g, '');
      
      if (!normalizedId || normalizedId.length !== 10) {
        return NextResponse.json({ error: 'รหัสนักศึกษาไม่ถูกต้อง' }, { status: 400 });
      }

      const query = `
        SELECT 
          userid,
          username,
          userlastname,
          email,
          track,
          type,
          year
        FROM "User"
        WHERE userid = $1
        AND deleted IS NULL
        AND type @> ARRAY['student']::text[]
      `;
      
      try {
        const result = await client.query(query, [normalizedId]);
        
        if (result.rows.length === 0) {
          return NextResponse.json({ error: 'ไม่พบข้อมูลนักศึกษา' }, { status: 404 });
        }
        
        const fallbackTrack = searchParams.get('track');
      
        if (fallbackTrack) {
          result.rows[0].track = fallbackTrack;
        }
        
        return NextResponse.json({
          ...result.rows[0],
          userid: normalizedId
        });
      } catch (error) {
        console.error('ข้อผิดพลาดฐานข้อมูล:', error);
        return NextResponse.json({ error: 'ข้อผิดพลาดฐานข้อมูล' }, { status: 500 });
      }
    }
    
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
      const subjectsResult = await client.query(subjectsQuery);
      return NextResponse.json(subjectsResult.rows);
    }

    if (action === 'get-teachers') {
      const teachersQuery = `
        SELECT userid, username, userlastname, email
        FROM "User"
        WHERE (
          email LIKE '%@kku.ac.th' 
          OR type @> ARRAY['admin']::text[]
          OR track = 'teacher'
        )
        AND deleted IS NULL
        ORDER BY username, userlastname;
      `;
      
      const teachersResult = await client.query(teachersQuery);
      return NextResponse.json(teachersResult.rows);
    }

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
        g.teacherother::text as teacherother_text,
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
      WHERE g.subject = $1::int
      AND g.deleted IS NULL
      GROUP BY 
        g.groupid, 
        g.groupname, 
        g.projectname,
        g.subject,
        g.teacher,
        g.teacherother::text,
        g.note
      ORDER BY g.groupname;
    `;

    if (subject) {
      try {
        const groupResult = await client.query(groupQuery, [subject]);
        
        const formattedRows = groupResult.rows.map(row => {
          const teachers = Array.isArray(row.teachers) ? row.teachers : [];
          const students = Array.isArray(row.students) ? row.students : [];
          
          return {
            ...row,
            teachers,
            students,
            teacher_name: teachers.length > 0 ? 
              `${teachers[0].username} ${teachers[0].userlastname}` : '',
            teacherother: row.teacherother_text ? JSON.parse(row.teacherother_text) : null
          };
        });

        return NextResponse.json(formattedRows);
      } catch (error) {
        console.error('ข้อผิดพลาดฐานข้อมูล:', error);
        return NextResponse.json([]); 
      }
    }

    return NextResponse.json([]);

  } catch (error) {
    console.error('ข้อผิดพลาดฐานข้อมูล:', error);
    return NextResponse.json({ error: 'ข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
  } finally {
    client.release();
  }
}

interface GroupMember {
  studentId: string;
  teacher?: string;
}

export async function POST(request: Request) {
  const { subjectId, groups } = await request.json();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const group = groups[0];
    const groupName = group.groupName;
    const projectName = group.projectName;

    interface GroupMemberInput {
      studentId: string;
      [key: string]: any; }

    const memberIds: string[] = (group.members as GroupMemberInput[] || [])
      .map((m: GroupMemberInput) => m.studentId ? m.studentId.replace(/[^0-9]/g, '') : null)
      .filter((id): id is string => id !== null && id.length === 10);

    const existingGroup = await client.query(
      `SELECT groupid, projectname FROM "Group" 
       WHERE groupname = $1 AND subject = $2 AND deleted IS NULL`,
      [groupName, subjectId]
    );

    if (existingGroup.rows.length > 0) {
      await client.query(
        `UPDATE "Group" 
         SET "User" = $1::character varying[],
             teacher = $2::character varying[],
             note = $3,
             projectname = COALESCE($4, projectname),
             updated = CURRENT_TIMESTAMP
         WHERE groupid = $5`,
        [
          memberIds,
          group.teachers || [],
          group.note || null,
          projectName,
          existingGroup.rows[0].groupid
        ]
      );
    } else if (memberIds.length > 0) {
      await client.query(
        `INSERT INTO "Group" (
          groupname, 
          subject, 
          "User", 
          teacher, 
          note,
          projectname
        ) VALUES ($1, $2, $3::character varying[], $4::character varying[], $5, $6)`,
        [
          groupName,
          subjectId,
          memberIds,
          group.teachers || [],
          group.note || null,
          projectName
        ]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('ข้อผิดพลาดในการบันทึกกลุ่ม:', error);
    return NextResponse.json({ error: 'ไม่สามารถบันทึกกลุ่มได้' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const { groupId, students } = await request.json();

  if (!groupId || !Array.isArray(students)) {
    return NextResponse.json({ error: 'กรุณาระบุ ID กลุ่มและรายชื่อนักศึกษา' }, { status: 400 });
  }

  const studentIds = students
    .map((id: string) => id.replace(/\D/g, ''))
    .filter((id) => id);

  const client = await pool.connect();
  try {
    const updateQuery = `
      UPDATE "Group"
      SET "User" = $1::character varying[]
      WHERE groupid = $2 AND deleted IS NULL
      RETURNING *;
    `;
    
    const result = await client.query(updateQuery, [studentIds, groupId]);
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'ไม่พบกลุ่ม' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('ข้อผิดพลาดฐานข้อมูล:', error);
    return NextResponse.json({ error: 'ข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(request: Request) {
  const requestData = await request.json();
  const client = await pool.connect();
  
  try {
    if (requestData.action === 'update-student-track') {
      const { studentId, track } = requestData;
      
      if (!studentId || !track) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
      }
      
      await client.query('BEGIN');
     
      const updateQuery = `
        UPDATE "User"
        SET track = $1, updated = CURRENT_TIMESTAMP
        WHERE userid = $2 AND deleted IS NULL
        RETURNING userid, track
      `;
      
      const result = await client.query(updateQuery, [track, studentId]);
      
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      
      await client.query('COMMIT');
      
      return NextResponse.json({ 
        success: true, 
        message: `Track for student ${studentId} updated to ${track}`,
        data: result.rows[0]
      });
    }
    
  
    const { sourceSubjectId, targetSubjectId } = requestData;
  
    if (!sourceSubjectId || !targetSubjectId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสวิชาต้นทางและปลายทาง' }, { status: 400 });
    }

    await client.query('BEGIN');
    
    const getGroupsQuery = `
      SELECT groupid, projectname, groupname, "User", teacher, note
      FROM "Group"
      WHERE subject = $1 AND deleted IS NULL
    `;
    const groupsResult = await client.query(getGroupsQuery, [sourceSubjectId]);
    
    for (const group of groupsResult.rows) {
      const checkExistingQuery = `
        SELECT groupid 
        FROM "Group" 
        WHERE subject = $1 AND groupname = $2 AND deleted IS NULL
      `;
      const existingResult = await client.query(checkExistingQuery, [targetSubjectId, group.groupname]);
      
      if (existingResult.rows.length > 0) {
        await client.query(
          `UPDATE "Group"
           SET "User" = $1::character varying[],
               teacher = $2::character varying[],
               note = $3,
               projectname = $4,
               updated = CURRENT_TIMESTAMP
           WHERE groupid = $5`,
          [group.User, group.teacher, group.note, group.projectname, existingResult.rows[0].groupid]
        );
      } else {
        await client.query(
          `INSERT INTO "Group" (
            groupname, 
            subject, 
            "User", 
            teacher, 
            note,
            projectname
          ) VALUES ($1, $2, $3::character varying[], $4::character varying[], $5, $6)`,
          [group.groupname, targetSubjectId, group.User, group.teacher, group.note, group.projectname]
        );
      }
    }
    
    await client.query('COMMIT');
    return NextResponse.json({ 
      success: true, 
      message: `โอนย้าย ${groupsResult.rows.length} กลุ่มจากรายวิชา ${sourceSubjectId} ไปยังรายวิชา ${targetSubjectId} เรียบร้อยแล้ว`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('ข้อผิดพลาดในการดำเนินการ:', error);
    return NextResponse.json({ error: 'ไม่สามารถดำเนินการได้' }, { status: 500 });
  } finally {
    client.release();
  }
}
