import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});



export async function POST(request: Request) {
  try {
    const { username, lastname, email, password } = await request.json();

    if (!username || !lastname || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    
    const userid = uuidv4().replace(/-/g, '').substring(0, 10);
   
    const hashedPassword = await bcrypt.hash(password, 10);

    const client = await pool.connect();
    try {
      
      const userCountResult = await client.query('SELECT COUNT(*) FROM "User"');
      const isFirstUser = parseInt(userCountResult.rows[0].count) === 0;
      
      let userType: string[] = [];
      
      if (isFirstUser && email.endsWith('@kku.ac.th')) {
        userType = ['admin'];
      } else if (email.endsWith('@kku.ac.th')) {
        userType = ['admin'];
      } else if (email.endsWith('@kkumail.com')) {
        userType = ['student'];
      } else {
        userType = ['']; 
      }

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
        // If the auto-generated user ID happens to conflict, try again with a new one
        if (err.constraint.includes('userid')) {
          // Recursive call to try again with a new UUID
          return POST(request);
        }
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
