'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faUser, faClipboard } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../hooks/useAuth';
import { signOut } from 'next-auth/react';
import NotificationDropdown from '@/components/NotificationDropdown';

const TeacherSubjectView: React.FC = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchSubjects = useCallback(async () => {
    try {
      console.log('Initiating fetch request to /api/teacher/subjectView?action=fetchsubject');
      const response = await fetch('/api/teacher/subjectView?action=fetchsubject', {
        credentials: 'include',
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(`Failed to fetch subjects: ${JSON.stringify(data)}`);
      }

      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user?.userType?.includes('teacher')) {
      fetchSubjects();
    }
  }, [user, isLoading, fetchSubjects]);

  // Header Component
  const Header = ({ openSidebar }: { openSidebar: () => void }) => (
    <header className="bg-white shadow-md fixed w-full z-10 border-b border-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button 
              onClick={openSidebar}
              className="p-2 rounded-full hover:bg-blue-50 transition-colors duration-200"
            >
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="ml-4 text-xl font-medium text-blue-600">IT Document Verification</span>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationDropdown />
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );

  // Sidebar Component
  const Sidebar = ({ isSidebarOpen, closeSidebar }: { isSidebarOpen: boolean, closeSidebar: () => void }) => (
    <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    bg-white w-64 border-r border-blue-100 transition-transform duration-300 ease-in-out z-30`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-blue-600">Menu</h2>
          <button onClick={closeSidebar} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="space-y-4">
          <Link href="/dashboard/teacher/subjectView" 
            className="flex items-center px-4 py-3 text-blue-600 bg-blue-50 rounded-xl">
            <FontAwesomeIcon icon={faBook} className="w-5 h-5 mr-3" />
            วิชาทั้งหมด
          </Link>

          <Link href="/dashboard/teacher/userView" 
            className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
            <FontAwesomeIcon icon={faUser} className="w-5 h-5 mr-3" />
            ผู้ใช้
          </Link>
        </nav>
      </div>
    </div>
  );

  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.subject_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = !yearFilter || subject.subject_year === yearFilter;
    return matchesSearch && matchesYear;
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      <Header openSidebar={() => setIsSidebarOpen(true)} />
      
      <main className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Search and Filters */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6 mb-6">
            <div className="flex flex-wrap gap-4">
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 border rounded px-3 py-2"
              />
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="">All Years</option>
                <option value="2023">2566</option>
                <option value="2024">2567</option>
              </select>
            </div>
          </div>

          {/* Subject Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSubjects.map((subject) => (
              <Link 
                key={subject.subjectid}
                href={`/dashboard/teacher/subjectDetailView/${subject.subjectid}`}
                className="group"
              >
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-sm overflow-hidden 
                              hover:shadow-md transition-shadow duration-200 border border-blue-100">
                  <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-400 p-6">
                    <h3 className="text-xl font-medium text-white">{subject.subject_name}</h3>
                    <p className="text-blue-100 text-sm mt-1">Section {subject.section}</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center text-sm text-blue-600">
                      <span>ภาคเรียน {subject.subject_semester}</span>
                      <span className="mx-2">•</span>
                      <span>ปีการศึกษา {parseInt(subject.subject_year, 10) + 543}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherSubjectView;
