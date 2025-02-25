import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper function to write logs
const writeToLog = async (data: any) => {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)){
    fs.mkdirSync(logDir);
  }
  const logPath = path.join(logDir, 'database_state.txt');
  
  // Convert data to formatted text
  const text = Object.entries(data.data).map(([tableName, rows]) => {
    return `=== ${tableName} ===\n\n${
      Array.isArray(rows) 
        ? rows.map(row => JSON.stringify(row, null, 2)).join('\n\n')
        : 'No data'
    }\n\n`;
  }).join('\n');

  const header = `Database State as of ${data.timestamp}\n\n`;
  
  await fs.promises.writeFile(logPath, header + text);
};

export async function GET(request: Request) {
  console.log('GET request received');
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const isAdmin = session.user.type?.includes('admin') || 
                   session.user.userType?.includes('admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const client = await pool.connect();
    try {
      // Combined database state object
      const databaseState = {
        timestamp: new Date().toISOString(),
        data: {} as { [key: string]: any[] }
      };

      // Fetch data from all tables
      const tables = [
        'Subject_Available',
        'Assignment',
        'Assignment_Sent', 
        'Final_PDF',
        'Group',
        'User'
      ];

      // Fetch all tables data
      for (const table of tables) {
        const result = await client.query(`
          SELECT * FROM "${table}" 
          WHERE deleted IS NULL
        `);
        databaseState.data[table] = result.rows;
      }

      // Write as text file
      await writeToLog(databaseState);

      // Return Subject_Available data for the frontend
      return NextResponse.json(databaseState.data['Subject_Available']);

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: 'Operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle requests to add a new subject
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.userType?.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { subject_name, section, subject_semester, subject_year, teachers, group_data } = body;

  // check ddata for new subj
    if (!subject_name?.trim()) {
      return NextResponse.json({ error: 'Subject name is required' }, { status: 400 });
    }

    if (typeof section !== 'number' || section < 0) {
      return NextResponse.json({ error: 'Invalid section number' }, { status: 400 });
    }

    if (typeof subject_semester !== 'number' || ![1, 2].includes(subject_semester)) {
      return NextResponse.json({ error: 'Invalid semester' }, { status: 400 });
    }

    if (!subject_year?.trim()) {
      return NextResponse.json({ error: 'Subject year is required' }, { status: 400 });
    }

    if (!Array.isArray(teachers) || teachers.length === 0) {
      return NextResponse.json({ error: 'At least one teacher is required' }, { status: 400 });
    }

    if (!group_data || typeof group_data !== 'object') {
      return NextResponse.json({ error: 'Invalid group data' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO "Subject_Available" 
        (subject_name, section, subject_semester, subject_year, teachers, group_data) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *`,
        [subject_name, section, subject_semester, subject_year, JSON.stringify(teachers), JSON.stringify(group_data)]
      );
      
      return NextResponse.json(res.rows[0], { status: 201 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in POST /api/admin/subjectManagement:', error);
    return NextResponse.json({ 
      error: 'Failed to create subject',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

interface NewSubjectData {
  subject_name: string;
  section: number;
  subject_semester: number;
  subject_year: string;
  teachers: number[];
  group_data: {
    BIT: number;
    Network: number;
    Web: number;
  };
}