'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faUserGraduate, faUsers, faSearch, faEdit, faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from 'react-modal';
import { signOut } from 'next-auth/react';
import NotificationDropdown from '@/components/NotificationDropdown';

// if (typeof window !== 'undefined') {
//   Modal.setAppElement('#root');
// }

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

type TrackType = 'ALL' | 'BIT' | 'Web&Mobile' | 'Network';

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
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 24 24">
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
                                 className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
                                 <FontAwesomeIcon icon={faUserGraduate} className="w-5 h-5 mr-3" />
                                 ผู้ใช้
                               </Link>
                     
                               <Link href="/dashboard/teacher/groupView" 
                              className="flex items-center px-4 py-3 text-blue-600 bg-blue-50 rounded-xl">
                               <FontAwesomeIcon icon={faUsers} className="w-5 h-5 mr-3" />
                               กลุ่ม
                             </Link>
      </nav>
    </div>
  </div>
);

const TrackBottomMenu: React.FC<{
  selectedTrack: TrackType;
  onTrackSelect: (track: TrackType) => void;
  filteredGroups: Group[];
  groups: Group[];
}> = ({ selectedTrack, onTrackSelect, filteredGroups, groups }) => {
  const getTrackCount = (track: TrackType) => {
    if (track === 'ALL') {
      return groups.filter(group => group.students?.length > 0).length;
    }
    
    return groups.filter(group => 
      group.groupname.startsWith(track) && 
      group.students?.length > 0
    ).length;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex justify-around">
          {(['BIT', 'Web&Mobile', 'Network', 'ALL'] as TrackType[]).map((track) => {
            const count = getTrackCount(track);
            
            return (
                <button
                key={track}
                onClick={() => onTrackSelect(track)}
                className={`px-6 py-3 rounded-lg text-sm font-medium flex flex-col items-center hover:bg-gray-50
                  ${selectedTrack === track ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
                >
                <span className="text-xs mt-1">
                  {track}
                </span>
                <span className="text-xs mt-1">
                  {track === 'ALL' ? `กลุ่มทั้งหมด (${count})` : `${count} กลุ่ม`}
                </span>
                </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface SubjectData {
  subjectid: number;
  subject_name: string;
  section: string;
  subject_semester: string;
  subject_year: string;
}

const GroupView: React.FC = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<TrackType>('ALL'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);

  const closeSidebar = () => setIsSidebarOpen(false);

  const filteredGroups = groups.filter(group => {
    if (selectedTrack === 'ALL') return true;
    return group.groupname.startsWith(selectedTrack);
  });

  const fetchGroups = async () => {
    if (!selectedSubject) {
      setGroups([]);
      return;
    }

    try {
      
      const response = await fetch(`/api/teacher/groupView?subject=${selectedSubject}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching groups:', errorData);
        setGroups([]);
        return;
      }
      
      const data = await response.json();
      console.log("Groups data:", data);
      
      const groupsArray = Array.isArray(data) ? data : [];
      setGroups(groupsArray);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      setGroups([]);
    }
  };

  useEffect(() => {
   
    if (typeof window !== 'undefined') {
      setSelectedTrack('ALL');
      if (selectedSubject) {
        fetchGroups();
      }
    }
  }, [selectedSubject]);

  useEffect(() => {
  
    if (typeof window !== 'undefined') {
      const fetchSubjects = async () => {
        try {
          const response = await fetch('/api/teacher/groupView?action=get-subjects', {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch subjects');
          }
          
          const data = await response.json();
          console.log('Fetched subjects:', data);
          setSubjects(data);
        } catch (error) {
          console.error('Failed fetching subjects:', error);
        }
      };
      
      const fetchTeachers = async () => {
        try {
          const response = await fetch('/api/teacher/groupView?action=get-teachers', {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch teachers');
          }
          
          const data = await response.json();
          console.log('Fetched teachers:', data);
          setAllTeachers(data);
        } catch (error) {
          console.error('Failed fetching teachers:', error);
        }
      };

      fetchSubjects();
      fetchTeachers();
    }
  }, []);

  const showTrackInfo = () => {
    const currentSubject = subjects.find(sub => sub.subjectid === selectedSubject);
    const relevantGroups = selectedTrack === 'ALL' ? groups : filteredGroups;

    
    relevantGroups.sort((a, b) => {
      const numA = parseInt(a.groupname.match(/\d+$/)?.[0] || '0');
      const numB = parseInt(b.groupname.match(/\d+$/)?.[0] || '0');
      return numA - numB;
    });

    const registeredGroupCount = selectedTrack === 'ALL'
      ? groups.filter(g => g.students?.some(s => s.userid)).length
      : groups.filter(g => 
          g.groupname.startsWith(selectedTrack) && 
          g.students?.some(s => s.userid)
        ).length;

    return (
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {currentSubject?.subject_name} - กลุ่ม {currentSubject?.section}
              </h1>
              <div className="flex space-x-6 text-sm text-gray-600">
                <span>ปีการศึกษา {currentSubject?.subject_year}</span>
                <span>ภาคเรียนที่ {currentSubject?.subject_semester}</span>
              </div>
            </div>
            <div className="text-center px-6 py-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">กลุ่ม {selectedTrack}</p>
              <p className="text-3xl font-bold text-blue-600">{registeredGroupCount}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {relevantGroups.map((group) => (
            <div key={group.groupid || group.groupname} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-blue-600 px-6 py-3">
                <h3 className="text-xl font-semibold text-white">{group.groupname}</h3>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-b">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700 min-w-[100px]">ชื่อโปรเจค</label>
                  <div className="flex-1 px-3 py-2 border rounded bg-gray-50">
                    {group.projectname || '-'}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">สมาชิก</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">รหัสนักศึกษา</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ชื่อ-นามสกุล</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">แทร็ค</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ที่ปรึกษา</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const maxSlots = 3;
                      const memberRows = group.students ? [...group.students] : [];
                      while (memberRows.length < maxSlots) {
                        memberRows.push({} as any);
                      }
                      
                      return memberRows.map((student, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="px-4 py-2">{index + 1}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-32 px-2 py-1 border rounded bg-gray-50">
                                {student?.userid || '-'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2">{student?.username} {student?.userlastname}</td>
                          <td className="px-4 py-2">{student?.track || '-'}</td>
                          {index === 0 && (
                            <>
                              <td rowSpan={maxSlots} className="px-4 py-2">
                                <div className="space-y-2">
                                  {group.teacher && group.teacher.length > 0 ? (
                                    group.teacher.map(teacherId => {
                                      const teacher = allTeachers.find(t => t.userid === teacherId);
                                      return teacher ? (
                                        <div key={teacher.userid} className="bg-blue-50 px-3 py-2 rounded-lg">
                                          <span className="text-sm font-medium text-blue-700">
                                            {teacher.username} {teacher.userlastname}
                                          </span>
                                        </div>
                                      ) : null;
                                    })
                                  ) : (
                                    <div className="text-gray-500">ยังไม่กำหนด</div>
                                  )}
                                </div>
                              </td>
                              <td rowSpan={maxSlots} className="px-4 py-2">
                                <div className="w-full px-2 py-1 border rounded bg-gray-50">
                                  {group.note || '-'}
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header openSidebar={() => setIsSidebarOpen(true)} />

      <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={closeSidebar} />
      <div id="root" className="pt-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <title> รายการกลุ่ม</title>
        <div className="py-8">
          <div className="flex items-center justify-between mb-4">
            <select
              value={selectedSubject || ''}
              onChange={(e) => setSelectedSubject(Number(e.target.value))}
              className="block w-full md:w-2/3 p-2 border rounded"
            >
              <option value="">เลือกรายวิชา</option>
              {subjects.map((subject) => (
                <option key={subject.subjectid} value={subject.subjectid}>
                  {subject.subject_name} - กลุ่มเรียน {subject.section}
                </option>
              ))}
            </select>
          </div>

          {selectedSubject && showTrackInfo()}
        </div>
      </div>
      <TrackBottomMenu
        selectedTrack={selectedTrack}
        onTrackSelect={setSelectedTrack}
        filteredGroups={filteredGroups}
        groups={groups}
      />
    </div>
  );
}

export default GroupView;
