'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faUsers, faClipboard,faUserGraduate } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../hooks/useAuth';
import { signOut } from 'next-auth/react';
import NotificationDropdown from '@/components/NotificationDropdown';

const SearchInput = React.memo(({ 
  value, 
  onChange 
}: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="ค้นหารายวิชา..."
      value={value}
      onChange={onChange}
      className="border border-gray-200 rounded px-3 py-2 w-full focus:outline-none focus:ring-0 focus:border-gray-300"
      autoFocus
    />
  );
});

SearchInput.displayName = 'SearchInput';

const TeacherSubjectView: React.FC = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();

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
      
      if (Array.isArray(data)) {
        const uniqueYears = Array.from(new Set(data.map(subject => subject.subject_year)))
          .filter(Boolean)
          .sort();
        
        setAvailableYears(uniqueYears);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user?.userType?.includes('teacher')) {
      fetchSubjects();
    }
  }, [user, isLoading, fetchSubjects]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearchTerm(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  const filteredSubjects = React.useMemo(() => {
    if (!Array.isArray(subjects)) return [];
    return subjects.filter(subject => {
      if (!subject) return false;

      const matchesName = subject.subject_name
        ?.toLowerCase()
        .includes(debouncedSearchTerm.toLowerCase());

      const matchesYear = !yearFilter || subject.subject_year === yearFilter;

      return matchesName && matchesYear;
    });
  }, [subjects, debouncedSearchTerm, yearFilter]);

  
  const Header = ({ openSidebar }: { openSidebar: () => void }) => {
    const { user } = useAuth();
    const [showLogout, setShowLogout] = useState(false);
    
    const handleLogout = () => {
      signOut(); 
    };
  
    return (
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
            <div className="relative flex items-center space-x-4">
              <NotificationDropdown />
              <div className="text-sm text-gray-600">{user?.name || 'ผู้ใช้'}</div>
              <button
                onClick={() => setShowLogout(prev => !prev)}
                className="w-8 h-8 rounded-full bg-blue-600 text-white"
              >
                {user?.name?.[0] || 'ผ'}
              </button>
              {showLogout && (
                <div className="absolute right-0 mt-10 w-32 bg-white shadow-md border rounded">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  };

  // Sidebar Component
  const Sidebar = ({ isSidebarOpen, closeSidebar }: { isSidebarOpen: boolean, closeSidebar: () => void }) => (
    <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    bg-white w-64 border-r border-blue-100 transition-transform duration-300 ease-in-out z-30`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-blue-600">เมนู</h2>
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
                   <FontAwesomeIcon icon={faUserGraduate} className="w-5 h-5 mr-3" />
                   ผู้ใช้
                 </Link>
       
                 <Link href="/dashboard/teacher/groupView" 
                 className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
                 <FontAwesomeIcon icon={faUsers} className="w-5 h-5 mr-3" />
                 กลุ่ม
               </Link>
        </nav>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full border-b-4 border-blue-500 h-16 w-16 mb-4"></div>
        <p className="text-xl">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      <Header openSidebar={() => setIsSidebarOpen(true)} />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <main className="pt-20 pb-16 px-4">
      <title> รายวิชาทั้งหมด</title>
        <div className="max-w-7xl mx-auto">
          {/* Search and Filters */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex flex-wrap gap-4">
              <SearchInput value={searchTerm} onChange={handleSearch} />
            
              <select
                className="md:w-48 px-3 py-2 border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-0 focus:border-gray-300"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="">ทุกปีการศึกษา</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {parseInt(year) + 543}
                  </option>
                ))}
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
                    <p className="text-blue-100 text-sm mt-1">กลุ่มเรียน {subject.section}</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center text-sm text-blue-600">
                      <span>ภาคเรียน {subject.subject_semester}</span>
                      <span className="mx-2">•</span>
                      <span>ปีการศึกษา {parseInt(subject.subject_year) + 543}</span>
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
