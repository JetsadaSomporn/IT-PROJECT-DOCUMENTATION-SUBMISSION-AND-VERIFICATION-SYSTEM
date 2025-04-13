// Import required dependencies
import NextAuth from "next-auth";
import type { NextAuthOptions, Account, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { DefaultSession } from 'next-auth';

// Define custom session types to include additional user information
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      type?: string[];
      userType?: string[];
      lastName?: string; // Added lastName
    } & DefaultSession['user']
  }
}

// Define custom JWT types to store additional user information in the token
declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    type?: string[];
    userType?: string[];
    lastName?: string; // Added lastName
  }
}

// Database connection setup
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Main NextAuth configuration
export const authOptions: NextAuthOptions = {
 
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials) {
          console.log('No credentials provided');
          throw new Error('Credentials are required');
        }

        const { email, password } = credentials;
        console.log('Attempting login for email:', email);
        
        const client = await pool.connect();
        try {
          
          const res = await client.query('SELECT * FROM "User" WHERE email = $1', [email]);
          console.log('Database response:', res.rows[0]);
          
          const user = res.rows[0];
          
          if (!user) {
            console.log('No user found with email:', email);
            throw new Error('Invalid email or password');
          }

          if (!user.password) {
            console.log('User has no password set:', email);
            throw new Error('Please use Google login or reset your password');
          }

          // Compare password
          const isValid = await bcrypt.compare(password, user.password);
          console.log('Password valid:', isValid);

          if (isValid) {
            // Return user object that will be saved in JWT
            return {
              id: user.userid,
              name: user.username,
              email: user.email,
              type: user.type || [],
              lastName: user.userlastname
            };
          }

          throw new Error('Invalid email or password');
        } catch (error) {
          console.error('Authorization error:', error);
          throw error;
        } finally {
          client.release();
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Configure Google OAuth settings
      authorization: {
        params: {
          prompt: "select_account consent", // Always show account selector
          access_type: "online",
          response_type: "code",
          scope: "openid email profile", // Request basic user info
        }
      }
    }),
  ],

  // Use JWT strategy for session handling
  session: {
    strategy: 'jwt' as const,
  },

  // Authentication callbacks
  callbacks: {
    // Called when user tries to sign in
    async signIn({ user, account, profile }: any) {
      // For credentials login, just check if user exists
      if (account?.provider === 'credentials') {
        return true;
      }
      
      if (account?.provider === 'google') {
        // Verify email domain is from KKU
        const email = user.email || '';
        const isValidDomain = email.endsWith('@kkumail.com') || 
                            email.endsWith('@kku.ac.th');
        
        if (!isValidDomain) {
          throw new Error('Please use your KKU email (@kkumail.com for students, @kku.ac.th for staff)');
        }

        // Set user type based on email domain
        const userType = email.endsWith('@kkumail.com') ? ['student'] : ['staff'];
        
        // Create or update user in database
        const client = await pool.connect();
        try {
          // Check if user exists
          const result = await client.query('SELECT * FROM "User" WHERE email = $1', [email]);
          
          if (result.rows.length === 0) {
            // Create new user if they don't exist
            await client.query(
              'INSERT INTO "User" (email, username, userlastname, type) VALUES ($1, $2, $3, $4)',
              [email, profile.name, profile.family_name || '', userType]
            );
          }
          return true;
        } finally {
          client.release();
        }
      }
      return false; // Only allow Google login
    },

    // Called whenever a JWT is created or updated
    async jwt({ token, user, account, profile }: any) {
      // Include user data in token on first sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.type = user.type || [];
        token.userType = user.type || [];
        token.lastName = user.lastName || '';
      }
      // Update token with user information from database
      if (account?.provider === 'google') {
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT * FROM "User" WHERE email = $1', [token.email]);
          if (result.rows[0]) {
            // Add user data to token
            token.id = result.rows[0].userid;
            token.type = result.rows[0].type;
            token.userType = result.rows[0].type;
            token.lastName = result.rows[0].userlastname;
          }
        } finally {
          client.release();
        }
      }
      return token;
    },

    // Called whenever a session is checked
    async session({ session, token }: { session: Session; token: JWT }) {
      // Add user information from token to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.type = (token.type as string[]) || [];
        session.user.userType = (token.userType as string[]) || [];
        session.user.lastName = token.lastName as string; // Added lastName to session
      }
      return session;
    }
  },

  // Custom pages configuration
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  // Enable debug mode for development
  debug: true, // Enable debug messages

  // Secret for JWT encryption
  secret: process.env.NEXTAUTH_SECRET,

  // Cookie configuration
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};

// Export NextAuth handler
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };