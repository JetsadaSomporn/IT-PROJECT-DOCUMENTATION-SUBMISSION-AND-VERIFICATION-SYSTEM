'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation'; 
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faUser, faUserGraduate } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../hooks/useAuth'; 
import SubjectCard from '../../../../components/SubjectCard'; 
import dynamic from 'next/dynamic';
import TabTransition from '../../../../components/TabTransition';
import { signOut } from 'next-auth/react';
import NotificationDropdown from '@/components/NotificationDropdown';

const TransitionLayout = dynamic(() => import('../../../../components/TransitionLayout'), {
  ssr: false
});

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

const SubjectManagement: React.FC = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const currentYear = new Date().getFullYear();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState({
    subject_name: '',
    section: 0,
    subject_semester: 1,
    subject_year: currentYear.toString(),
    group_data: {
      BIT: 0,
      Network: 0,
      Web: 0,
    },
  });
  
  // สร้าง array ปีการศึกษาสำหรับ dropdown (ปีปัจจุบัน +/- 5 ปี)
  const yearOptions = Array.from({ length: 11 }, (_, i) => 
    (currentYear - 5 + i).toString()
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout>();

  const fetchSubjects = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/subjectManagement', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'ไม่สามารถดึงข้อมูลรายวิชาได้');
      }
  
      const data = await response.json();
      setSubjects(data);
      
      if (Array.isArray(data)) {
        const uniqueYears = Array.from(new Set(data.map(subject => subject.subject_year)))
          .filter(Boolean)
          .sort();
        
        setAvailableYears(uniqueYears);
      }
    } catch (error: any) {
      if (error.message === 'Not authenticated') {
        router.push('/auth/login');
      }
    }
  }, [router]);

  useEffect(() => {
    if (!isLoading && user?.userType?.includes('admin')) {
      fetchSubjects();
    }
  }, [user, isLoading, fetchSubjects]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('group_data.')) {
      const groupField = name.split('.')[1];
      setNewSubject(prev => ({
        ...prev,
        group_data: {
          ...prev.group_data,
          [groupField]: Number(value)
        }
      }));
    } else {
      setNewSubject(prev => ({
        ...prev,
        [name]: name === 'section' || name === 'subject_semester' ? Number(value) : value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      alert('กรุณาเข้าสู่ระบบใหม่เพื่อดำเนินการต่อ');
      return;
    }

    const newSubjectData = {
      subject_name: newSubject.subject_name,
      section: newSubject.section,
      subject_semester: newSubject.subject_semester,
      subject_year: newSubject.subject_year,
      teachers: [user.id],
      group_data: newSubject.group_data,
    };

    try {
      const response = await fetch('/api/admin/subjectManagement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newSubjectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ไม่สามารถสร้างรายวิชาได้');
      }

      const addedSubject = await response.json();
      setSubjects(prev => [...prev, addedSubject]);
      setNewSubject({
        subject_name: '',
        section: 0,
        subject_semester: 1,
        subject_year: currentYear.toString(),
        group_data: {
          BIT: 0,
          Network: 0,
          Web: 0,
        }
      });
      setShowForm(false);
    } catch (error: any) {
      console.error('เกิดข้อผิดพลาดในการสร้างรายวิชา:', error);
      alert(`เพิ่มวิชาไม่ได้: ${error.message}`);
    }
  };

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

      const matchesSubject = subjectFilter
        ? subject.subject_name.toLowerCase().includes(subjectFilter.toLowerCase())
        : true;

      const matchesYear = !yearFilter || subject.subject_year === yearFilter;

      return matchesName && matchesSubject && matchesYear;
    });
  }, [subjects, debouncedSearchTerm, subjectFilter, yearFilter]);

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
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 24 24">
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

interface SidebarProps {
  isSidebarOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, closeSidebar }) => (
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
        <Link href="/dashboard/admin/subjectManagement" 
          className="flex items-center px-4 py-3 text-blue-600 bg-blue-50 rounded-xl">
          <FontAwesomeIcon icon={faBook} className="w-5 h-5 mr-3" />
          รายวิชา
        </Link>
        <Link href="/dashboard/admin/userManagement" 
          className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
          <FontAwesomeIcon icon={faUserGraduate} className="w-5 h-5 mr-3" />
          ผู้ใช้
        </Link>
        <Link href="/dashboard/admin/groupManagement" 
          className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
          <FontAwesomeIcon icon={faUser} className="w-5 h-5 mr-3" />
          กลุ่ม
        </Link>
      </nav>
    </div>
  </div>
);

  const closeSidebar = () => setIsSidebarOpen(false);

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
       <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={closeSidebar} />
        <Header openSidebar={() => setIsSidebarOpen(true)} />
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20"
            onClick={closeSidebar}
          />
        )}

      <main className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSubjects.map((subject) => (
              <Link 
                key={subject.subjectid}
                href={`/dashboard/admin/subjectDetailManagement/${subject.subjectid}`}
                className="group"
              >
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-sm overflow-hidden 
                              hover:shadow-md transition-shadow duration-200 border border-blue-100">
                  <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-400 p-6">
                    <h3 className="text-xl font-medium text-white">{subject.subject_name}</h3>
                    <p className="text-blue-100 text-sm mt-1">เซคชั่น {subject.section}</p>
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

          <button
            onClick={() => setShowForm(true)}
            className="fixed right-6 bottom-6 w-14 h-14 rounded-full bg-white text-blue-600 shadow-lg
                     border border-blue-100 hover:bg-blue-50 transition-colors duration-200 
                     flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden">
              <div className="bg-blue-600 p-6">
                <h2 className="text-2xl font-bold text-white">สร้างรายวิชาใหม่</h2>
                <p className="text-blue-100 mt-1">เพิ่มรายวิชาใหม่เข้าสู่โปรแกรมการศึกษา</p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ชื่อรายวิชา
                      </label>
                      <input
                        type="text"
                        name="subject_name"
                        value={newSubject.subject_name}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded border border-gray-300
                                 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                                 transition-colors"
                        placeholder="กรุณากรอกชื่อรายวิชา"
                      />
                    </div>
                  </div> 

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          เซคชั่น
                        </label>
                        <input
                          type="number"
                          name="section"
                          value={newSubject.section}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded border border-gray-300
                                   focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                                   transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ภาคเรียน
                        </label>
                        <select
                          name="subject_semester"
                          value={newSubject.subject_semester}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded border border-gray-300
                                   focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                                   transition-colors"
                        >
                          <option value={1}>ภาคเรียนที่ 1</option>
                          <option value={2}>ภาคเรียนที่ 2</option>
                          <option value={3}>ภาคฤดูร้อน</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ปีการศึกษา
                      </label>
                      <select
                        name="subject_year"
                        value={newSubject.subject_year}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded border border-gray-300
                                 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                                 transition-colors"
                      >
                        {yearOptions.map(year => (
                          <option key={year} value={year}>
                            {parseInt(year) + 543} 
                            {/* ({year}) */}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2 rounded border border-gray-300
                             text-gray-700 hover:bg-gray-50 
                             transition-colors text-sm font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded bg-blue-600 text-white 
                             hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    สร้างรายวิชา
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectManagement;
