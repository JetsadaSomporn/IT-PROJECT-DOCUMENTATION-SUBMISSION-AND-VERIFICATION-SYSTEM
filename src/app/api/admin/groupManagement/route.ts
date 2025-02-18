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
      //get only num
      const normalizedId = id?.replace(/[^0-9]/g, '');
      
      if (!normalizedId || normalizedId.length !== 10) {
        return NextResponse.json({ error: 'invalid studentid' }, { status: 400 });
      }

      //get not null student 
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
          return NextResponse.json({ error: 'student not found' }, { status: 404 });
        }
        
        return NextResponse.json({
          ...result.rows[0],
          userid: normalizedId
        });
      } catch (error) {
        console.error('database error:', error);
        return NextResponse.json({ error: 'database error' }, { status: 500 });
      }
    }
    
    if (action === 'get-subjects') {
      //get all subject
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
      //get all teachers and admin
      const teachersQuery = `
      SELECT userid, username, userlastname, email
      FROM "User"
      WHERE (email LIKE '%@kku.ac.th' AND track = 'teacher')
      OR type @> ARRAY['admin']::text[]
      OR type @> ARRAY['teacher']::text[]
      AND deleted IS NULL
      ORDER BY username, userlastname;
      `;
      
      
      const teachersResult = await client.query(teachersQuery);
      return NextResponse.json(teachersResult.rows);
    }

    //get groups with member detail
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
        
        //format return data
        const formattedRows = groupResult.rows.map(row => ({
          ...row,
          teachers: Array.isArray(row.teachers) ? row.teachers : [],
          students: Array.isArray(row.students) ? row.students : [],
          teacher_name: row.teachers?.[0] ? 
            `${row.teachers[0].username} ${row.teachers[0].userlastname}` : '',
          teacherother: row.teacherother_text ? JSON.parse(row.teacherother_text) : null
        }));

        return NextResponse.json(formattedRows);
      } catch (error) {
        console.error('database error:', error);
        return NextResponse.json([]); 
      }
    }

    return NextResponse.json([]);

  } catch (error) {
    console.error('database error:', error);
    return NextResponse.json({ error: 'internal Server Error' }, { status: 500 });
  } finally {
    client.release();
  }
}



export async function POST(request: Request) {
  const { subjectId, groups } = await request.json();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const group = groups[0];
    const groupName = group.groupName;

    // Keep all member 

    interface GroupMember {
      studentId: string;
      teacher?: string;
    }


    const memberIds: string[] = (group.members || [] as GroupMember[])
      .map((m: GroupMember): string | null => 
        m && m.studentId ? m.studentId.replace(/[^0-9]/g, '') : null
      )
      .filter((id): id is string => 
        id !== null && id.length === 10
      );

    console.log('formatted member id:', memberIds);

    //check duplicate
    if (memberIds.length > 0) {
      const duplicateCheck = await client.query(
        `SELECT g.groupname, u.userid, u.username, u.userlastname
         FROM "Group" g
         CROSS JOIN unnest(g."User") AS member_id
         LEFT JOIN "User" u ON u.userid = member_id::text
         WHERE g.subject = $1 
         AND g.groupname != $2
         AND g.deleted IS NULL
         AND member_id = ANY($3::text[])`,
        [subjectId, groupName, memberIds]
      );

      if (duplicateCheck.rows.length > 0) {
        const duplicates = duplicateCheck.rows.map(row => 
          `${row.username} ${row.userlastname} (${row.userid}) is already in group ${row.groupname}`
        ).join('\n');
        
        await client.query('ROLLBACK');
        return NextResponse.json({ 
          error: 'dupli stu found', 
          message: duplicates 
        }, { status: 400 });
      }
    }

    //check if group exist
    const existingGroup = await client.query(
      `SELECT groupid FROM "Group" 
       WHERE groupname = $1 AND subject = $2 AND deleted IS NULL`,
      [groupName, subjectId]
    );

    //if no member, delete the group
    if (memberIds.length === 0 && existingGroup.rows.length > 0) {
      await client.query(
        `DELETE FROM "Group" 
         WHERE groupid = $1`,
        [existingGroup.rows[0].groupid]
      );
    } else if (existingGroup.rows.length > 0) {
      //update group if it has members
      const updateResult = await client.query(
        `UPDATE "Group" 
         SET "User" = $1::character varying[],
             teacher = $2::character varying[],
             note = $3,
             projectname = $4,
             updated = CURRENT_TIMESTAMP
         WHERE groupid = $5`,
        [
          memberIds,
          group.teachers || [],
          group.note || null,
          group.projectName || null,
          existingGroup.rows[0].groupid
        ]
      );
    } else if (memberIds.length > 0) {
      
      const insertResult = await client.query(
        `INSERT INTO "Group" (
          groupname, 
          subject, 
          "User", 
          teacher, 
          note,
          projectname
        ) VALUES ($1, $2, $3::character varying[], $4::character varying[], $5, $6)
        RETURNING *`,
        [
          groupName,
          subjectId,
          memberIds,
          group.teachers || [],
          group.note || null,
          group.projectName || null 
        ]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving group:', error);
    return NextResponse.json({ 
      error: 'failed to save group',
    }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request: Request) {
  const { groupId, students } = await request.json();

  if (!groupId || !Array.isArray(students)) {
    return NextResponse.json({ error: 'have to use groupid and student' }, { status: 400 });
  }

  // Remove dashes and skip empty
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
      return NextResponse.json({ error: 'group not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('database error:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  } finally {
    client.release();
  }
}
