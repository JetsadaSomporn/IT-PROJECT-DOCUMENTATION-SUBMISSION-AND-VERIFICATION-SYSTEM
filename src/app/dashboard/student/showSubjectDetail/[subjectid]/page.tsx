'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faUsers } from '@fortawesome/free-solid-svg-icons';
import Modal from 'react-modal';
import { useAuth } from '../../../../hooks/useAuth';
import { signOut } from 'next-auth/react';

// Add these interfaces at the top of the file
interface Teacher {
  userid: string;
  username: string;
  userlastname: string;
  email?: string;
}

interface Subject {
  subjectid: string;
  subject_name: string;
  subject_semester: string;
  subject_year: string;
  section: string;
  teachers: Teacher[];
}

interface Assignment {
  assignmentid: number;
  assignment_name: string;
  assignment_description: string;
  assignment_due_date: string;
  subject_available_id: number;
  status?: 'pending' | 'submitted' | 'approved' | 'rejected';
  submitted_at?: string;
  requirements?: {
    [key: string]: {
      checked: boolean;
      details: {
        [key: string]: boolean;
      };
    };
  };
  document_status?: {
    [key: string]: {
      status: string;
      submitted_at?: string;
    };
  };
}

const AssignmentSubmissionModal = ({ 
  isOpen, 
  onClose, 
  assignment,
  onSubmit 
}: { 
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  onSubmit: (files: File[], requirements: any) => Promise<void>;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [requirements, setRequirements] = useState<any>({});
  const [dragActive, setDragActive] = useState<boolean>(false);

  useEffect(() => {
    if (assignment?.requirements) {
      setRequirements(assignment.requirements);
    }
  }, [assignment]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
    >
      <div className="min-h-screen px-4 text-center">
        <div className="inline-block w-full max-w-3xl my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-gray-900">
                Submit Assignment
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {assignment?.assignment_name}
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
          
            <div 
              className={`mt-4 p-6 border-2 border-dashed rounded-lg text-center
                ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                ${files.length > 0 ? 'pb-2' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.zip,.rar,.txt,.ppt,.pptx"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                Choose files
              </label>
              <p className="mt-2 text-sm text-gray-500">
                or drag and drop files here
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Supported files: PDF, DOC, DOCX, ZIP, RAR, TXT, PPT, PPTX
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <ul className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-2 text-sm text-gray-700">{file.name}</span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Requirements Checklist */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Requirements Checklist</h4>
              <div className="space-y-3">
                {Object.entries(requirements).map(([key, value]: [string, any]) => (
                  <div key={key} className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={value.checked}
                        onChange={(e) => {
                          setRequirements({
                            ...requirements,
                            [key]: {
                              ...value,
                              checked: e.target.checked
                            }
                          });
                        }}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">{key}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => onSubmit(files, requirements)}
                disabled={files.length === 0}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md
                  ${files.length === 0 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Turn in
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Add Sidebar component before Header
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
          className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
          <FontAwesomeIcon icon={faUsers} className="w-5 h-5 mr-3" />
          กลุ่ม
        </Link>
      </nav>
    </div>
  </div>
);

// Update Header component to accept openSidebar prop
const Header = ({ openSidebar }: { openSidebar: () => void }) => {
  const { user } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  return (
    <header className="bg-white shadow-md fixed w-full z-10 border-b border-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button 
              onClick={openSidebar}
              className="p-2 rounded-full hover:bg-blue-50 transition-colors duration-200"
            >
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

const SubjectDetailView: React.FC = () => {
  const { subjectid } = useParams();
  const { user, isLoading } = useAuth();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Add this state
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [key: number]: boolean }>({});
  const [showingDetails, setShowingDetails] = useState<{ [key: number]: boolean }>({});

  // Add toggle functions
  const toggleDescription = (assignmentId: number) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

  const toggleDetails = (assignmentId: number) => {
    setShowingDetails(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

  // Fetch subject and assignments data
  useEffect(() => {
    if (!subjectid) return;
    
    const fetchSubjectData = async () => {
      try {
        const response = await fetch(`/api/student/showSubjectDetail/${subjectid}`);
        const data = await response.json();
        if (response.ok) {
          setSubject(data);
        }
      } catch (error) {
        console.error('Error fetching subject:', error);
      }
    };

    const fetchAssignments = async () => {
      try {
        const response = await fetch(`/api/student/showSubjectDetail/${subjectid}?action=assignments`);
        const data = await response.json();
        if (response.ok) {
          setAssignments(data);
        }
      } catch (error) {
        console.error('Error fetching assignments:', error);
      }
    };

    fetchSubjectData();
    fetchAssignments();
  }, [subjectid]);

  const handleSubmitAssignment = async (files: File[], requirements: any) => {
    if (!selectedAssignment) return;
    
    try {
      const response = await fetch(`/api/student/showSubjectDetail/${subjectid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignmentId: selectedAssignment.assignmentid,
          files: files.map(f => f.name), // In real app, you'd upload files to storage
          requirements
        }),
      });

      if (response.ok) {
        // Refresh assignments after submission
        const updatedAssignments = await fetch(`/api/student/showSubjectDetail/${subjectid}?action=assignments`);
        const data = await updatedAssignments.json();
        setAssignments(data);
        setIsSubmissionModalOpen(false);
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
    }
  };

  if (isLoading) return <div className="pt-20 p-6">Loading...</div>;
  if (!subject) return <div className="pt-20 p-6">broke....</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      <Header openSidebar={() => setIsSidebarOpen(true)} />
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      <main className="pt-24 pb-16 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <nav className="mb-8 flex items-center space-x-2 text-sm">
            <Link href="/dashboard/student/showSubject"
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              รายวิชา
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">รายละเอียดวิชา</span>
          </nav>

          {/* Subject Header Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden mb-8">
            <div className="p-8">
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

          {/* Assignments Section */}
          <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">งานที่มอบหมาย</h2>
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.assignmentid}
                    className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-grow">
                          <h3 className="text-lg font-medium text-gray-900">
                            {assignment.assignment_name}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            กำหนดส่ง: {new Date(assignment.assignment_due_date).toLocaleDateString('th-TH')}
                          </p>
                          {assignment.status && (
                            <span className={`mt-2 inline-block px-2 py-1 text-xs rounded-full
                              ${assignment.status === 'approved' ? 'bg-green-100 text-green-800' :
                                assignment.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'}`}>
                              {assignment.status === 'approved' ? 'อนุมัติแล้ว' :
                               assignment.status === 'submitted' ? 'ส่งแล้ว' : 'ยังไม่ส่ง'}
                            </span>
                          )}
                          
                          {/* Expandable Description */}
                          {assignment.assignment_description && (
                            <>
                              <p className={`mt-3 text-sm text-gray-600 ${expandedDescriptions[assignment.assignmentid] ? '' : 'line-clamp-2'}`}>
                                {assignment.assignment_description}
                              </p>
                              <button
                                onClick={() => toggleDescription(assignment.assignmentid)}
                                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
                              >
                                {expandedDescriptions[assignment.assignmentid] ? 'แสดงน้อยลง' : 'แสดงเพิ่มเติม'}
                              </button>
                            </>
                          )}

                          {/* Details Section */}
                          {showingDetails[assignment.assignmentid] && (
                            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-3">รายละเอียดการส่งงาน</h4>
                              
                              {/* {assignment.validate?.document_status?.files?.map((file: any, index: number) => (
                                <div key={index} className="mb-3 p-3 bg-white rounded border">
                                  <p className="text-sm font-medium text-gray-700">{file.name}</p>
                                  <div className="mt-1 flex items-center">
                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 
                                      ${file.validated ? 'bg-green-500' : 'bg-yellow-500'}`}
                                    />
                                    <span className="text-sm text-gray-600">
                                      {file.validated ? 'ตรวจสอบแล้ว' : 'รอการตรวจสอบ'}
                                    </span>
                                  </div>
                                </div>
                              ))}

                              {assignment.validate?.submitted_at && (
                                <p className="text-sm text-gray-600 mt-2">
                                  ส่งเมื่อ: {new Date(assignment.validate.submitted_at).toLocaleString('th-TH')}
                                </p>
                              )} */}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => toggleDetails(assignment.assignmentid)}
                            className="px-4 py-2 text-sm font-medium rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100"
                          >
                            {showingDetails[assignment.assignmentid] ? 'ซ่อนรายละเอียด' : 'รายละเอียด'}
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setIsSubmissionModalOpen(true);
                            }}
                            disabled={assignment.status === 'approved'}
                            className={`px-4 py-2 text-sm font-medium rounded-lg
                              ${assignment.status === 'approved'
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                          >
                            {assignment.status === 'approved' ? 'อนุมัติแล้ว' : 'ส่งงาน'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Submission Modal */}
      <AssignmentSubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        assignment={selectedAssignment}
        onSubmit={handleSubmitAssignment}
      />
    </div>
  );
};

export default SubjectDetailView;
