'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../hooks/useAuth';
import { signOut } from 'next-auth/react';

// Reuse interfaces from groupManagement
interface User {
  userid: string;
  username: string;
  userlastname: string;
  email: string;
  track: string;
  type?: string[];
}

interface Group {
  groupid: number;
  groupname: string;
  projectname: string | null;
  subject: number;
  teacher: string[];
  teacherother: any;
  User: string[];
  note: string | null;
  students: User[];
  teachers?: User[];
}

interface SubjectData {
  subjectid: number;
  subject_name: string;
  section: string;
  subject_semester: string;
  subject_year: string;
}

// Simplified Header component for students
const Header = ({ openSidebar }: { openSidebar: () => void }) => {
  const { user } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  
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
            <div className="text-sm text-gray-600">{user?.name || 'ผู้ใช้'}</div>
            <button
              onClick={() => setShowLogout(!showLogout)}
              className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"
            >
              {user?.name?.[0] || 'ผ'}
            </button>
            {showLogout && (
              <div className="absolute right-0 mt-32 w-32 bg-white shadow-md border rounded">
                <button onClick={() => signOut()} className="block w-full text-left px-4 py-2 hover:bg-gray-100">
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

// Simplified Sidebar for students
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
        <Link href="/dashboard/student/showSubject" 
          className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
          <FontAwesomeIcon icon={faBook} className="w-5 h-5 mr-3" />
          วิชาทั้งหมด
        </Link>
        <Link href="/dashboard/student/entryGroup" 
          className="flex items-center px-4 py-3 text-blue-600 bg-blue-50 rounded-xl">
          <FontAwesomeIcon icon={faUsers} className="w-5 h-5 mr-3" />
          กลุ่มของฉัน
        </Link>
      </nav>
    </div>
  </div>
);

const EntryGroup: React.FC = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch('/api/student/entryGroup?action=get-subjects');
        if (!response.ok) throw new Error('Failed to fetch subjects');
        const data = await response.json();
        setSubjects(data);
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };

    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!selectedSubject || !user?.id) return;
      
      try {
        const response = await fetch(`/api/student/entryGroup?subject=${selectedSubject}&student=${user.id}`);
        if (!response.ok) throw new Error('Failed to fetch groups');
        const data = await response.json();
        setGroups(data);
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };

    if (selectedSubject) {
      fetchGroups();
    }
  }, [selectedSubject, user?.id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header openSidebar={() => setIsSidebarOpen(true)} />
      <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      
      <div className="pt-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="py-8">
          <select
            value={selectedSubject || ''}
            onChange={(e) => setSelectedSubject(Number(e.target.value))}
            className="block w-full p-2 border rounded mb-4"
          >
            <option value="">เลือกวิชา</option>
            {subjects.map((subject) => (
              <option key={subject.subjectid} value={subject.subjectid}>
                {subject.subject_name} - Section {subject.section}
              </option>
            ))}
          </select>

          {selectedSubject && groups.map((group) => (
            <div key={group.groupid} className="bg-white rounded-lg shadow-lg overflow-hidden mb-4">
              <div className="bg-blue-600 px-6 py-3">
                <h3 className="text-xl font-semibold text-white">{group.groupname}</h3>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700">Project Title</label>
                  <p className="mt-1 text-gray-900">{group.projectname || 'Not set'}</p>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700">Members</label>
                  <div className="mt-2 space-y-2">
                    {group.students?.map((student) => (
                      <div key={student.userid} className="flex items-center space-x-2">
                        <span className="text-gray-900">{student.username} {student.userlastname}</span>
                        <span className="text-gray-500">({student.userid})</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700">Advisors</label>
                  <div className="mt-2 space-y-2">
                    {group.teachers?.map((teacher) => (
                      <div key={teacher.userid} className="text-gray-900">
                        {teacher.username} {teacher.userlastname}
                      </div>
                    ))}
                  </div>
                </div>

                {group.note && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Note</label>
                    <p className="mt-1 text-gray-900">{group.note}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EntryGroup;
