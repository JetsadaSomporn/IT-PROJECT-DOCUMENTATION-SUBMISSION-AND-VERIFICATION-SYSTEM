'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

const DashboardPage: React.FC = () => {
    const router = useRouter();
    const { user, isLoading } = useAuth(); // Fetch user and loading state

    useEffect(() => {
        if (isLoading) {
            // Optionally, show a loading indicator
            return;
        }

        console.log('Dashboard User:', user); // Verify user data

        if (!user) {
            // If user is not authenticated, redirect to unauthorized
            router.push('/unauthorized');
            return;
        }

        if (user.userType && user.userType.includes('admin')) {
            console.log('User is admin, redirecting to subject management...');
            router.push('/dashboard/admin/subjectManagement');


        } else if (user.userType && user.userType.includes('student')) {
            console.log('User is student, redirecting to student home...');
            router.push('/dashboard/student/showSubject'); // Example student route


        } else {
            console.log('User type unauthorized, redirecting to unauthorized...');
            router.push('/dashboard/teacher/subjectView'); 
        }
    }, [user, isLoading, router]);

    return (
        <div>
            {isLoading ? <p>Loading...</p> : <p>Redirecting...</p>}
        </div>
    );
};

export default DashboardPage;