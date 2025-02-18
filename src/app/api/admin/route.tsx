'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth'; // Example import

const SubjectManagement = () => {
    const router = useRouter();
    const { user, isLoading } = useAuth(); // Fetch user 

    useEffect(() => {
        if (isLoading) {
            
            return;
        }

        if (typeof user?.userType === 'string' && user.userType !== 'admin') {
            console.log('Non-admin user attempted access:', user); // Log unauthorized access
            
            router.push('/unauthorized');
        }
    }, [user, isLoading, router]);

    return (
        <div>
            <h1>Subject Management</h1>
          
        </div>
    );
};

export default SubjectManagement;
