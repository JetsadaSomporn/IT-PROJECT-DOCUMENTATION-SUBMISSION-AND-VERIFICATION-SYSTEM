'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faUserGraduate, faUsers, faSearch, faEdit, faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import ProjectForm from '../../../../components/ProjectFrom';
import { useAuth } from '../../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from 'react-modal';
import { signOut } from 'next-auth/react';

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


interface AdvisorSelection {
  advisor: number | null;  
  advisorOther: {
    advisor2?: number;  
  } | null;
}


interface GroupFormData {
  User: string[]; 
  note: string;
  teacher: number | null;
  teacherother: {
    secondaryAdvisor?: number;
  } | null;
}

interface TrackGroup {
  id: string;
  name: string;
  status: 'available' | 'taken';
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
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className="space-y-4">
        <Link href="/dashboard/admin/subjectManagement" 
          className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
          <FontAwesomeIcon icon={faBook} className="w-5 h-5 mr-3" />
          Subjects
        </Link>
        <Link href="/dashboard/admin/userManagement" 
          className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
          <FontAwesomeIcon icon={faUserGraduate} className="w-5 h-5 mr-3" />
          Users
        </Link>
        <Link href="/dashboard/admin/groupManagement" 
          className="flex items-center px-4 py-3 text-blue-600 bg-blue-50 rounded-xl">
          <FontAwesomeIcon icon={faUsers} className="w-5 h-5 mr-3" />
          Groups
        </Link>
      </nav>
    </div>
  </div>
);

const GroupEditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  onSave: (data: GroupFormData) => Promise<void>;
}> = ({ isOpen, onClose, group, onSave }) => {
  const [formData, setFormData] = useState<GroupFormData>({
    User: group?.User.map(user => user) || [],
    note: group?.note || '',
    teacher: group?.teacher ? Number(group.teacher[0]) : null,
    teacherother: group?.teacherother || null
  });

  const addStudent = () => {
    setFormData(prev => ({
      ...prev,
      User: [...prev.User, ''] 
    }));
  };

  const updateStudent = (index: number, studentId: string) => {
    const updatedUsers = [...formData.User];
    updatedUsers[index] = studentId; // Assign string directly
    setFormData({ ...formData, User: updatedUsers });
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <h2 className="text-xl font-semibold mb-4">Edit Group</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          onSave(formData);
        }}>
          <div className="space-y-4">
            {formData.User.map((userId, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => updateStudent(index, e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded"
                  placeholder="Student ID"
                />
               
              </div>
            ))}
            <button
              type="button"
              onClick={addStudent}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Add Student
            </button>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};


type TrackType = 'ALL' | 'BIT' | 'Web&Mobile' | 'Network';


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
                <span className="text-xl mb-1">
                  {track === 'ALL' }
                  {track === 'BIT'}
                  {track === 'Web&Mobile'}
                  {track === 'Network'}
                </span>
                <span>{track}</span>
                <span className="text-xs mt-1">
                  {track === 'ALL' ? `All Groups (${count})` : `${count} Groups`}
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


interface StudentInGroup {
  studentId: string;
  name: string;
  lastname: string;
  teacher: string;
  semester: string;
  track: string;
  note: string;
  groupName: string;
}

interface Student {
  userid: string;
  username: string;
  userlastname: string;
  email: string;
  track: string;
  note?: string;
}

interface Teacher {
  userid: string;
  username: string;
  userlastname: string;
  email: string;
}


const GroupManagement: React.FC = () => {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<TrackType>('BIT'); // Default to BIT instead of ALL
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [groupStudents, setGroupStudents] = useState<{ [key: string]: StudentInGroup[] }>({});
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<{[key: string]: string[]}>({});
  const [inputValue, setInputValue] = useState<{ [key: string]: string }>({});
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);

  
  const [students, setStudents] = useState<Array<{
    studentId: string;
    name: string;
    lastname: string;
    semester: string;
    track: string;  
    teacher: string;
    note: string;
    groupName?: string; 
  }>>([{
    studentId: '',
    name: '',
    lastname: '',
    semester: '',
    track: '', 
    teacher: '',
    note: ''
  }]);

  const fetchStudentData = async (id: string, index: number) => {
    const normalizedId = id.replace(/\D/g, '');
    console.log('Fetching with ID:', normalizedId);
  
    try {
      const response = await fetch(`/api/admin/groupManagement?action=get-student&id=${normalizedId}`);
      const data = await response.json();
      console.log('Student data:', data);
  
      if (data) {
        const updatedStudents = [...students];
        
        const studentTrack = data.track || selectedTrack;
  
       
        if (selectedTrack !== 'ALL' && studentTrack && studentTrack !== selectedTrack) {
          alert(`Error: This student belongs to ${studentTrack} track and cannot be added to ${selectedTrack} track.`);
          updatedStudents[index] = {
            ...updatedStudents[index],
            studentId: '',
            name: '',
            lastname: '',
            track: '',
            semester: ''
          };
        } else {
          updatedStudents[index] = {
            ...updatedStudents[index],
            studentId: normalizedId,
            name: data.username || '',
            lastname: data.userlastname || '',
            semester: selectedSubject ? 
              subjects.find(sub => sub.subjectid === selectedSubject)?.subject_semester || '' 
              : '',
            track: studentTrack,
            teacher: '',
            note: ''
          };
  
         
          const groupNumber = Math.floor(index / 2) + 1;
          const groupName = `${selectedTrack}${groupNumber.toString().padStart(2, '0')}`;
          //get group
          const existingGroup = groups.find(g => g.groupname === groupName) || {
            teacher: [],
            note: ''
          };
  
          // update member
          const groupMembers = updatedStudents
            .filter((_, idx) => Math.floor(idx / 2) === Math.floor(index / 2))
            .filter(s => s.studentId) // Only include students with IDs
            .map(s => ({
              studentId: s.studentId
            }));
  
          // save note and advisor
          await saveGroup({
            groupName,
            members: groupMembers,
            teachers: existingGroup.teacher || [], // Keep existing teachers
            note: existingGroup.note || '' // Keep existing note
          });
        }
        
        setStudents(updatedStudents);
      }
    } catch (err) {
      console.error('Error fetching student:', err);
    }
  };

 //for seperate group
  useEffect(() => {
    //defaul all
    setSelectedTrack('ALL');
    if (selectedSubject) {
      fetchGroups();
    }
  }, [selectedSubject]);


const filteredGroups = groups.filter(group => {
  if (selectedTrack === 'ALL') return true;
  return group.groupname.startsWith(selectedTrack);
});



// get group if it empty
const fetchGroups = async () => {
  if (!selectedSubject) {
    setGroups([]);
    return;
  }

  try {
    const response = await fetch(`/api/admin/groupManagement?subject=${selectedSubject}`, {
      credentials: 'include'
    });
    const data = await response.json();
    console.log("data that get",data);
    const groupsArray = Array.isArray(data) ? data : [];
    const filteredData = selectedTrack === 'ALL' 
      ? groupsArray 
      : groupsArray.filter((group: Group) => 
          group.students?.some(student => student?.track === selectedTrack)
        );
    
    setGroups(filteredData);
  } catch (error) {
    console.error('fail fetch group:', error);
    setGroups([]);
  }
};

  const handleEditGroup = async (data: GroupFormData) => {
    if (!editingGroup) return;
    try {
      const response = await fetch(`/api/admin/groupManagement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: editingGroup.groupid,
          students: data.User
        }),
      });
  
      if (!response.ok) throw new Error('Failed to update group');
      
      await fetchGroups(); 
      setEditingGroup(null);
    } catch (error) {
      console.error('fail updating group:', error);
      // alert('Failed to update group');
    }
  };



  const closeSidebar = () => setIsSidebarOpen(false);

  

  
const stuInput = async (value: string, groupName: string, memberIndex: number) => {
  setInputValue(prev => ({
    ...prev,
    [`${groupName}-${memberIndex}`]: value
  }));
  
  const normalizedValue = value.replace(/[^0-9]/g, '');
  if (normalizedValue.length === 10) {
    try {
      const response = await fetch(`/api/admin/groupManagement?action=get-student&id=${normalizedValue}`);
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'Failed to fetch student data');
        return;
      }

      const fetchedTrack = data.track || selectedTrack;
      const updatedStudent = {
        userid: normalizedValue,
        username: data.username,
        userlastname: data.userlastname,
        email: data.email,
        track: fetchedTrack,
        type: data.type
      };

      // Create a new group object if it doesn't exist
      const currentGroup = groups.find(g => g.groupname === groupName) || {
        groupid: Date.now(), // Temporary ID for new groups
        groupname: groupName,
        projectname: null,
        subject: selectedSubject || 0,
        teacher: [],
        teacherother: null,
        User: [],
        note: null,
        students: []
      } as Group;

      // Create a new array of students with the correct length
      let updatedStudents = [...(currentGroup.students || [])];
      while (updatedStudents.length <= memberIndex) {
        updatedStudents.push({} as User);
      }
      
      // Update the specific slot
      updatedStudents[memberIndex] = updatedStudent;

      // Update groups state with proper type checking
      setGroups(prev => {
        const existingGroupIndex = prev.findIndex(g => g.groupname === groupName);
        
        if (existingGroupIndex >= 0) {
          // Update existing group
          const newGroups = [...prev];
          newGroups[existingGroupIndex] = {
            ...newGroups[existingGroupIndex],
            students: updatedStudents
          };
          return newGroups;
        } else {
          // Add new group
          return [...prev, {
            ...currentGroup,
            students: updatedStudents
          }];
        }
      });

      // Save to backend with only valid students
      await saveGroup({
        groupName,
        members: updatedStudents.filter(s => s?.userid).map(s => ({
          studentId: s.userid
        })),
        teachers: currentGroup.teacher,
        note: currentGroup.note || ''
      });

    } catch (error) {
      console.error('Error processing student:', error);
      alert('Failed to add student. Please try again.');
    }
  }
};


const handleRemoveStudent = async (groupName: string, memberIndex: number) => {
  const currentGroup = groups.find(g => g.groupname === groupName);
  if (!currentGroup) return;

  try {
    const updatedMembers = [...(currentGroup.students || [])];
    updatedMembers[memberIndex] = {} as User; 

    const filteredMembers = updatedMembers
      .filter(member => member && member.userid)
      .map(member => ({ studentId: member.userid }));

    
    if (filteredMembers.length === 0) {
      setProjectTitles(prev => {
        const newTitles = { ...prev };
        delete newTitles[groupName];
        return newTitles;
      });
      setNoteTitles(prev => {
        const newNotes = { ...prev };
        delete newNotes[groupName];
        return newNotes;
      });
    }

    await saveGroup({
      groupName,
      members: filteredMembers,
      teachers: currentGroup.teacher || [],
      note: currentGroup.note || ''
    });

    setInputValue(prev => ({
      ...prev,
      [`${groupName}-${memberIndex}`]: ''
    }));

    // Update local state for only this group instead of refetching all groups.
    setGroups(prev => prev.map(g => {
      if (g.groupname === groupName) {
        return { ...g, students: updatedMembers };
      }
      return g;
    }));

    // Removed: await fetchGroups();
  } catch (error) {
    console.error('fail removing student:', error);
  }
};


const [projectTitles, setProjectTitles] = useState<{[key: string]: string}>({});
const [projectNameTimeout, setProjectNameTimeout] = useState<{[key: string]: NodeJS.Timeout}>({});

const ProjectNameEdit = async (groupName: string, projectName: string) => {
  // Update local state immediately 
  setProjectTitles(prev => ({
    ...prev,
    [groupName]: projectName
  }));

  // Clear existing timeout
  if (projectNameTimeout[groupName]) {
    clearTimeout(projectNameTimeout[groupName]);
  }

  const timeoutId = setTimeout(async () => {
    try {
      const groupToUpdate = groups.find(g => g.groupname === groupName);
      if (!groupToUpdate) return;

      // Update local state first
      setGroups(prev => prev.map(g => {
        if (g.groupname === groupName) {
          return {
            ...g,
            projectname: projectName
          };
        }
        return g;
      }));

      // Save to backend
      await saveGroup({
        groupName,
        members: groupToUpdate.students
          .filter(s => s && s.userid)
          .map(s => ({
            studentId: s.userid,
          })),
        teachers: groupToUpdate.teacher || [],
        note: groupToUpdate.note || '',
        projectName: projectName
      });

      setProjectTitles(prev => {
        const newState = { ...prev };
        delete newState[groupName];
        return newState;
      });

    } catch (error) {
      console.error('Failed to save project name:', error);
      // Revert to previous value on error
      setProjectTitles(prev => ({
        ...prev,
        [groupName]: groups.find(g => g.groupname === groupName)?.projectname || ''
      }));
    }
  }, 2000);

  setProjectNameTimeout(prev => ({
    ...prev,
    [groupName]: timeoutId
  }));
};


const [noteTitles, setNoteTitles] = useState<{[key: string]: string}>({});
const [noteTimeout, setNoteTimeout] = useState<{[key: string]: NodeJS.Timeout}>({});

const NoteEdit = async (groupName: string, note: string) => {
  setNoteTitles(prev => ({
    ...prev,
    [groupName]: note
  }));

  if (noteTimeout[groupName]) {
    clearTimeout(noteTimeout[groupName]);
  }

  const timeoutId = setTimeout(async () => {
    try {
      const groupToUpdate = groups.find(g => g.groupname === groupName);
      if (!groupToUpdate) return;

      await saveGroup({
        groupName,
        members: groupToUpdate.students.map(s => ({
          studentId: s.userid,
        })),
        teachers: groupToUpdate.teacher,
        note: note
      });

      await fetchGroups();
    } catch (error) {
      console.error('Error saving group note:', error);
    }
  }, 5000);

  setNoteTimeout(prev => ({
    ...prev,
    [groupName]: timeoutId
  }));
};

useEffect(() => {
  return () => {
    Object.values(noteTimeout).forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
  };
}, [noteTimeout]);

const showTrackInfo = () => {
  const currentSubject = subjects.find(sub => sub.subjectid === selectedSubject);
  const relevantGroups = selectedTrack === 'ALL' ? groups : filteredGroups;
  
  // Create all groups including empty slots
  let allGroups = selectedTrack === 'ALL'
    ? relevantGroups
    : [...relevantGroups];

  // Add empty slots only for non-ALL tracks
  if (selectedTrack !== 'ALL') {
    const emptySlots = createEmptyGroupSlots(selectedTrack);
    allGroups = [...allGroups, ...emptySlots];
  }

  // Sort groups by number
  allGroups.sort((a, b) => {
    const numA = parseInt(a.groupname.match(/\d+$/)?.[0] || '0');
    const numB = parseInt(b.groupname.match(/\d+$/)?.[0] || '0');
    return numA - numB;
  });

  // Remove duplicates
  const uniqueGroups = allGroups.filter((group, index, self) =>
    index === self.findIndex((g) => g.groupname === group.groupname)
  );

  // Count only groups with students
  const registeredGroupCount = selectedTrack === 'ALL'
    ? groups.filter(g => g.students?.some(s => s.userid)).length
    : groups.filter(g => 
        g.groupname.startsWith(selectedTrack) && 
        g.students?.some(s => s.userid)
      ).length;

  return (
    <div className="space-y-8">
      {/* Subject Header with Track Count */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {currentSubject?.subject_name} - Section {currentSubject?.section}
            </h1>
            <div className="flex space-x-6 text-sm text-gray-600">
              <span>Year {currentSubject?.subject_year}</span>
              <span>Semester {currentSubject?.subject_semester}</span>
            </div>
          </div>
          <div className="text-center px-6 py-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">{selectedTrack} Groups</p>
            <p className="text-3xl font-bold text-blue-600">{registeredGroupCount}</p>
          </div>
        </div>
      </div>

      {/* Groups Section */}
      <div className="space-y-6">
        {uniqueGroups.map((group) => (
          <div key={group.groupid || group.groupname} className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Group Name Row - Spans entire width */}
            <div className="bg-blue-600 px-6 py-3">
              <h3 className="text-xl font-semibold text-white">{group.groupname}</h3>
            </div>

        
            <div className="px-6 py-4 bg-gray-50 border-b">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700 min-w-[100px]">Project Title</label>
                <input
                  type="text"
                  value={projectTitles[group.groupname] ?? group.projectname ?? ''}
                  onChange={(e) => ProjectNameEdit(group.groupname, e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                  placeholder="Enter project title..."
                  disabled={selectedTrack === 'ALL'} 
                />
              </div>
            </div>

            {/* Nested Table for Members */}
            <div className="px-6 py-4">
              <table className="min-w-full">
                {/* Column Headers */}
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Track</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Advisor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Allow for flexible number of slots (1-3 members)
                    const maxSlots = 3;
                    const memberRows = group.students ? [...group.students] : [];
                    // Add empty slots up to maxSlots
                    while (memberRows.length < maxSlots) {
                      memberRows.push({} as any);
                    }
                    
                    return memberRows.map((student, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-4 py-2">{index + 1}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={student?.userid || inputValue[`${group.groupname}-${index}`] || ''}
                              onChange={(e) => stuInput(e.target.value, group.groupname, index)}
                              className="w-32 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Student ID"
                              maxLength={11}
                              disabled={selectedTrack === 'ALL'}
                            />
                            {(student?.userid || inputValue[`${group.groupname}-${index}`]) && (
                              <button
                                onClick={() => handleRemoveStudent(group.groupname, index)}
                                className="p-1 text-gray-400 hover:text-red-500"
                                title="Clear student"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">{student?.username} {student?.userlastname}</td>
                        <td className="px-4 py-2">{student?.track}</td>
                        {index === 0 && (
                          <>
                            <td rowSpan={maxSlots} className="px-4 py-2">
                              <AdvisorDropdown groupName={group.groupname} group={group} />
                            </td>
                            <td rowSpan={maxSlots} className="px-4 py-2">
                              <input
                                type="text"
                                value={noteTitles[group.groupname] ?? group.note ?? ''}
                                onChange={(e) => NoteEdit(group.groupname, e.target.value)}
                                className="w-full px-2 py-1 border rounded"
                                placeholder="Add note..."
                                disabled={selectedTrack === 'ALL'}
                              />
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


  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch('/api/admin/groupManagement?action=get-subjects', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('fail to fetch subjects');
        }

        const data = await response.json();
        console.log('Fetched subjects:', data); 
        setSubjects(data);
      } catch (error) {
        console.error('fail fetching subjects:', error);
      }
    };

    fetchSubjects();
  }, []); 

  useEffect(() => {
    const fetchSubjectsData = async () => {
      try {
        console.log('Fetching subjects...');
        const response = await fetch('/api/admin/groupManagement?action=get-subjects', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`fail to fetch subjects: ${response.status}`);
        }

        const data = await response.json();
        console.log('Subjects data:', data); // Debug log
        setSubjects(data || []);
      } catch (error) {
        console.error('fail fetching subjects:', error);
      }
    };

    fetchSubjectsData();
  }, []); 

  const saveGroup = async (groupData: {
      groupName: string;
      members: Array<{
        studentId: string;
      }>;
      teachers: string[];
      note?: string;
      projectName?: string; // Add this line
    }) => {
      if (!selectedSubject) return null;
    
      try {
        // Filter out empty member slots before saving
        const validMembers = groupData.members.filter(m => m.studentId && m.studentId.trim() !== '');

        const response = await fetch('/api/admin/groupManagement', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subjectId: selectedSubject,
            groups: [{
              ...groupData,
              members: validMembers.map(m => ({
                ...m,
                studentId: m.studentId.replace(/[^0-9]/g, '')
              }))
            }]
          })
        });
    
        if (!response.ok) throw new Error('Failed to save group');
        return response;
      } catch (error) {
        console.error('fail saving group:', error);
        throw error;
      }
    };

  
  useEffect(() => {
    fetch('/api/admin/groupManagement?action=get-teachers')
      .then(res => res.json())
      .then(data => setAllTeachers(data || []))
      .catch(err => console.error('Error fetching teachers:', err));
  }, []);

  function AdvisorDropdown({
    groupName,
    group
  }: {
    groupName: string;
    group: Group;
  }) {
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [selectedAdvisors, setSelectedAdvisors] = useState<string[]>(
      group.teacher || []
    );
  
    const handleTeacherSelection = async (teacherId: string) => {
      let newSelection = [...selectedAdvisors];
      
      if (newSelection.includes(teacherId)) {
        
        newSelection = newSelection.filter(id => id !== teacherId);
      } else {
    
        if (newSelection.length < 2) {
          newSelection.push(teacherId);
        } else {
          alert('max 2 advisor');
          return;
        }
      }
  
      setSelectedAdvisors(newSelection);
  
      await saveGroup({
        groupName,
        members: group.students.map(s => ({
          studentId: s.userid,
        })),
        teachers: newSelection,
        note: group.note || undefined
      });
    };
  
    return (
      <div className="relative">
       
        <button
          type="button"
          onClick={() => setIsDropdownVisible(!isDropdownVisible)}
          className="w-full px-4 py-2 text-base bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={selectedTrack === 'ALL'} // disable in ALL view
        >
          Select Advisors ({selectedAdvisors.length}/2)
        </button>
  
        {isDropdownVisible && (
          <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Select Advisors</h3>
                <button
                  onClick={() => setIsDropdownVisible(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>
  
              {/* Content area with scroll */}
              <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                {allTeachers.map(teacher => (
                  <label 
                    key={teacher.userid} 
                    className="flex items-center p-3 mb-2 hover:bg-gray-50 rounded-lg cursor-pointer border border-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAdvisors.includes(teacher.userid)}
                      onChange={() => handleTeacherSelection(teacher.userid)}
                      className="mr-4 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-base font-medium text-gray-900">
                        {teacher.username} {teacher.userlastname}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
  
              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => setIsDropdownVisible(false)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
  
        {/* Selected advisors display */}
        <div className="mt-2 space-y-2">
          {selectedAdvisors.map((teacherId) => {
            const teacher = allTeachers.find(t => t.userid === teacherId);
            return teacher ? (
              <div key={teacherId} className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg">
                <span className="text-sm font-medium text-blue-700">
                  {teacher.username} {teacher.userlastname}
                </span>
                <button
                  onClick={() => handleTeacherSelection(teacherId)}
                  className="text-blue-400 hover:text-blue-600"
                >
                  ✕
                </button>
              </div>
            ) : null;
          })}
        </div>
      </div>
    );
  }
  

const INITIAL_GROUP_COUNT = 20;

const createEmptyGroupSlots = (track: TrackType) => {
  if (track === 'ALL') return [];

  // Get existing groups for this track only
  const trackGroups = groups.filter(group => group.groupname.startsWith(track));

  // Get existing group numbers
  const existingNumbers = trackGroups
    .map(g => {
      const match = g.groupname.match(/\d+$/);
      return match ? parseInt(match[0]) : 0;
    })
    .filter(num => !isNaN(num));

  // Get highest existing group number
  const highestGroupNum = Math.max(0, ...existingNumbers);

  // Create array of needed numbers from 1 to INITIAL_GROUP_COUNT
  const neededNumbers = Array.from(
    { length: INITIAL_GROUP_COUNT }, 
    (_, i) => i + 1
  );

  // Find missing numbers in the sequence
  const missingNumbers = neededNumbers.filter(
    num => !existingNumbers.includes(num)
  );

  // If we have 19 or more filled groups, add the next number
  const filledGroups = trackGroups.filter(g => g.students?.some(s => s.userid));
  if (filledGroups.length >= 19) {
    const nextNumber = Math.max(highestGroupNum + 1, INITIAL_GROUP_COUNT + 1);
    missingNumbers.push(nextNumber);
  }

  // Create empty groups for all missing numbers
  return missingNumbers.map(num => ({
    groupid: -num,
    groupname: `${track}${String(num).padStart(2, '0')}`,
    projectname: null,
    subject: selectedSubject || 0,
    teacher: [],
    teacherother: null,
    User: [],
    note: null,
    students: []
  }));
};

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header openSidebar={() => setIsSidebarOpen(true)} />
      <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={closeSidebar} />
      <div className="pt-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="py-8">
          <select
            value={selectedSubject || ''}
            onChange={(e) => setSelectedSubject(Number(e.target.value))}
            className="block w-full p-2 border rounded mb-4"
          >
            <option value="">Select Subject</option>
            {subjects.map((subject) => (
              <option key={subject.subjectid} value={subject.subjectid}>
                {subject.subject_name} - Section {subject.section}
              </option>
            ))}
          </select>

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

export default GroupManagement;
