'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import TabTransition from '@/components/TabTransition';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faUserGraduate, faUser } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../../hooks/useAuth';
import { signOut } from 'next-auth/react';
import Modal from 'react-modal';

interface Teacher {
  userid: string;
  username: string;
  userlastname: string;
  email?: string;
}

interface Student {
  student_id: string;
  username: string;
  userlastname: string;
  email: string;
}

interface Subject {
  subjectid: string;
  subject_name: string;
  subject_semester: number;
  subject_year: string;
  section: number;
  teachers: Teacher[];
  students: Student[];
  // ...other fields as needed...
}

interface Assignment {
  assignmentid: number;
  subject_available_id: number;
  validates: ValidateItem[];
  assignment_name: string;
  assignment_description: string;
  assignment_date: string;
  assignment_due_date: string;
  created: string;
  updated: string;
  deleted: string | null;
  section: number;
  subject_semester: number;
  subject_year: string;
  doc_verification?: { 
    [key: string]: {
      checked: boolean;
      details: {
        [key: string]: boolean;
      };
    };
  };
}

interface DocumentStatus {
  status: "pending" | "submitted" | "approved" | "rejected";
  submitted_at?: string;
  feedback?: string;
}

interface ValidateItem {
  student_id: string;
  status: "pending" | "submitted" | "approved" | "rejected";
  submitted_at: string;
  document_status: {
    [key: string]: DocumentStatus;
  };
  requirements: {
    [key: string]: {
      checked: boolean;
      details: {
        [key: string]: boolean;
      };
    };
  };
}

// Header component (copied from admin UI)
// Edit buttons have been removed so teachers cannot modify any data.
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

// Sidebar component (copied from admin UI)
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
          className="flex items-center px-4 py-3 text-blue-600 bg-blue-50 rounded-xl">
          <FontAwesomeIcon icon={faBook} className="w-5 h-5 mr-3" />
          วิชาทั้งหมด
        </Link>
        
        <Link href="/dashboard/teacher/userView" 
          className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
          ผู้ใช้
        </Link>
        
      </nav>
    </div>
  </div>
);

// AssignmentDetailModal (copied from admin UI with no editing controls)
const AssignmentDetailModal = ({ 
  isOpen, 
  onClose, 
  assignment 
}: { 
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'dashboard'>('details');
  if (!assignment) return null;
  const requirements = assignment.validates?.[0]?.requirements || {};

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-white"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
    >
      <div className="min-h-screen">
        <div className="h-[70px]"></div>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {assignment.assignment_name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  กำหนดส่ง {new Date(assignment.assignment_due_date).toLocaleDateString('th-TH')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Tabs (read-only) */}
            <div className="flex space-x-6 mt-6">
              {['รายละเอียด', 'การส่งงาน'].map((tab) => {
                const tabKey = tab === 'รายละเอียด' ? 'details' : 'dashboard';
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tabKey as 'details' | 'dashboard')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors
                      ${activeTab === tabKey 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {activeTab === 'details' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ชื่องาน</label>
                  <div className="p-3 bg-gray-50 rounded-lg text-gray-900">
                    {assignment.assignment_name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">กำหนดส่ง</label>
                  <div className="p-3 bg-gray-50 rounded-lg text-gray-900">
                    {new Date(assignment.assignment_due_date).toLocaleDateString('th-TH')}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">คำอธิบาย</label>
                  <div className="p-3 bg-gray-50 rounded-lg text-gray-900 min-h-[100px] whitespace-pre-wrap">
                    {assignment.assignment_description}
                  </div>
                </div>
              </div>
              <div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">ข้อกำหนดเอกสาร</h4>
                  <div className="space-y-4">
                    {Object.entries(requirements).map(([docName, docValue]) => (
                      <div key={docName} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded ${docValue.checked ? 'bg-blue-500' : 'bg-gray-200'}`} />
                          <span className="text-sm font-medium text-gray-900">{docName}</span>
                        </div>
                        {docValue.checked && (
                          <div className="mt-3 ml-7 space-y-2">
                            {Object.entries(docValue.details).map(([detail, isChecked]) => (
                              <div key={detail} className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded ${isChecked ? 'bg-green-500' : 'bg-gray-200'}`} />
                                <span className="text-sm text-gray-600">{detail}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border p-6">
                  <div className="text-sm text-gray-500">การส่งทั้งหมด</div>
                  <div className="text-3xl font-semibold mt-2">
                    {assignment?.validates?.length || 0}
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-100 p-6">
                  <div className="text-sm text-green-600">อนุมัติแล้ว</div>
                  <div className="text-3xl font-semibold text-green-700 mt-2">
                    {assignment?.validates?.filter(v => v.status === 'approved').length || 0}
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-6">
                  <div className="text-sm text-yellow-600">รอดำเนินการ</div>
                  <div className="text-3xl font-semibold text-yellow-700 mt-2">
                    {assignment?.validates?.filter(v => v.status === 'pending').length || 0}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">รหัสนักศึกษา</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่ส่ง</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignment?.validates?.map(validate => (
                      <tr key={validate.student_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{validate.student_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${validate.status === 'approved' ? 'bg-green-100 text-green-800' : 
                              validate.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}`}>
                            {validate.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {validate.submitted_at ? new Date(validate.submitted_at).toLocaleDateString('th-TH') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Only a "Close" button is provided */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            ปิด
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Main SubjectDetailView component (read-only, copied from admin UI)
const SubjectDetailView: React.FC = () => {
  const { subjectid } = useParams();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'teachers' | 'students' | 'tasks'>('teachers');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isAssignmentDetailOpen, setIsAssignmentDetailOpen] = useState(false);

  useEffect(() => {
    if (!subjectid) return;
    fetch(`/api/teacher/subjectDetailView/${subjectid}`)
      .then(res => res.json())
      .then(data => { setSubject(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [subjectid]);

  const fetchAssignments = useCallback(async () => {
    try {
      const response = await fetch(`/api/teacher/subjectDetailView/${subjectid}?action=assignments`);
      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }
      const data = await response.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setAssignments([]);
    }
  }, [subjectid]);

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchAssignments();
    }
  }, [activeTab, fetchAssignments]);

  if (loading) return <div className="pt-20 p-6">Loading...</div>;
  if (error) return <div className="pt-20 p-6">Error: {error}</div>;
  if (!subject) return <div className="pt-20 p-6">No subject data found.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      <Header openSidebar={() => setIsSidebarOpen(true)} />
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20" onClick={() => setIsSidebarOpen(false)} />
      )}
      <main className="pt-24 pb-16 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <nav className="mb-8 flex items-center space-x-2 text-sm">
            <Link href="/dashboard/teacher/subjectView"
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              รายวิชา
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">รายละเอียดวิชา</span>
          </nav>

          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden mb-8">
            <div className="p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {subject?.subject_name}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>กลุ่มเรียน {subject?.section}</span>
                    <span>•</span>
                    <span>ภาคการศึกษา {subject?.subject_semester}</span>
                    <span>•</span>
                    <span>ปีการศึกษา {subject?.subject_year}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="px-6 -mb-px flex space-x-4">
                {['นักศึกษา', 'อาจารย์', 'งาน'].map(tab => {
                  const tabKey = { 'นักศึกษา': 'students', 'อาจารย์': 'teachers', 'งาน': 'tasks' }[tab];
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tabKey as 'students' | 'teachers' | 'tasks')}
                      className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors
                        ${activeTab === tabKey ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              <TabTransition isVisible={activeTab === 'students'}>
                {/* ...existing students list UI... */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          รหัสนักศึกษา
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ชื่อ
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          อีเมล
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {subject?.students.map(student => (
                        <tr key={student.student_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.student_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {`${student.username} ${student.userlastname}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {student.email}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabTransition>

              <TabTransition isVisible={activeTab === 'teachers'}>
                {/* ...existing teachers list UI... */}
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {subject?.teachers?.map(teacher => (
                    <div key={teacher.userid} className="bg-gray-50 rounded-lg p-4">
                      <div className="font-medium">{`${teacher.username} ${teacher.userlastname}`}</div>
                      <div className="text-sm text-gray-500">{teacher.email}</div>
                    </div>
                  ))}
                </div>
              </TabTransition>

              <TabTransition isVisible={activeTab === 'tasks'}>
                {/* ...existing assignments UI from admin with assignment detail modal shown in read-only mode... */}
                <div className="space-y-4">
                  {assignments.map(assignment => (
                    <Link 
                      key={assignment.assignmentid}
                      href="#"
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setIsAssignmentDetailOpen(true);
                      }}
                      className="group"
                    >
                      <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 border border-blue-100">
                        <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-400 p-6">
                          <h3 className="text-xl font-medium text-white">{assignment.assignment_name}</h3>
                          <p className="text-blue-100 text-sm mt-1">Section {assignment.section}</p>
                        </div>
                        <div className="p-4">
                          <div className="flex items-center text-sm text-blue-600">
                            <span>ภาคเรียน {assignment.subject_semester}</span>
                            <span className="mx-2">•</span>
                            <span>ปีการศึกษา {assignment.subject_year}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </TabTransition>
            </div>
          </div>
        </div>
      </main>

      <AssignmentDetailModal
        isOpen={isAssignmentDetailOpen}
        onClose={() => setIsAssignmentDetailOpen(false)}
        assignment={selectedAssignment}
      />
    </div>
  );
};

export default SubjectDetailView;
