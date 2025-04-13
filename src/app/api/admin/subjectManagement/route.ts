import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});




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

  // check data for new subj
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

