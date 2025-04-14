'use client'; // Add this directive to make it a client component

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the login page
    router.push('/auth/login');
  }, [router]); // Dependency array ensures this runs once on mount

  // Optionally, render a loading state or null while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Redirecting to login...</p>
    </div>
  );
}
