'use client';

import React, { useEffect, useState } from 'react';

const StudentHome: React.FC = () => {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    // Get user data from localStorage or session
    const user = localStorage.getItem('user');
    if (user) {
      setUserData(JSON.parse(user));
      console.log('User Data:', JSON.parse(user));
    }
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Welcome to the Student Home Page</h1>
      {userData && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl mb-2">Account Information</h2>
          <pre className="bg-gray-100 p-2 rounded">
            {JSON.stringify(userData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default StudentHome;