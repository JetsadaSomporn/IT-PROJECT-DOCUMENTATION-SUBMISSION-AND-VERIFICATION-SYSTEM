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
  faUser
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'next-auth/react';

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

interface HeaderProps {
  openSidebar: () => void;
}

interface SidebarProps {
  isSidebarOpen: boolean;
  closeSidebar: () => void;
}

// Add new interface for imported students
interface ImportedStudent {
  student_id: string;
  username: string;
  userlastname: string;
  email: string;
}

// Add PreviewModal component near other interfaces
interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: ImportedStudent[];
  onConfirm: () => void;
}



const Header: React.FC<HeaderProps> = ({ openSidebar }) => {
  const { user } = useAuth();

   const [showLogout, setShowLogout] = useState(false); // Added state for menu visibility
    
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
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, closeSidebar }) => (
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
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [search, setSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  // Add new state for imported students
  const [importedStudents, setImportedStudents] = useState<ImportedStudent[]>([]);
  // In the UserManagement component, add this state:
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');

  function handleTypeChange(id: string, field: 'name' | 'lastName', value: string): void {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === id ? { ...user, [field]: value } : user
      )
    );
  }
  useEffect(() => {
    if (isLoading) return;

    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/userManagement', { 
          cache: 'no-store',
          credentials: 'include' 
        });
        const data = await res.json();
        
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          console.error('Invalid response format:', data);
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      }
    };

    if (user && user.userType?.includes('admin')) {
      fetchUsers();
    } else {
      console.log('Access denied: Not an admin user');
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
    return matchesSearch && matchesType && matchesStatus && matchesUserType;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (userTypeFilter !== 'all') {
      // If filtering by type, matching type goes first
      const aIsMatch = a.userType.includes(userTypeFilter);
      const bIsMatch = b.userType.includes(userTypeFilter);
      if (aIsMatch !== bIsMatch) {
        return aIsMatch ? -1 : 1;
      }
    }
    
    // Then sort by name
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
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">{user.id}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        {editingUser === user.id ? (
          <div className="flex gap-2">
            <input
              type="text"
              className="border border-gray-300 rounded-lg px-2 py-1 w-1/2"
              value={user.name}
              onChange={(e) => handleTypeChange(user.id, 'name', e.target.value)}
              placeholder="First Name"
            />
            <input
              type="text"
              className="border border-gray-300 rounded-lg px-2 py-1 w-1/2"
              value={user.lastName}
              onChange={(e) => handleTypeChange(user.id, 'lastName', e.target.value)}
              placeholder="Last Name"
            />
          </div>
        ) : (
          <div className="flex items-center">
            <div className="text-sm font-medium text-gray-900">
              {user.name} {user.lastName}
            </div>
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{user.email}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
            className="text-blue-600 hover:text-blue-900 transition-colors duration-200 px-2 py-1 rounded hover:bg-blue-50"
          >
            {editingUser === user.id ? 'Save' : 'Edit'}
          </button>
          <button
            onClick={() => {
              setUserToDelete(user);
              setIsDeleteModalOpen(true);
            }}
            className="text-red-600 hover:text-red-900 transition-colors duration-200 px-2 py-1 rounded hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );

  const FilterModal = () => (
    <AnimatePresence>
      {filterOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setFilterOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md m-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">Filters</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-lg border-gray-200 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-lg border-gray-200 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div> */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                <select
                  value={userTypeFilter}
                  onChange={(e) => setUserTypeFilter(e.target.value as 'all' | 'student' | 'teacher' | 'admin')}
                  className="w-full rounded-lg border-gray-200 focus:ring-blue-500"
                >
                  <option value="all">All Users</option>
                  <option value="teacher">Teachers First</option>
                  <option value="student">Students First</option>
                  <option value="admin">Admins First</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setFilterOpen(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setFilters({ status: 'all', type: 'all' });
                  setFilterOpen(false);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Clear Filters
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const normalizeText = (text: string): string => {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9\u0E00-\u0E7F]/g, ''); // Keep only alphanumeric and Thai characters
  };
  
  const findHeaderRowIndex = (jsonData: any[][]): number => {
    console.log('Starting header row search...');
    
    
    const headerVariations = {
      'studentid': ['รหัสประจำตัว', 'รหัสนักศึกษา', 'studentid', 'รหัส', 'id'],
      'name': ['ชื่อ', 'name', 'firstname', 'ชื่อนักศึกษา'],
      'email': ['email', 'kkumail', 'mail', 'อีเมล']
    };
  
    // loop for get data from row
    for (let i = 0; i < Math.min(10, jsonData.length); i++) { // Only check first 10 rows
      const row = jsonData[i];
      console.log(`Checking row ${i}:`, row);
  
      // pass empty rows
      if (!row || row.length === 0) continue;
  
      
      const normalizedRow = row.map(cell => normalizeText(cell));
      console.log('Normalized row:', normalizedRow);
  
      const hasStudentId = headerVariations.studentid.some(variant => 
        normalizedRow.some(cell => normalizeText(cell).includes(normalizeText(variant)))
      );
      const hasName = headerVariations.name.some(variant => 
        normalizedRow.some(cell => normalizeText(cell).includes(normalizeText(variant)))
      );
      const hasEmail = headerVariations.email.some(variant => 
        normalizedRow.some(cell => normalizeText(cell).includes(normalizeText(variant)))
      );
  
      console.log('serach res:', { hasStudentId, hasName, hasEmail });
  
      if (hasStudentId && hasName) { // Make email optional
        console.log(`found header row at index ${i}`);
        return i;
      }
    }
  
    console.log('no header row found');
    return -1;
  };
  

  // Modify handleFileUpload to show preview modal


  
 
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
        throw new Error('Failed to delete user');
      }

      setUsers(users.filter(user => user.id !== userId));
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  function closeSidebar(): void {
    setIsSidebarOpen(false);
  }

  const DeleteConfirmationModal = () => (
    <AnimatePresence>
      {isDeleteModalOpen && userToDelete && (
        <motion.div
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
            <h2 className="text-xl font-semibold mb-4">Confirm Delete</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {userToDelete.name} {userToDelete.lastName}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(userToDelete.id)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Delete
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
        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* User Type Filter Buttons - Left Side */}
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

                {/* Search and Filter - Right Side */}
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
                  <button
                    onClick={() => setFilterOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center"
                  >
                    <FontAwesomeIcon icon={faFilter} className="mr-2" />
                    ตัวกรอง
                  </button>
                </div>
              </div>
            </div>

            {/* Rest of the table code */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <TableHeader />
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedUsers.map(user => (
                    <TableRow key={user.id} user={user} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <FilterModal />
     
      <DeleteConfirmationModal />
    </div>
  );
};

export default UserManagement;



