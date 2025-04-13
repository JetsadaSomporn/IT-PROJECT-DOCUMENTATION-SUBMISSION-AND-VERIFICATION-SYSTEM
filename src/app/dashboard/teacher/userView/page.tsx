'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {  faBook, faUsers, faClipboard, faUserGraduate, faSearch, faFilter, faUser  } from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { signOut } from 'next-auth/react';
import NotificationDropdown from '@/components/NotificationDropdown';

interface User {
  id: string;
  name: string;
  lastName: string;
  email: string;
  userType: string[];
  track?: string;
  Subject_Available?: string[];
}

const Header = ({ openSidebar }: { openSidebar: () => void }) => {
  const { user } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const handleLogout = () => signOut();

  return (
    <header className="bg-white shadow-md fixed w-full z-10 border-b border-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button onClick={openSidebar} className="p-2 rounded-full hover:bg-blue-50 transition-colors duration-200">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="ml-4 text-xl font-medium text-blue-600">IT Document Verification</span>
          </div>
          <div className="relative flex items-center space-x-4">
            <NotificationDropdown />
            <div className="text-sm text-gray-600">{user?.name || 'ผู้ใช้'}</div>
            <button onClick={() => setShowLogout(prev => !prev)} className="w-8 h-8 rounded-full bg-blue-600 text-white">
              {user?.name?.[0] || 'ผ'}
            </button>
            {showLogout && (
              <div className="absolute right-0 mt-10 w-32 bg-white shadow-md border rounded">
                <button onClick={handleLogout} className="block w-full text-left px-4 py-2 hover:bg-gray-100">
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

const Sidebar = ({ isSidebarOpen, closeSidebar }: { isSidebarOpen: boolean; closeSidebar: () => void }) => (
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
                    className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
                   <FontAwesomeIcon icon={faBook} className="w-5 h-5 mr-3" />
                   วิชาทั้งหมด
                 </Link>
       
                 <Link href="/dashboard/teacher/userView" 
                 
                     className="flex items-center px-4 py-3 text-blue-600 bg-blue-50 rounded-xl">
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

export default function UserView() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchUsersAndSubjects = async () => {
      try {
       
        const subjectRes = await fetch('/api/teacher/subjects', { 
          cache: 'no-store',
          credentials: 'include' 
        });
        
        if (!subjectRes.ok) {
          const text = await subjectRes.text();
          console.error('Failed to fetch subjects:', subjectRes.status, text.substring(0, 200));
          setAvailableSubjects([]);
        } else {
          const subjectData = await subjectRes.json();
          
          if (Array.isArray(subjectData)) {
            // console.log("Available subjects:", subjectData);
            setAvailableSubjects(subjectData.map(s => s.subject_name).filter(Boolean));
          } else {
            console.error('Expected subjects array but got:', subjectData);
            setAvailableSubjects([]);
          }
        }

        const userRes = await fetch('/api/teacher/userView', { 
          cache: 'no-store',
          credentials: 'include'
        });
        
        if (!userRes.ok) {
          const text = await userRes.text();
          console.error('Failed to fetch users:', userRes.status, text.substring(0, 200));
          setUsers([]);
        } else {
          const userData = await userRes.json();
          
          if (Array.isArray(userData)) {
            const filteredUsers = userData.filter((user: User) => 
              user && user.userType && !user.userType.includes('admin')
            );
            setUsers(filteredUsers);
          } else {
            console.error('Expected users array but got:', userData);
            setUsers([]);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setUsers([]);
        setAvailableSubjects([]);
      }
    };
    
    fetchUsersAndSubjects();
  }, []);

  const handleSubjectFilterChange = (value: string) => {
    setSubjectFilter(value);
    // Removed the problematic debug API call that was causing a 404 error
  };

  const filteredUsers = users.filter(user => {
    const searchTerm = search.toLowerCase();
    const matchesSearch = (
      user.id.toLowerCase().includes(searchTerm) ||
      user.name.toLowerCase().includes(searchTerm) ||
      user.lastName.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
    const matchesUserType = userTypeFilter === 'all' || user.userType.includes(userTypeFilter);
    
  
    let matchesSubject = true;
    if (subjectFilter && subjectFilter.trim() !== '') {
      matchesSubject = false;
      
      if (user.Subject_Available && Array.isArray(user.Subject_Available) && user.Subject_Available.length > 0) {
      
        for (const userSubject of user.Subject_Available) {
          if (userSubject && userSubject.toLowerCase() === subjectFilter.toLowerCase()) {
            matchesSubject = true;
            break;
          }
        }
      }
    }
    
    return matchesSearch && matchesUserType && matchesSubject;
  });

  const resetFilters = () => {
    setUserTypeFilter('all');
    setSubjectFilter('');
    setSearch('');
  };

  const activeFiltersCount = 
    (subjectFilter ? 1 : 0) + 
    (userTypeFilter !== 'all' ? 1 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      <Header openSidebar={() => setIsSidebarOpen(true)} />
      
      <main className="pt-24 pb-16 px-4">
      <title> ผู้ใช้งานในระบบ </title>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                
                <div className="flex flex-wrap gap-2 order-2 sm:order-1">
                  <button 
                    onClick={() => setUserTypeFilter('all')} 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 
                      ${userTypeFilter === 'all' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <FontAwesomeIcon icon={faUser} className="mr-2" />
                    ทั้งหมด
                  </button>
                  <button 
                    onClick={() => setUserTypeFilter('student')} 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 
                      ${userTypeFilter === 'student' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <FontAwesomeIcon icon={faUserGraduate} className="mr-2" />
                    นักศึกษา
                  </button>
                  <button 
                    onClick={() => setUserTypeFilter('teacher')} 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 
                      ${userTypeFilter === 'teacher' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <FontAwesomeIcon icon={faBook} className="mr-2" />
                    อาจารย์
                  </button>
                </div>

             
                <div className="flex items-center gap-2 ml-auto order-1 sm:order-2">
                  {/* Search */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ค้นหาผู้ใช้..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <FontAwesomeIcon 
                      icon={faSearch} 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                  </div>
               
                  <div className="relative">
                    <button 
                      onClick={() => setFilterOpen(!filterOpen)} 
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 
                        ${activeFiltersCount > 0 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      <FontAwesomeIcon icon={faFilter} className="mr-2" />
                      ตัวกรอง {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                    </button>
                    
                    
                    <AnimatePresence>
                      {filterOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg z-20 p-4"
                        >
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                ประเภทผู้ใช้
                              </label>
                              <select
                                value={userTypeFilter}
                                onChange={(e) => setUserTypeFilter(e.target.value as 'all' | 'student' | 'teacher')}
                                className="w-full p-2 border border-gray-300 rounded-md"
                              >
                                <option value="all">ทั้งหมด</option>
                                <option value="student">นักศึกษา</option>
                                <option value="teacher">อาจารย์</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                วิชา
                              </label>
                              <select
                                value={subjectFilter}
                                onChange={(e) => handleSubjectFilterChange(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                              >
                                <option value="">ทุกวิชา</option>
                                {availableSubjects.map(subject => (
                                  <option key={subject} value={subject}>
                                    {subject}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="flex justify-between pt-2 border-t border-gray-200">
                              <button 
                                onClick={resetFilters}
                                className="text-sm text-gray-600 hover:text-gray-900"
                              >
                                รีเซ็ตตัวกรอง
                              </button>
                              <button 
                                onClick={() => setFilterOpen(false)}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md"
                              >
                                เสร็จสิ้น
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

       
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      รหัสผู้ใช้
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ชื่อ - นามสกุล
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      อีเมล
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                        ไม่พบข้อมูลผู้ใช้
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.name} {user.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
