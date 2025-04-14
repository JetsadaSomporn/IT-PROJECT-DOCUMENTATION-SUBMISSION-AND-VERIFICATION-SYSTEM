'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBook, 
  faUserGraduate, 
  faFilter, 
  faSearch, 
  faUser,
  faBell,
  faEllipsisV
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'next-auth/react';
import NotificationDropdown from '@/components/NotificationDropdown';

interface User {
  id: string;
  name: string;
  lastName: string;
  email: string;
  userType: string[];
  type: string[];
  Subject_Available?: string[];
  status?: 'active' | 'inactive';
  lastActive?: string;
}

interface Subject {
  subjectid: string;
  subject_name: string;
  section: number;
}

const Header: React.FC<{ openSidebar: () => void }> = ({ openSidebar }) => {
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
              onClick={() => setShowLogout(!showLogout)}
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

const Sidebar: React.FC<{ isSidebarOpen: boolean; closeSidebar: () => void }> = ({ isSidebarOpen, closeSidebar }) => (
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
          className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
          <FontAwesomeIcon icon={faBook} className="w-5 h-5 mr-3" />
          รายวิชา
        </Link>
        <Link href="/dashboard/admin/userManagement" 
          className="flex items-center px-4 py-3 text-blue-600 bg-blue-50 rounded-xl">
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

const UserManagement: React.FC = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  function handleTypeChange(id: string, field: 'name' | 'lastName', value: string): void {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === id ? { ...user, [field]: value } : user
      )
    );
  }

  const handleUserTypeChange = async (userId: string, newType: 'student' | 'teacher' | 'admin') => {
    try {
      const response = await fetch('/api/admin/userManagement', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, newType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user type');
      }

      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? { ...user, userType: [newType] } : user
        )
      );
      setActiveDropdown(null);
      alert(`User type updated successfully to ${newType}`);
    } catch (error: any) {
      console.error('Error updating user type:', error);
      alert(`Error: ${error.message}`);
    }
  };

  useEffect(() => {
    if (isLoading) return;

    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/userManagement', { 
          cache: 'no-store',
          credentials: 'include' 
        });
        
        if (!res.ok) {
          console.error('Failed to fetch users:', res.statusText);
          setUsers([]);
          return;
        }
        
        const data = await res.json();
        
        if (Array.isArray(data)) {
          console.log("Loaded users sample:", data.slice(0, 2));
          setUsers(data);
        } else {
          console.error('รูปแบบข้อมูลไม่ถูกต้อง:', data);
          setUsers([]);
        }
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้:', error);
        setUsers([]);
      }
    };

    const fetchSubjects = async () => {
      try {
        const response = await fetch('/api/admin/subjects', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('ไม่สามารถดึงข้อมูลรายวิชา');
        }
        
        const data = await response.json();
        if (Array.isArray(data)) {
          setSubjects(data);
        }
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา:', error);
      }
    };

    if (user && user.userType?.includes('admin')) {
      fetchUsers();
      fetchSubjects();
    } else {
      console.log('การเข้าถึงถูกปฏิเศธ: ไม่ใช่ผู้ใช้ที่เป็นผู้ดูแลระบบ');
      router.push('/unauthorized');
    }
  }, [user, isLoading, router]);

  const filteredUsers = users.filter(user => {
    const searchTerm = search.toLowerCase();
    const matchesSearch = (
      user.id.toLowerCase().includes(searchTerm) ||
      user.name.toLowerCase().includes(searchTerm) ||
      user.lastName.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
    const matchesType = filters.type === 'all' || user.type.includes(filters.type);
    const matchesStatus = filters.status === 'all' || user.status === filters.status;
    const matchesUserType = userTypeFilter === 'all' || user.userType.includes(userTypeFilter);
    
    let matchesSubject = true;
    if (selectedSubject && selectedSubject.trim() !== '') {
      matchesSubject = false;
      
      if (user.Subject_Available && Array.isArray(user.Subject_Available)) {
        for (const userSubject of user.Subject_Available) {
          if (userSubject && userSubject.toLowerCase() === selectedSubject.toLowerCase()) {
            matchesSubject = true;
            break;
          }
        }
      }
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesUserType && matchesSubject;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (userTypeFilter !== 'all') {
      const aIsMatch = a.userType.includes(userTypeFilter);
      const bIsMatch = b.userType.includes(userTypeFilter);
      if (aIsMatch !== bIsMatch) {
        return aIsMatch ? -1 : 1;
      }
    }
    
    const nameA = `${a.name} ${a.lastName}`.toLowerCase();
    const nameB = `${b.name} ${b.lastName}`.toLowerCase();
    return sortConfig.direction === 'asc' 
      ? nameA.localeCompare(nameB)
      : nameB.localeCompare(nameA);
  });

  const TableHeader = () => (
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
        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
          จัดการ
        </th>
      </tr>
    </thead>
  );

  const TableRow: React.FC<{ user: User }> = ({ user }) => (
    <tr key={user.id} className="hover:bg-gray-50 relative">
      <td className="px-6 py-4 whitespace-nowrap">{user.id}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        {editingUser === user.id ? (
          <div className="flex gap-2">
            <input
              type="text"
              className="border border-gray-300 rounded-lg px-2 py-1 w-1/2"
              value={user.name}
              onChange={(e) => handleTypeChange(user.id, 'name', e.target.value)}
              placeholder="ชื่อ"
            />
            <input
              type="text"
              className="border border-gray-300 rounded-lg px-2 py-1 w-1/2"
              value={user.lastName}
              onChange={(e) => handleTypeChange(user.id, 'lastName', e.target.value)}
              placeholder="นามสกุล"
            />
          </div>
        ) : (
          <div className="flex items-center">
            <div className="text-sm font-medium text-gray-900">
              {user.name} {user.lastName} ({user.userType?.join(', ') || 'N/A'})
            </div>
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{user.email}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
        <div className="flex gap-2 justify-center items-center">
          <button
            onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
            className="text-blue-600 hover:text-blue-900 transition-colors duration-200 px-2 py-1 rounded hover:bg-blue-50"
            title={editingUser === user.id ? 'Save Name' : 'Edit Name'}
          >
            {editingUser === user.id ? 'บันทึกชื่อ' : 'แก้ไขชื่อ'}
          </button>
          <button
            onClick={() => {
              setUserToDelete(user);
              setIsDeleteModalOpen(true);
            }}
            className="text-red-600 hover:text-red-900 transition-colors duration-200 px-2 py-1 rounded hover:bg-red-50"
            title="Delete User"
          >
            ลบ
          </button>
          <div className="relative inline-block text-left">
            <button
              onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
              className="text-gray-500 hover:text-gray-700 transition-colors duration-200 px-2 py-1 rounded hover:bg-gray-100"
              title="Change User Type"
            >
              <FontAwesomeIcon icon={faEllipsisV} />
            </button>
            {activeDropdown === user.id && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  <span className="block px-4 py-2 text-xs text-gray-500 uppercase">Change Role To:</span>
                  {['student', 'teacher', 'admin'].map((type) => (
                    <button
                      key={type}
                      onClick={() => handleUserTypeChange(user.id, type as 'student' | 'teacher' | 'admin')}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        user.userType?.includes(type)
                          ? 'font-semibold text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      role="menuitem"
                      disabled={user.userType?.includes(type)}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );

  const activeFiltersCount = 
    (selectedSubject ? 1 : 0) + 
    (userTypeFilter !== 'all' ? 1 : 0);

  const handleDelete = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/userManagement', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถลบผู้ใช้ได้');
      }

      setUsers(users.filter(user => user.id !== userId));
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการลบผู้ใช้:', error);
      alert('ไม่สามารถลบผู้ใช้ได้');
    }
  };

  function closeSidebar(): void {
    setIsSidebarOpen(false);
  }

  const DeleteConfirmationModal = () => (
    <AnimatePresence>
      {isDeleteModalOpen && userToDelete && (
        <motion.div
          key="delete-modal" 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg shadow-xl w-full max-w-md m-4 p-6"
          >
            <h2 className="text-xl font-semibold mb-4">ยืนยันการลบ</h2>
            <p className="text-gray-600 mb-6">
              คุณแน่ใจหรือไม่ว่าต้องการลบ {userToDelete.name} {userToDelete.lastName}? การกระทำนี้ไม่สามารถยกเลิกได้
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleDelete(userToDelete.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                ลบ
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

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
      <main className="pt-24 pb-16 px-4">
      <title> จัดการผู้ใช้</title>
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
                  <button 
                    onClick={() => setUserTypeFilter('admin')} 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 
                      ${userTypeFilter === 'admin' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    <FontAwesomeIcon icon={faUser} className="mr-2" />
                    ผู้ดูแลระบบ
                  </button>
                </div>

                <div className="flex items-center gap-2 ml-auto order-1 sm:order-2">
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
                                onChange={(e) => setUserTypeFilter(e.target.value as 'all' | 'student' | 'teacher' | 'admin')}
                                className="w-full p-2 border border-gray-300 rounded-md"
                              >
                                <option value="all">ทั้งหมด</option>
                                <option value="student">นักศึกษา</option>
                                <option value="teacher">อาจารย์</option>
                                <option value="admin">ผู้ดูแลระบบ</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                วิชา
                              </label>
                              <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                              >
                                <option value="">ทุกวิชา</option>
                                {subjects.map(subject => (
                                  <option key={subject.subjectid} value={subject.subject_name}>
                                    {subject.subject_name} (กลุ่ม {subject.section})
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div className="flex justify-between pt-2 border-t border-gray-200">
                              <button 
                                onClick={() => {
                                  setFilters({ status: 'all', type: 'all' });
                                  setUserTypeFilter('all');
                                  setSelectedSubject('');
                                }}
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
                <TableHeader />
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedUsers.map(user => (
                    <TableRow key={user.id} user={user} />
                  ))}
                  {sortedUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        ไม่พบข้อมูลผู้ใช้ที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <DeleteConfirmationModal />
    </div>
  );
};

export default UserManagement;



