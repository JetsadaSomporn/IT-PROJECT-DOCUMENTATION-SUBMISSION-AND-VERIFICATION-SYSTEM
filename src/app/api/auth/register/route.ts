import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});


const adminEmails = ['waruwu@kku.ac.th', 'admin2@kku.ac.th','admin3@kku.ac.th'];

export async function POST(request: Request) {
  try {
    const { userid, username, lastname, email, password } = await request.json();

    // Validate required fields
    if (!userid || !username || !lastname || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine user type
    let userType: string[] = [];
    if (email.endsWith('@kku.ac.th')) {
      userType = adminEmails.includes(email) ? ['admin'] : ['teacher'];
    } else if (email.endsWith('@kkumail.com')) {
      userType = ['student'];
    } else {
      userType = ['']; 
    }

    // Connect to the database
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO "User" (userid, username, userlastname, email, password, type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userid, username, lastname, email, hashedPassword, userType]
      );

      return NextResponse.json(
        { message: 'User registered successfully', user: result.rows[0] },
        { status: 201 }
      );
    } catch (err: any) {
      console.error('Database error:', err);
      if (err.code === '23505') {
        return NextResponse.json(
          { error: 'User already exists' },
          { status: 409 }
        );
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
