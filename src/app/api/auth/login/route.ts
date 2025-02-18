"use client";

interface User {
  userType: string[]; // Changed to array of strings
}

// Optionally handle undefined or unexpected userType
function handleUserType(user: User): Response {
  if (user.userType.includes('admin')) {
    return new Response(null, { status: 302, headers: { Location: '/dashboard/admin/subjectManagement' } });
  }
  // Add handling for other user types if necessary
  return new Response(null, { status: 200 });
}

