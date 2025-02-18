'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserGraduate, faBook, faUser, faFilter, faSearch } from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  id: string;
  name: string;
  lastName: string;
  email: string;
  userType: string[];
  track?: string;
  Subject_Available?: string[];
}

// Header component
const Header = ({ openSidebar }: { openSidebar: () => void }) => (
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
      </div>
    </div>
  </header>
);

// Sidebar component
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
          <FontAwesomeIcon icon={faUser} className="w-5 h-5 mr-3" />
          ผู้ใช้
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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/userManagement', { cache: 'no-store' });
        const data = await res.json();
        if (Array.isArray(data)) {
          // Filter out admin users
          setUsers(data.filter((user: User) => !user.userType.includes('admin')));
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const searchTerm = search.toLowerCase();
    const matchesSearch = (
      user.id.toLowerCase().includes(searchTerm) ||
      user.name.toLowerCase().includes(searchTerm) ||
      user.lastName.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
    const matchesUserType = userTypeFilter === 'all' || user.userType.includes(userTypeFilter);
    return matchesSearch && matchesUserType;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      <Header openSidebar={() => setIsSidebarOpen(true)} />
      
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* User Type Filter Buttons */}
                <div className="flex gap-2 order-2 sm:order-1">
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

                {/* Search */}
                <div className="flex gap-2 ml-auto order-1 sm:order-2">
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
                </div>
              </div>
            </div>

            {/* Users Table */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ประเภท
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.name} {user.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.userType.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
