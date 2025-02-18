import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getServerSession } from 'next-auth';  // Update import
import { authOptions } from '../../auth/[...nextauth]/route'; // Changed to relative path

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  console.log('GET request received');
  
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
    
    if (!session || !session.user) {
      console.error('No valid session found');
      return NextResponse.json({ 
        error: 'Not authenticated',
        session: session 
      }, { status: 401 });
    }

    // Check for admin privileges using both type and userType
    const isAdmin = session.user.type?.includes('admin') || 
                   session.user.userType?.includes('admin');

    if (!isAdmin) {
      console.error('User is not admin:', session.user);
      return NextResponse.json({ 
        error: 'Not authorized',
        userType: session.user.type
      }, { status: 403 });
    }

    const url = new URL(request.url);
    const searchQuery = url.searchParams.get('search') || '';
    const yearFilter = url.searchParams.get('year') || '';

    console.log('Search params:', { searchQuery, yearFilter });

    let query = 'SELECT * FROM "Subject_Available" WHERE deleted IS NULL';
    const params: any[] = [];

    if (searchQuery) {
      params.push(`%${searchQuery}%`);
      query += ` AND LOWER(subject_name) LIKE LOWER($${params.length})`;
    }

    if (yearFilter) {
      params.push(yearFilter);
      query += ` AND subject_year = $${params.length}`;
    }

    query += ' ORDER BY created DESC';

    console.log('Executing query:', query, params);

    const client = await pool.connect();
    try {
      const res = await client.query(query, params);
      console.log(`Found ${res.rows.length} results`);
      return NextResponse.json(res.rows);
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