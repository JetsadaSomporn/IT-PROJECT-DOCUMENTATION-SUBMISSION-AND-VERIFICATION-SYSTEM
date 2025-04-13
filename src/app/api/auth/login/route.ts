"use client";

interface User {
  userType: string[];
}


function handleUserType(user: User): Response {
  if (user.userType.includes('admin')) {
    return new Response(null, { status: 302, headers: { Location: '/dashboard/admin/subjectManagement' } });
  }
  return new Response(null, { status: 200 });
}

