'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation'; 
import Link from 'next/link'; // Import Link for navigation
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faUser, faUserGraduate } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../hooks/useAuth'; 
import SubjectCard from '../../../../components/SubjectCard'; 
import dynamic from 'next/dynamic';
import TabTransition from '../../../../components/TabTransition';
import { signOut } from 'next-auth/react';

const TransitionLayout = dynamic(() => import('../../../../components/TransitionLayout'), {
  ssr: false
});

const SubjectManagement: React.FC = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth(); // Use useAuth to get authenticated user
  const currentYear = new Date().getFullYear();  // Add this line to get current year
  const [subjects, setSubjects] = useState<any[]>([]); // Adjusted type
  const [showForm, setShowForm] = useState(false);
  const [newSubject, setNewSubject] = useState({
    subject_name: '',
    section: 0,
    subject_semester: 1,
    subject_year: currentYear.toString(), // Set default to current year
    group_data: {
      BIT: 0,
      Network: 0,
      Web: 0,
    },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState(''); // Add this line to define subjectFilter
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        throw new Error(error.error || 'Failed to fetch subjects');
      }
  
      const data = await response.json();
      setSubjects(data);
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
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

  //  form input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('group_data.')) {
      const groupField = name.split('.')[1];
      setNewSubject(prev => ({
        ...prev,
        group_data: {
          ...prev.group_data,
          [groupField]: Number(value) // Ensure the value is a number
        }
      }));
    } else {
      setNewSubject(prev => ({
        ...prev,
        [name]: name === 'section' || name === 'subject_semester' ? Number(value) : value // Convert to number
      }));
    }
  };

  // submit 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      console.log('Error: User not authenticated');
      alert('Please log in again to continue');
      return;
    }

    console.log('Current user:', user);

    const newSubjectData = {
      subject_name: newSubject.subject_name,
      section: newSubject.section,
      subject_semester: newSubject.subject_semester,
      subject_year: newSubject.subject_year,
      teachers: [user.id],
      group_data: newSubject.group_data,
    };

    console.log('Sending subject data:', newSubjectData);

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
        throw new Error(errorData.error || 'Failed to create subject');
      }

      const addedSubject = await response.json();
      console.log('Subject created successfully:', addedSubject);
      
      setSubjects(prev => [...prev, addedSubject]);
      setNewSubject({
        subject_name: '',
        section: 0,
        subject_semester: 1,
        subject_year: currentYear.toString(), // Set default to current year
        group_data: {
          BIT: 0,
          Network: 0,
          Web: 0,
        }
      });
      setShowForm(false);
    } catch (error: any) {
      console.error('Error creating subject:', error);
      alert(`Failed to add subject: ${error.message}`);
    }
  };

  // Make handleSearch a stable callback
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Fix SearchInput component to return a valid ReactNode
  const SearchInput = React.memo(() => (
    <input
      type="text"
      placeholder="Search subjects..."
      value={searchTerm}
      onChange={handleSearch}
      className="border rounded px-3 py-2 w-full"
    />
  ));

  // filtered subjects logic
  const filteredSubjects = React.useMemo(() => {
    if (!Array.isArray(subjects)) return [];
    return subjects.filter(subject => {
      if (!subject) return false;

      // Name filter
      const matchesName = subject.subject_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Subject filtr 
      const matchesSubject = subjectFilter
        ? subject.subject_name.toLowerCase().includes(subjectFilter.toLowerCase())
        : true;

     

      // Year filter
      const matchesYear = !yearFilter || subject.subject_year === yearFilter;

      return matchesName && matchesSubject && matchesYear;
    });
  }, [subjects, searchTerm, subjectFilter, yearFilter]);

 
// Export Header component
const Header = ({ openSidebar }: { openSidebar: () => void }) => {
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

// Export Sidebar component
interface SidebarProps {
  isSidebarOpen: boolean;
  closeSidebar: () => void;
}

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
          className="flex items-center px-4 py-3 text-blue-600 bg-blue-50 rounded-xl">
          <FontAwesomeIcon icon={faBook} className="w-5 h-5 mr-3" />
          Subjects
        </Link>
        <Link href="/dashboard/admin/userManagement" 
          className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
          <FontAwesomeIcon icon={faUserGraduate} className="w-5 h-5 mr-3" />
          Users
        </Link>
        <Link href="/dashboard/admin/groupManagement" 
          className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
          <FontAwesomeIcon icon={faUser} className="w-5 h-5 mr-3" />
          Group
        </Link>
      </nav>
    </div>
  </div>
);const closeSidebar = () => setIsSidebarOpen(false);

  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full border-b-4 border-blue-500 h-16 w-16 mb-4"></div>
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
       <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={closeSidebar} />
        <Header openSidebar={() => setIsSidebarOpen(true)} /> {/* Ensure Header has access to openSidebar */}
        {/* Backdrop for sidebar */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20"
            onClick={closeSidebar} // Ensure clicking backdrop closes sidebar
          />
        )}

      {/* Main Content */}
      <main className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Search and Filters */}
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-6 mb-6">
            <div className="flex flex-wrap gap-4">
              <SearchInput />
            
              <select
                className="md:w-48 px-3 py-2 border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="">All Years</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
              
              </select>
            </div>
          </div>
          {/* Subject Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSubjects.map((subject) => (
              <Link 
                key={subject.subjectid}
                href={`/dashboard/admin/subjectDetailManagement/${subject.subjectid}`}
                className="group"
              >
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-sm overflow-hidden 
                              hover:shadow-md transition-shadow duration-200 border border-blue-100">
                  {/* Subject Header */}
                  <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-400 p-6">
                    <h3 className="text-xl font-medium text-white">{subject.subject_name}</h3>
                    <p className="text-blue-100 text-sm mt-1">Section {subject.section}</p>
                  </div>
                  {/* Subject Details */}
                  <div className="p-4">
                    <div className="flex items-center text-sm text-blue-600">
                      <span>ภาคเรียน {subject.subject_semester}</span>
                      <span className="mx-2">•</span>
                      <span>ปีการศึกษา {subject.subject_year}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Floating Action Button */}
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
          {/* Simplified backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          
          <div className="relative min-h-screen flex items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl overflow-hidden">
              {/* Form Header */}
              <div className="bg-blue-600 p-6">
                <h2 className="text-2xl font-bold text-white">Create New Subject</h2>
                <p className="text-blue-100 mt-1">Add a new subject to your educational program</p>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject Name
                      </label>
                      <input
                        type="text"
                        name="subject_name"
                        value={newSubject.subject_name}
                        onChange={handleChange}
                        className="w-full px-4 py-2 rounded border border-gray-300
                                 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                                 transition-colors"
                        placeholder="Enter subject name"
                      />
                    </div>
                  </div> 

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Section
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
                          Semester
                        </label>
                        <select
                          name="subject_semester"
                          value={newSubject.subject_semester}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded border border-gray-300
                                   focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                                   transition-colors"
                        >
                          <option value={1}>Semester 1</option>
                          <option value={2}>Semester 2</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        name="subject_year"
                        value={currentYear}
                        readOnly
                        className="w-full px-4 py-2 rounded border border-gray-300
                                 bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                    </div>

                    
                    {/* <div>
                      <label className="block text-sm font-medium text-gray-700 mb-4">
                        Track
                      </label>
                      <div className="grid grid-cols-1 gap-4">
                        {['BIT', 'Network', 'Web'].map((track) => (
                          <div key={track} className="flex items-center space-x-4">
                            <span className="w-20 text-sm text-gray-600">{track}</span>
                            <input
                              type="number"
                              name={`group_data.${track}`}
                              value={newSubject.group_data[track as keyof typeof newSubject.group_data]}
                              onChange={handleChange}
                              className="flex-1 px-4 py-2 rounded border border-gray-300
                                       focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                                       transition-colors"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    </div> */}

                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2 rounded border border-gray-300
                             text-gray-700 hover:bg-gray-50 
                             transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded bg-blue-600 text-white 
                             hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Create Subject
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
