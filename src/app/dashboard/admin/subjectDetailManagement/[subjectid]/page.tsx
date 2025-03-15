"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import Modal from 'react-modal';
import TabTransition from '@/components/TabTransition';
import ReactDatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faUserGraduate, faUser } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../../hooks/useAuth';
import { signOut } from 'next-auth/react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import NotificationDropdown from '@/components/NotificationDropdown';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

// Add this custom CSS near the top of your file
const datePickerStyles = `
  .react-datepicker {
    font-family: 'Inter', -apple-system, sans-serif;
    border: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border-radius: 16px;
    overflow: hidden;
    padding: 16px;
    background: white;
  }

  .react-datepicker__header {
    background: white;
    border: none;
    padding: 0;
    margin-bottom: 16px;
  }

  .react-datepicker__month-container {
    float: none;
  }

  .react-datepicker__day-names {
    margin-top: 12px;
  }

  .react-datepicker__day-name {
    color: #6B7280;
    font-weight: 500;
    width: 40px;
    height: 40px;
    line-height: 40px;
    margin: 0;
  }

  .react-datepicker__day {
    width: 40px;
    height: 40px;
    line-height: 40px;
    margin: 0;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .react-datepicker__day:hover {
    background: #F3F4F6;
    border-radius: 50%;
  }

  .react-datepicker__day--selected {
    background: #3B82F6 !important;
    border-radius: 50%;
    font-weight: 600;
  }

  .react-datepicker__day--keyboard-selected {
    background: #DBEAFE;
    border-radius: 50%;
  }

  .react-datepicker__month-select,
  .react-datepicker__year-select {
    border: 1px solid #E5E7EB;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    color: #374151;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .react-datepicker__month-select:hover,
  .react-datepicker__year-select:hover {
    border-color: #3B82F6;
  }

  .react-datepicker__navigation {
    top: 20px;
  }

  .react-datepicker__navigation--previous {
    left: 20px;
  }

  .react-datepicker__navigation--next {
    right: 20px;
  }
`;

// Add this near the top of your file with the other CSS
const timeInputStyles = `
  /* Force 24-hour display for time inputs */
  input[type="time"]::-webkit-datetime-edit-ampm-field {
    display: none;
  }
  
  /* For Firefox */
  input[type="time"] {
    -moz-appearance: textfield;
  }
`;

interface Student {
  student_id: string;
  username: string;
  email: string;
  userlastname: string;
}

interface Teacher {
  userid: string;
  username: string;
  userlastname: string;
  type: string[];
  email?: string; 
  assigned_at?: string;
}

interface Subject {
  subjectid: string;
  teachers: Teacher[];
  students: Student[];
  number_of_students: number;
  section: number;
  subject_semester: number;
  subject_year: string;
  group_data: {
    [key: string]: any;
  
  };
  created: string;
  updated: string;
  deleted: string | null;
  subject_name: string;
}

interface ImportedStudent {
  student_id: string;
  username: string;
  userlastname: string; 
  email: string;
}

interface User {
  userid: string;
  username: string;
  userlastname: string;
  email: string;
  type: string[];
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
  pdf_path?: string;
  name?: string;
  status: boolean;
  details: {
    [key: string]: boolean;
  };
}

interface ValidateItem {
  student_id: string;
  status: "pending" | "submitted" | "approved" | "rejected";
  submitted_at: string;
  group_id?: number;
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
  type?: string;
  fullDueDateTime?: string;
}

type ValidationData = ValidateItem;

const Header = ({ openSidebar }: { openSidebar: () => void }) => {
  const { user } = useAuth();
  const [showLogout, setShowLogout] = useState(false); // Added state for menu visibility
  
  const handleLogout = () => {
    signOut(); 
  };

  return (
    <header className="bg-white shadow-md fixed w-full z-10 border-b border-gray-200">
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
                  bg-white w-64 border-r border-gray-200 transition-transform duration-300 ease-in-out z-30`}>
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
          รายวิชา
        </Link>
        <Link href="/dashboard/admin/userManagement" 
          className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
          <FontAwesomeIcon icon={faUserGraduate} className="w-5 h-5 mr-3" />
          ผู้ใช้งาน
        </Link>
        <Link href="/dashboard/admin/groupManagement" 
          className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl">
          <FontAwesomeIcon icon={faUser} className="w-5 h-5 mr-3" />
          กลุ่มเรียน
        </Link>
      </nav>
    </div>
  </div>
);

const EditSubjectModal = ({ 
  isOpen, 
  onClose, 
  subject, 
  onSave 
}: { 
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  onSave: (updatedSubject: any) => Promise<void>;
}) => {
  const [editForm, setEditForm] = useState({
    subject_name: subject?.subject_name || '',
    subject_semester: subject?.subject_semester || 0,
    subject_year: subject?.subject_year || '',
    section: subject?.section || 0
  });

  useEffect(() => {
    if (subject) {
      setEditForm({
        subject_name: subject.subject_name,
        subject_semester: subject.subject_semester,
        subject_year: subject.subject_year,
        section: subject.section
      });
    }
  }, [subject]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: name === 'subject_semester' || name === 'section' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(editForm);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
        <div className="bg-blue-600 p-6">
          <h2 className="text-xl font-semibold text-white">แก้ไขข้อมูลวิชา</h2>
          <p className="text-blue-100 mt-1">อัปเดตรายละเอียดวิชาด้านล่าง</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">ชื่อวิชา</label>
              <input
                type="text"
                name="subject_name"
                value={editForm.subject_name}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">ภาคการศึกษา</label>
              <input
                type="number"
                name="subject_semester"
                value={editForm.subject_semester}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">ปีการศึกษา</label>
              <input
                type="text"
                name="subject_year"
                value={editForm.subject_year}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block mb-2 font-medium">หมู่เรียน</label>
              <input
                type="number"
                name="section"
                value={editForm.section}
                onChange={handleChange}
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              บันทึกการแก้ไข
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

const get = (url: string, opts?: any) => fetch(url, opts);

const SubjectDetailManagement: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subjectid } = params;
  const [subject, setSubject] = useState<Subject | null>(() => ({
    subjectid: '',
    teachers: [],
    students: [],
    number_of_students: 0,
    section: 0,
    subject_semester: 0,
    subject_year: '',
    group_data: {},
    created: '',
    updated: '',
    deleted: null,
    subject_name: ''
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'tasks' | 'dashboard'>('students');
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState<Subject | null>(null);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
  const [importedStudents, setImportedStudents] = useState<ImportedStudent[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTeacherSelectionOpen, setIsTeacherSelectionOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissionStats, setSubmissionStats] = useState<{[key: number]: {submitted: number, notSubmitted: number}}>({});
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    assignment_name: '',
    assignment_description: '',
    assignment_date: new Date().toISOString().split('T')[0],
    assignment_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    start_time: '00:00',
    due_time: '23:59',
  });
  const [documentVerification, setDocumentVerification] = useState<{
    [key: string]: {
      checked: boolean;
      details: {
        [key: string]: boolean;
      };
    };
  }>({
    'เอกสารยืนยันหัวข้อโครงงาน': { checked: false, details: {
      // 'ชื่อไฟล์ถูกต้อง': false,
      // 'ชื่อโครงงาน': false,
      // 'รายชื่อนักศึกษา': false,
      // 'หมายเลขกลุ่ม': false,
      // 'ชื่ออาจารย์ที่ปรึกษา': false,
      // 'ลายเซ็นอาจารย์': false,
    }},
    'สรุปการเข้าพบอาจารย์ที่ปรึกษา': { checked: false, details: {
      // 'ชื่อไฟล์ถูกต้อง': false,
      // 'ชื่อโครงงาน': false,
      // 'รายชื่อนักศึกษา': false,
      // 'หมายเลขกลุ่ม': false,
      // 'ชื่ออาจารย์ที่ปรึกษา': false,
      // 'ลายเซ็นอาจารย์': false,
    }},
    'หลักฐานการเข้าร่วมการแข่งขัน': { checked: false, details: {
      // 'ชื่อไฟล์ถูกต้อง': false,
      // 'ชื่อโครงงาน': false,
      // 'รายชื่อนักศึกษา': false,
      // 'หมายเลขกลุ่ม': false,
      // 'ชื่ออาจารย์ที่ปรึกษา': false,
      // 'ลายเซ็นอาจารย์': false,
    }},
    'รายงานความก้าวหน้า': { checked: false, details: {
      // 'ชื่อไฟล์ถูกต้อง': false,
      // 'ชื่อโครงงาน': false,
      // 'รายชื่อนักศึกษา': false,
      // 'หมายเลขกลุ่ม': false,
      // 'ชื่ออาจารย์ที่ปรึกษา': false,
      // 'ลายเซ็นอาจารย์': false,
    }},
    'คู่มือ': { checked: false, details: {
      // 'ชื่อไฟล์ถูกต้อง': false,
      // 'ชื่อโครงงาน': false,
      // 'รายชื่อนักศึกษา': false,
      // 'หมายเลขกลุ่ม': false,
      // 'ชื่ออาจารย์ที่ปรึกษา': false,
      // 'ลายเซ็นอาจารย์': false,
    }},
  });

  const handleDocumentChange = (documentName: string) => {
    setDocumentVerification(prev => ({
      ...prev,
      [documentName]: {
        ...prev[documentName],
        checked: !prev[documentName].checked,
        details: prev[documentName].checked ? Object.fromEntries(
          Object.keys(prev[documentName].details).map(key => [key, false])
        ) : prev[documentName].details,
      }
    }));
  };


  useEffect(() => {
  }, []);

  const fetchSubject = async () => {
    try {
      const response = await get(`/api/admin/subjectDetailManagement/${subjectid}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch subject data');
      }
      const data = await response.json();

      const mappedStudents = data.students.map((s: any) => ({
        student_id: s.userid || s.student_id,
        username: s.username,
        userlastname: s.userlastname,
        email: s.email,
      }));

      setSubject({
        ...data,
        students: mappedStudents,
      });
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subjectid) {
      fetchSubject();
    }
  }, [subjectid]);

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9ก-๙]/g, ''); 
  };
  
  const findHeaderRowIndex = (jsonData: any[][]): number => {
    const requiredHeaders = ['รหัสประจำตัว', 'ชื่อ', 'kkumail'].map(normalizeText);
  
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
  
      const normalizedRow = row.map((cell: any) => (typeof cell === 'string' ? normalizeText(cell) : '')).filter(Boolean);
  
      const hasAllHeaders = requiredHeaders.every(header =>
        normalizedRow.includes(header)
      );
  
  
      if (hasAllHeaders) {
        return i;
      }
    }
    return -1;
  };
  
  const [showPreview, setShowPreview] = useState(false);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'students' | 'teachers' | 'users'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (!event.target?.result) throw new Error('File reading failed');

        const data = event.target.result as string;

        const workbook = XLSX.read(data, { type: 'string', raw: true });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

        if (jsonData.length === 0) {
          alert('the Excel file is empty.');
          return;
        }

        const headerRowIndex = findHeaderRowIndex(jsonData);
        if (headerRowIndex === -1) {
          alert('header row not found in the Excel file.');
          return;
        }

        const headerRow = jsonData[headerRowIndex];

        const headerMap: { [key: string]: number } = {};
        headerRow.forEach((header: any, index: number) => {
          const headerString = header ? String(header).trim() : '';
          headerMap[headerString] = index;
        });

        if (headerMap['kkumail']) {
          headerMap['email'] = headerMap['kkumail'];
        }

        const dataRows = jsonData.slice(headerRowIndex + 2);

        const students: ImportedStudent[] = [];
        for (const row of dataRows) {
          const studentIdCell = row[headerMap['รหัสประจำตัว']]; 
          const nameCell = row[headerMap['ชื่อ']];                
          const emailCell = row[headerMap['email']];

      

          const studentId = String(studentIdCell).replace(/-/g, '').trim();
          const fullName = nameCell ? String(nameCell).trim() : '';
          const email = emailCell ? String(emailCell).trim() : '';

          const nameParts = fullName.split(' ');
          const username = nameParts[0] || '';
          const userlastname = nameParts.slice(1).join(' ') || '';

          const student: ImportedStudent = {
            student_id: studentId,
            username: username,
            userlastname: userlastname,
            email: email,
           
          };

          if (student.student_id !== 'รหัสประจำตัว') {
            students.push(student);
          }
        }

        if (students.length > 0) {
          setImportedStudents(students);
          setShowPreview(true);
        } else {
          alert('ไม่พบข้อมูล');
        }
      } catch (error: any) {
        alert('err encode');
      }
    };
  
    reader.onerror = () => {
      alert('err encode');
    };
  
 
    reader.readAsText(file, 'windows-874');
  };
  
  const findDuplicates = (importedStudents: ImportedStudent[], existingStudents: Student[]) => {
    const duplicates: ImportedStudent[] = [];
    const newStudents: ImportedStudent[] = [];

    importedStudents.forEach(importedStudent => {
      const isDuplicate = existingStudents.some(
        existingStudent => existingStudent.student_id === importedStudent.student_id
      );

      if (isDuplicate) {
        duplicates.push(importedStudent);
      } else {
        newStudents.push(importedStudent);
      }
    });

    return { duplicates, newStudents };
  };

  const handleSaveImportedStudents = async () => {
    if (importedStudents.length === 0) {
      alert('No stu to import');
      return;
    }
    try {
      const { duplicates, newStudents } = findDuplicates(importedStudents, subject?.students || []);
      
      if (newStudents.length === 0) {
        alert('already import');
        return;
      }

      const response = await get(`/api/admin/subjectDetailManagement/${subjectid}?action=students`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ students: newStudents }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save imported students');
        } else {
          const errorText = await response.text();
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      const savedMessage = await response.json();
      alert(savedMessage.message || 'บันทึกนักศึกษาเรียบร้อย');
      
      setImportedStudents([]);
      fetchSubject();
    } catch (err: any) {
      alert(`Error saving students: ${err.message}`);
    }
  };

  const handleRemoveStudent = async (student_id: string) => {
    if (!student_id) {
      alert('dont have student id to remove.');
      return;
    }
  
    try {
      const response = await get(`/api/admin/subjectDetailManagement/${subjectid}?action=remove-student`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ student_id }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove student');
      }
  
      setSubject(prevSubject => prevSubject ? {
        ...prevSubject,
        students: prevSubject.students.filter(student => student.student_id !== student_id)
      } : null);
      
      alert('ลบนักศึกษาเรียบร้อยแล้ว');
    } catch (err: any) {
      alert(`Error removing student: ${err.message}`);
    }
  };
  

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleSaveSubject = async (updatedSubject: any) => {
    try {
      const response = await fetch(`/api/admin/subjectDetailManagement/${subjectid}?action=edit-subject`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSubject),
      });

      if (!response.ok) {
        throw new Error('Failed to update subject');
      }

      const { data } = await response.json();
      setSubject(data);
      setIsEditing(false);
      alert('อัปเดตรายวิชาเรียบร้อยแล้ว');
    } catch (err: any) {
      alert('Failed to update subject: ' + err.message);
    }
  };

  const [teacherSearchQuery, setTeacherSearchQuery] = useState<string>('');

  const openTeacherModal = async () => {
    try {
      await fetchAllUsers();
      setSelectedTeachers(subject?.teachers.map(t => t.userid) || []);
      setIsTeacherSelectionOpen(true);
      setTeacherSearchQuery('');
    } catch (error: any) {
      alert('ไม่สามารถโหลดข้อมูลครูผู้สอนได้');
    }
  };



  const handleTeacherSave = async () => {
    try {
      const response = await fetch(`/api/admin/subjectDetailManagement/${subjectid}?action=manage-teacher`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teachers: selectedTeachers }),
      });

      if (!response.ok) {
        throw new Error('Failed to update teachers');
      }

      await fetchSubject();
      setIsTeacherSelectionOpen(false);
      alert('Teachers updated successfully');
    } catch (error: any) {
      alert(`Failed to update teachers: ${error.message}`);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch(`/api/admin/subjectDetailManagement/${subjectid}?action=all-users`);
      const data = await res.json();
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching all users:", error);
      setAllUsers([]);
    }
  };

  const handleTeacherCheckbox = (userid: string) => {
    setSelectedTeachers(prev => {
      if (prev.includes(userid)) {
        return prev.filter(id => id !== userid);
      } else {
        return [...prev, userid];
      }
    });
  };

 

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchAssignments();
    }
  }, [activeTab]);

  const [autoOpenAssignmentId, setAutoOpenAssignmentId] = useState<number | null>(null);
  
  useEffect(() => {
    const assignmentToOpen = searchParams.get('openAssignment');
    if (assignmentToOpen) {
      const assignmentId = parseInt(assignmentToOpen);
      if (!isNaN(assignmentId)) {
        setAutoOpenAssignmentId(assignmentId);
        setActiveTab('tasks');
      }
    }
  }, [searchParams]);

  const fetchAssignments = async () => {
    try {
      const response = await get(`/api/admin/subjectDetailManagement/${subjectid}?action=all-assignments`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch assignments');
      }
  
      const data = await response.json();
  
      if (!Array.isArray(data)) {
        setAssignments([]);
        return;
      }
  
      setAssignments(data);
      
      if (autoOpenAssignmentId) {
        const assignmentToOpen = data.find((a: Assignment) => a.assignmentid === autoOpenAssignmentId);
        if (assignmentToOpen) {
          setSelectedAssignment(assignmentToOpen);
          setIsAssignmentDetailOpen(true);
        }
        setAutoOpenAssignmentId(null);
      }
      
      fetchAllSubmissionStats(data);
    } catch (err: any) {
      setAssignments([]);
      alert('ไม่สามารถดึงข้อมูลงานได้');
    }
  };

const fetchAllSubmissionStats = async (assignmentList: Assignment[]) => {
  const statsMap: {[key: number]: {submitted: number, notSubmitted: number}} = {};
  
  try {
    const statsPromises = assignmentList.map(async (assignment) => {
      const response = await fetch(
        `/api/admin/subjectDetailManagement/${subjectid}?action=submission-stats&assignmentId=${assignment.assignmentid}`,
        { 
          credentials: 'include',
          cache: 'no-store'
        }
      );
      
      if (!response.ok) {
        throw new Error(`ไม่สามารถดึงข้อมูลสถิติสำหรับงาน ${assignment.assignmentid}`);
      }
      
      const data = await response.json();
      
      const submittedCount = data.submittedGroups?.length || 0;
      const notSubmittedCount = data.notSubmittedCount || 0;
      
      return {
        assignmentId: assignment.assignmentid,
        stats: {
          submitted: submittedCount,
          notSubmitted: notSubmittedCount
        }
      };
    });
    
    const results = await Promise.all(statsPromises);
    
    results.forEach(result => {
      statsMap[result.assignmentId] = result.stats;
    });
    
    setSubmissionStats(statsMap);
  } catch (error) {
    // Silent error
  }
};

  const handleAssignmentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNewAssignment({
      ...newAssignment,
      [e.target.name]: e.target.value,
    });
  };

  const openFullScreenTaskForm = () => {
    setIsCreatingTask(true);
  };

  const closeFullScreenTaskForm = () => {
    setIsCreatingTask(false);
    setNewAssignment({
      assignment_name: '',
      assignment_description: '',
      assignment_date: new Date().toISOString().split('T')[0],
      assignment_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      start_time: '00:00',
      due_time: '23:59',
    });
  };

const formatDateToLocalISOString = (date: Date): string => {
  const thaiDate = new Date(date.getTime());
  thaiDate.setHours(thaiDate.getHours());
  
  const y = thaiDate.getFullYear();
  const m = String(thaiDate.getMonth() + 1).padStart(2, '0');
  const d = String(thaiDate.getDate()).padStart(2, '0');
  const h = String(thaiDate.getHours()).padStart(2, '0');
  const min = String(thaiDate.getMinutes()).padStart(2, '0');
  const s = String(thaiDate.getSeconds()).padStart(2, '0');
  
  return `${y}-${m}-${d}T${h}:${min}:${s}+07:00`;
};

const handleCreateAssignment = async () => {
  try {
    const dateParts = newAssignment.assignment_due_date.split('-');
    const timeParts = newAssignment.due_time.split(':');
    
    const dueDate = new Date(
      parseInt(dateParts[0]),
      parseInt(dateParts[1]) - 1,
      parseInt(dateParts[2]),
      parseInt(timeParts[0]),
      parseInt(timeParts[1])
    );
    
    const isoDateString = formatDateToLocalISOString(dueDate);
    
    const payload = {
      assignment_name: newAssignment.assignment_name,
      assignment_description: newAssignment.assignment_description,
      assignment_date: newAssignment.assignment_date,
      assignment_due_date: isoDateString,
      documentVerification
    };
    const response = await get(
      `/api/admin/subjectDetailManagement/${subjectid}?action=create-assignment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to create assignment');
    }

    const createdAssignment: Assignment = await response.json();
    setAssignments([...assignments, createdAssignment]);
    closeFullScreenTaskForm();
    alert('สร้างงานสำเร็จแล้ว');
  } catch (err: any) {
    alert('สร้างงานไม่สำเร็จ');
  }
};

  const handleDeleteSubject = async () => {
    try {
      const response = await fetch(`/api/admin/subjectDetailManagement/${subjectid}?action=delete-subject`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete subject');
      }
  
      const result = await response.json();
      router.push('/dashboard/admin/subjectManagement');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAssignment = async (assignmentid: number) => {
    try {
      const response = await get(`/api/admin/subjectDetailManagement/${subjectid}?action=delete-assignment`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignmentid }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to delete assignment');
      }
  
      setAssignments(assignments.filter(assignment => assignment.assignmentid !== assignmentid));
    } catch (err: any) {
    }
  };

  const [isAssignmentDetailOpen, setIsAssignmentDetailOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

const CustomTimeInput = ({ 
  value, 
  onChange, 
  className = "" 
}: { 
  value: string; 
  onChange: (value: string) => void;
  className?: string;
}) => {
  const [hours, minutes] = value.split(':').map(num => parseInt(num));
  
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return (
      <option key={hour} value={hour}>
        {hour}
      </option>
    );
  });
  
  const minuteOptions = Array.from({ length: 60 }, (_, i) => {
    const minute = i.toString().padStart(2, '0');
    return (
      <option key={minute} value={minute}>
        {minute}
      </option>
    );
  });
  
  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newHours = e.target.value;
    const newMinutes = minutes.toString().padStart(2, '0');
    onChange(`${newHours}:${newMinutes}`);
  };
  
  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMinutes = e.target.value;
    const newHours = hours.toString().padStart(2, '0');
    onChange(`${newHours}:${newMinutes}`);
  };
  
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <select
        value={hours.toString().padStart(2, '0')}
        onChange={handleHourChange}
        className="w-16 px-2 py-2 rounded-l-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white"
      >
        {hourOptions}
      </select>
      <span className="text-lg text-gray-500">:</span>
      <select
        value={minutes.toString().padStart(2, '0')}
        onChange={handleMinuteChange}
        className="w-16 px-2 py-2 rounded-r-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white"
      >
        {minuteOptions}
      </select>
    </div>
  );
};

const TimeInput = ({ value, onChange, className = "" }: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) => {
  const handleCustomTimeChange = (newValue: string) => {
    const syntheticEvent = {
      target: {
        value: newValue
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
  };
  
  return (
    <CustomTimeInput
      value={value}
      onChange={handleCustomTimeChange}
      className={className}
    />
  );
};

const AssignmentDetailModal = ({ 
  isOpen, 
  onClose, 
  assignment,
  onSave 
}: { 
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  onSave: (updatedAssignment: any) => Promise<void>;
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'dashboard'>('details');
  const [editForm, setEditForm] = useState({
    assignment_name: '',
    assignment_description: '',
    assignment_date: '',
    assignment_due_date: '',
    validates: [] as ValidateItem[],
    doc_verification: {} as Assignment['doc_verification'],
    due_time: '23:59',
  });

  const [editDocVerification, setEditDocVerification] = useState<{
    [key: string]: {
      checked: boolean;
      details: {
        [key: string]: boolean;
      };
    };
  }>({
    'เอกสารยืนยันหัวข้อโครงงาน': { checked: false, details: {
      // 'ชื่อไฟล์ถูกต้อง': false,
      // 'ชื่อโครงงาน': false,
      // 'รายชื่อนักศึกษา': false,
      // 'หมายเลขกลุ่ม': false,
      // 'ชื่ออาจารย์ที่ปรึกษา': false,
      // 'ลายเซ็นอาจารย์': false,
    }},
    'สรุปการเข้าพบอาจารย์ที่ปรึกษา': { checked: false, details: {
      // 'ชื่อไฟล์ถูกต้อง': false,
      // 'ชื่อโครงงาน': false,
      // 'รายชื่อนักศึกษา': false,
      // 'หมายเลขกลุ่ม': false,
      // 'ชื่ออาจารย์ที่ปรึกษา': false,
      // 'ลายเซ็นอาจารย์': false,
    }},
    'หลักฐานการเข้าร่วมการแข่งขัน': { checked: false, details: {
      // 'ชื่อไฟล์ถูกต้อง': false,
      // 'ชื่อโครงงาน': false,
      // 'รายชื่อนักศึกษา': false,
      // 'หมายเลขกลุ่ม': false,
      // 'ชื่ออาจารย์ที่ปรึกษา': false,
      // 'ลายเซ็นอาจารย์': false,
    }},
    'รายงานความก้าวหน้า': { checked: false, details: {
      // 'ชื่อไฟล์ถูกต้อง': false,
      // 'ชื่อโครงงาน': false,
      // 'รายชื่อนักศึกษา': false,
      // 'หมายเลขกลุ่ม': false,
      // 'ชื่ออาจารย์ที่ปรึกษา': false,
      // 'ลายเซ็นอาจารย์': false,
    }},
    'คู่มือ': { checked: false, details: {
      // 'ชื่อไฟล์ถูกต้อง': false,
      // 'ชื่อโครงงาน': false,
      // 'รายชื่อนักศึกษา': false,
      // 'หมายเลขกลุ่ม': false,
      // 'ชื่ออาจารย์ที่ปรึกษา': false,
      // 'ลายเซ็นอาจารย์': false,
    }},
  });

  const [selectedValidation, setSelectedValidation] = useState<ValidationData | null>(null);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

const formatDateWithTimezone = (dateString: string) => {
  try {
    if (!dateString) return { dateString: '', timeString: '00:00', fullDate: new Date() };
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return { dateString: '', timeString: '00:00', fullDate: new Date() };
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return {
      dateString: `${year}-${month}-${day}`,
      timeString: `${hours}:${minutes}`,
      fullDate: date
    };
  } catch (error) {
    console.error('Error parsing date:', error, dateString);
    return { dateString: '', timeString: '00:00', fullDate: new Date() };
  }
};

useEffect(() => {
  if (assignment) {
    const { dateString, timeString } = formatDateWithTimezone(
      (assignment.validates?.[0]?.fullDueDateTime || assignment.assignment_due_date)
    );
    
    setEditForm({
      ...assignment,
      assignment_date: assignment.assignment_date.split('T')[0],
      assignment_due_date: dateString,
      validates: assignment.validates || [],
      doc_verification: assignment.validates?.[0]?.requirements || {},
      due_time: timeString,
    });
    
    if (assignment.validates?.[0]?.requirements) {
      setEditDocVerification(assignment.validates[0].requirements);
    }
  }
}, [assignment]);

  const handleDocChange = (documentName: string) => {
    setEditDocVerification(prev => ({
      ...prev,
      [documentName]: {
        ...prev[documentName],
        checked: !prev[documentName].checked,
        details: prev[documentName].checked ? 
          Object.fromEntries(Object.keys(prev[documentName].details).map(key => [key, false])) : 
          prev[documentName].details,
      }
    }));
  };

  const handleDetailChange = (documentName: string, detailName: string) => {
    setEditDocVerification(prev => ({
      ...prev,
      [documentName]: {
        ...prev[documentName],
        details: {
          ...prev[documentName].details,
          [detailName]: !prev[documentName].details[detailName],
        }
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      const dateParts = editForm.assignment_due_date.split('-').map(n => parseInt(n, 10));
      const timeParts = editForm.due_time.split(':').map(n => parseInt(n, 10));
      
      const localDate = new Date(
        dateParts[0], dateParts[1] - 1, dateParts[2],
        timeParts[0], timeParts[1], 0, 0
      );
      
      const isoDateString = formatDateToLocalISOString(localDate);
      
      const updatedAssignment = {
        assignmentid: assignment?.assignmentid,
        assignment_name: editForm.assignment_name,
        assignment_description: editForm.assignment_description,
        assignment_date: editForm.assignment_date,
        assignment_due_date: isoDateString,
        validates: [{
          type: 'verification_requirements',
          requirements: editDocVerification,
          fullDueDateTime: isoDateString
        }]
      };

      await onSave(updatedAssignment);
      onClose();
    } catch (err) {
      console.error('Error updating assignment:', err);
      alert('Failed to update assignment');
    }
  };
  
const TimeInput = ({ value, onChange, className = "" }: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}) => {
  const handleCustomTimeChange = (newValue: string) => {
    const syntheticEvent = {
      target: {
        value: newValue
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
  };
  
  return (
    <CustomTimeInput
      value={value}
      onChange={handleCustomTimeChange}
      className={className}
    />
  );
};

useEffect(() => {
  if (activeTab === 'dashboard' && assignment) {
    const fetchDashboardData = async () => {
      setIsLoadingDashboard(true);
      try {
        const response = await fetch(
          `/api/admin/subjectDetailManagement/${subjectid}?action=dashboard-data&assignmentId=${assignment.assignmentid}`
        );
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoadingDashboard(false);
      }
    };

    fetchDashboardData();
  }
}, [activeTab, assignment]);

  return (
    
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-white"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
    >
      <div className="min-h-screen">
       
        <div className="h-[70px]"></div>
        
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {assignment?.assignment_name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  กำหนดส่ง{' '}
                  {assignment && (
                    <>
                      {new Date(
                        assignment.validates?.[0]?.fullDueDateTime || assignment.assignment_due_date
                      ).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long', 
                        day: 'numeric'
                      })}{' '}
                      {new Date(
                        assignment.validates?.[0]?.fullDueDateTime || assignment.assignment_due_date
                      ).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}{' '}น.
                    </>
                  )}
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

        <div className="max-w-7xl mx-auto px-6 py-8">
          {activeTab === 'details' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ชื่องาน</label>
                  <input
                    type="text"
                    value={editForm.assignment_name}
                    onChange={(e) => setEditForm({...editForm, assignment_name: e.target.value})}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">กำหนดส่ง</label>
                  <div className="flex gap"> 
                    <div className="flex-grow">
                      <DatePicker
                        selected={new Date(editForm.assignment_due_date)}
                        onChange={(date) => setEditForm({
                          ...editForm,
                          assignment_due_date: date ? date.toISOString().split('T')[0] : ''
                        })}
                        dateFormat="MMMM d, yyyy"
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        placeholderText="Select date"
                      />
                    </div>
                    <TimeInput
                      value={editForm.due_time || "23:59"}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        due_time: e.target.value
                      })}
                      className="w-[140px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">คำอธิบาย</label>
                  <textarea
                    value={editForm.assignment_description}
                    onChange={(e) => setEditForm({...editForm, assignment_description: e.target.value})}
                    rows={6}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">ข้อกำหนดเอกสาร</h4>
                  <div className="space-y-4">
                    {Object.entries(editDocVerification).map(([docName, docValue]) => (
                      <div key={docName} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={docValue.checked}
                            onChange={() => handleDocChange(docName)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-3 text-sm font-medium text-gray-700">{docName}</label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              </div>

              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                
                </table>
              </div>
            </div>
          )}
          {activeTab === 'dashboard' && null}
          {activeTab === 'dashboard' && (
  <div className="space-y-8">
    {isLoadingDashboard ? (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    ) : dashboardData ? (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">การส่งทั้งหมด</div>
                <div className="text-3xl font-semibold mt-2">
                  {dashboardData?.stats?.submittedGroups || 0}
                </div>
              </div>
              <div className="rounded-full bg-blue-50 p-3">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 text-sm">
              <div className="text-green-600">
                <span className="font-medium">{dashboardData?.stats?.submittedGroups || 0}</span> กลุ่มส่งแล้ว
              </div>
              <div className="text-red-600">
                <span className="font-medium">{dashboardData?.stats?.notSubmittedGroups || 0}</span> กลุ่มยังไม่ส่ง
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-xl border border-green-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-green-600">ส่งตรงเวลา</div>
                <div className="text-3xl font-semibold text-green-700 mt-2">
                  {dashboardData?.stats?.timeliness?.onTime || 0}
                </div>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-green-600">
              {Math.round((dashboardData?.stats?.timeliness?.onTime || 0) / 
              ((dashboardData?.stats?.timeliness?.onTime || 0) + (dashboardData?.stats?.timeliness?.late || 0) || 1) * 100) || 0}% ของการส่งทั้งหมด
            </div>
          </div>

          <div className="bg-red-50 rounded-xl border border-red-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-red-600">ส่งช้า</div>
                <div className="text-3xl font-semibold text-red-700 mt-2">
                  {dashboardData?.stats?.timeliness?.late || 0}
                </div>
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 text-sm text-red-600">
              {Math.round((dashboardData?.stats?.timeliness?.late || 0) / 
              ((dashboardData?.stats?.timeliness?.onTime || 0) + (dashboardData?.stats?.timeliness?.late || 0) || 1) * 100) || 0}% ของการส่งทั้งหมด
            </div>
          </div>

          <div className="bg-purple-50 rounded-xl border border-purple-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-purple-600">ไฟล์ใหญ่สุด</div>
                <div className="text-3xl font-semibold text-purple-700 mt-2">
                  {dashboardData?.stats?.fileSizes?.[0]?.size.toFixed(1) || 0} MB
                </div>
              </div>
            </div>
          </div>
        </div>
     
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-medium mb-4">ไทม์ไลน์การส่งงาน</h3>
          <div className="h-80">
            <Line
              data={{
                labels: dashboardData.stats.timeline.dates,
                datasets: [
                  {
                    label: 'ส่งตรงเวลา',
                    data: dashboardData.stats.timeline.onTime,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.4
                  },
                  {
                    label: 'ส่งช้า',
                    data: dashboardData.stats.timeline.late,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-medium mb-4">การส่งงานล่าสุด</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้ส่ง</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">กลุ่ม</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เวลาที่ส่ง</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ไฟล์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dashboardData.submissions?.map((sub: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {sub.username} {sub.userlastname}
                        </div>
                        <div className="text-sm text-gray-500">{sub.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {sub.group_name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm text-gray-900">
                          {new Date(sub.created).toLocaleDateString('th-TH')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(sub.created).toLocaleTimeString('th-TH')}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${new Date(sub.created) <= new Date(dashboardData.assignment.assignment_due_date) 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'}`}>
                        {new Date(sub.created) <= new Date(dashboardData.assignment.assignment_due_date) 
                          ? 'ตรงเวลา' 
                          : 'ส่งช้า'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {sub.pdf.file_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {parseFloat(sub.pdf.file_size).toFixed(1)} MB
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    ) : (
      <div className="text-center text-gray-500">ไม่พบข้อมูล</div>
    )}
  </div>
)}

        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              ปิด
            </button>
            {activeTab === 'details' && (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full border-b-4 border-blue-500 h-16 w-16 mb-4"></div>
        <p className="text-xl">กำลังโหลดรายละเอียดวิชา...</p>
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <p className="text-xl text-red-600 mb-4">เกิดข้อผิดพลาด: {error || 'ไม่พบรายวิชา'}</p>
        <Link href="/dashboard/admin/subjectManagement" className="text-blue-500 underline">
          กลับไปหน้าจัดการรายวิชา
        </Link>
      </div>
    );
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const TeacherDisplayCard = ({ teacher }: { teacher: Teacher }) => {
    const role = teacher.email?.endsWith('@kkumail.com')
      ? 'Teacher Assistant'
      : teacher.email?.endsWith('@kku.ac.th')
      ? 'Teacher'
      : 'No role';
  
    return (
      <div>
        <div>{teacher.username} {teacher.userlastname}</div>
        <div className="text-sm text-gray-500">{role}</div>
      </div>
    );
  };
  
  const TeachersTabContent = () => {  
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setTeacherSearchQuery(e.target.value);
    }, []);
  
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">อาจารย์</h2>
          <button
            onClick={openTeacherModal}
            className="relative cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg px-4 py-2 transition-colors"
          >
            <span className="text-sm">จัดการอาจารย์</span>
          </button>
        </div>
    
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {subject?.teachers?.map((teacher) => (
            <TeacherDisplayCard key={teacher.userid} teacher={teacher} />
          ))}
        </div>
    
        <Modal
          isOpen={isTeacherSelectionOpen}
          onRequestClose={() => setIsTeacherSelectionOpen(false)}
          ariaHideApp={false}
          shouldCloseOnOverlayClick={false}
          shouldCloseOnEsc={false}
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">จัดการอาจารย์</h2>
              <button
                onClick={() => setIsTeacherSelectionOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
    
            <input
              type="text"
              placeholder="ค้นหาครูผู้สอน..."
              value={teacherSearchQuery}
              onChange={handleSearchChange}
              className="border border-gray-300 rounded-lg px-4 py-2 w-64 focus:ring-blue-500 focus:border-blue-500"
            />
    
            <div className="max-h-96 overflow-y-auto mb-4">
              <div className="grid gap-2">
                {allUsers
                  .filter(user => {
                    const searchTerm = teacherSearchQuery.toLowerCase();
                    const fullName = `${user.username || ''} ${user.userlastname || ''}`.toLowerCase();
                    return fullName.includes(searchTerm);
                  })
                  .map(user => (
                    <div
                      key={user.userid}
                      className="flex items-center p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTeachers.includes(user.userid)}
                        onChange={() => handleTeacherCheckbox(user.userid)}
                        className="w-4 h-4 mr-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="flex-1">
                        {`${user.username || ''} ${user.userlastname || ''}`}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
    
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsTeacherSelectionOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleTeacherSave}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  };
  

  function formatThaiDate(dateString: string): React.ReactNode {
    try {
      if (!dateString) return '-';
      
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) return '-';
      
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  }

  function calculateTimeRemaining(dueDate: string): { timeRemaining: string; isPastDue: boolean } {
    const now = new Date();
    const due = new Date(dueDate);
    const isPastDue = now > due;
    
    if (isPastDue) {
      return { 
        timeRemaining: "หมดเวลา",
        isPastDue: true 
      };
    }
    
    const diff = due.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    let timeRemaining: string;
    if (days > 0) {
      timeRemaining = `${days} วัน ${hours} ชั่วโมง`;
    } else if (hours > 0) {
      timeRemaining = `${hours} ชั่วโมง ${minutes} นาที`;
    } else {
      timeRemaining = `${minutes} นาที`;
    }
    
    return { timeRemaining, isPastDue };
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Sidebar isSidebarOpen={isSidebarOpen} closeSidebar={closeSidebar} />
      <Header openSidebar={() => setIsSidebarOpen(true)} />
      
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20" onClick={closeSidebar} />
      )}

      <main className="pt-24 pb-16 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <nav className="mb-8 flex items-center space-x-2 text-sm">
            <Link 
              href="/dashboard/admin/subjectManagement"
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              รายวิชา
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">รายละเอียดวิชา</span>
          </nav>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-8">
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
                    <span>ปีการศึกษา {subject?.subject_year ? 
                      (parseInt(subject.subject_year) + 543).toString() : ''}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleEditToggle}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    แก้ไขรายละเอียด
                  </button>
                  <button
                    onClick={openFullScreenTaskForm}
                    className="relative cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg px-4 py-2 transition-colors"
                  >
                    <span className="text-sm">สร้างงาน</span>
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
                        handleDeleteSubject();
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    ลบวิชา
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200">
              <div className="px-6">
                <nav className="-mb-px flex space-x-4">
                  {['นักศึกษา', 'อาจารย์', 'งาน'].map((tab) => {
                    const tabKey = {
                      'นักศึกษา': 'students',
                      'อาจารย์': 'teachers',
                      'งาน': 'tasks'
                    }[tab];
                    
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tabKey as 'students' | 'teachers' | 'tasks')}
                        className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors
                          ${activeTab === tabKey
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            <div className="p-6">
              <TabTransition isVisible={activeTab === 'students'}>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">นักศึกษา</h2>
                    <div className="flex items-center space-x-3">
                      <label className="relative cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg px-4 py-2 transition-colors">
                        <span className="text-sm">นำเข้า Excel</span>
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          onChange={(e) => handleFileUpload(e, 'students')}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>
                      {importedStudents.length > 0 && (
                        <button
                          onClick={handleSaveImportedStudents}
                          className="bg-green-600 text-white text-sm rounded-lg px-4 py-2 hover:bg-green-700 transition-colors"
                        >
                          บันทึกการนำเข้า ({importedStudents.length})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            รหัสนักศึกษา
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ชื่อ
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            อีเมล
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            การดำเนินการ
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {subject?.students.map((student) => (
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
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <button
                                onClick={() => handleRemoveStudent(student.student_id)}
                                className="text-red-600 hover:text-red-900 transition-colors"
                              >
                                ลบ
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabTransition>

              <TabTransition isVisible={activeTab === 'teachers'}>
                <TeachersTabContent />
              </TabTransition>

              <TabTransition isVisible={activeTab === 'tasks'}>
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-semibold text-gray-900">งาน</h2>
                    <button
                      onClick={openFullScreenTaskForm}
                      className="relative cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg px-4 py-2 transition-colors"
                    >
                      <span className="text-sm">สร้างงาน</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {assignments.map((assignment) => {
  const { timeRemaining, isPastDue } = calculateTimeRemaining(
    assignment.validates?.[0]?.fullDueDateTime || assignment.assignment_due_date
  );
  
  const stats = submissionStats[assignment.assignmentid] || { submitted: 0, notSubmitted: 0 };
  const isLoading = !submissionStats[assignment.assignmentid];

  const description = assignment.assignment_description || '';
  const shortDescription = description.length > 100 
    ? description.substring(0, 100) + "..." 
    : description;

  return (
    <div
      key={assignment.assignmentid}
      className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md p-6"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {assignment.assignment_name}
          </h3>
          <div className="flex items-center text-xs text-gray-500 space-x-3">
            <span>
              กำหนดส่ง: {formatThaiDate(assignment.assignment_due_date)}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedAssignment(assignment);
              setIsAssignmentDetailOpen(true);
            }}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
            title="แก้ไข"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => {
              if (window.confirm('คุณต้องการลบงานนี้ใช่หรือไม่?')) {
                handleDeleteAssignment(assignment.assignmentid);
              }
            }}
            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
            title="ลบ"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <span className="text-sm text-gray-400">กำลังโหลดข้อมูล...</span>
          ) : (
            <>
              <span className="text-sm text-green-600 font-medium">{stats.submitted} กลุ่มส่งแล้ว</span>
              <span className="mx-2 text-gray-400">|</span>
              <span className="text-sm text-red-600 font-medium">{stats.notSubmitted} กลุ่มยังไม่ส่ง</span>
            </>
          )}
        </div>
        <div className="flex items-center">
          <div className={`px-3 py-1 rounded-full text-xs font-medium 
          ${isPastDue 
            ? 'bg-red-100 text-red-800' 
            : 'bg-green-100 text-green-800'}`}>
            {isPastDue ? 'หมดเวลา' : timeRemaining}
          </div>
        </div>
      </div>
    </div>
  );
})}

                  </div>
                </div>
              </TabTransition>
            </div>
          </div>
        </div>
      </main>

      {isCreatingTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="w-full max-w-4xl bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8
                        transform transition-all duration-300 scale-100 opacity-100">
            <div className="w-full max-w-4xl bg-white p-6 rounded-lg">
              <h2 className="text-2xl font-semibold mb-4">สร้างงานใหม่</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <label className="block mb-2 font-medium">ชื่องาน</label>
                    <input
                      type="text"
                      name="assignment_name"
                      value={newAssignment.assignment_name}
                      onChange={handleAssignmentChange}
                      className="w-full border p-2 rounded"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-2 font-medium">วันที่มอบหมาย</label>
                    <div className="flex gap-4">
                      <div className="flex-grow">
                        <DatePicker
                          selected={new Date(newAssignment.assignment_date)}
                          onChange={(date) => setNewAssignment({
                            ...newAssignment,
                            assignment_date: date ? date.toISOString().split('T')[0] : ''
                          })}
                          dateFormat="MMMM d, yyyy"
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          placeholderText="Select date"
                        />
                      </div>
                      <TimeInput
                        value={newAssignment.start_time || "00:00"}
                        onChange={(e) => setNewAssignment({
                          ...newAssignment,
                          start_time: e.target.value
                        })}
                        className="w-[140px]"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block mb-2 font-medium">กำหนดส่ง</label>
                    <div className="flex gap-4">
                      <div className="flex-grow">
                        <DatePicker
                          selected={new Date(newAssignment.assignment_due_date)}
                          onChange={(date) => setNewAssignment({
                            ...newAssignment,
                            assignment_due_date: date ? date.toISOString().split('T')[0] : ''
                          })}
                          dateFormat="MMMM d, yyyy"
                          className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          placeholderText="Select date"
                        />
                      </div>
                      <TimeInput
                        value={newAssignment.due_time || "23:59"}
                        onChange={(e) => setNewAssignment({
                          ...newAssignment,
                          due_time: e.target.value
                        })}
                        className="w-[140px]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">ข้อกำหนดการตรวจสอบเอกสาร</h3>
                  <div className="space-y-4">
                    {Object.keys(documentVerification).map((docName) => (
                      <div key={docName} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={documentVerification[docName].checked}
                          onChange={() => handleDocumentChange(docName)}
                          className="mr-2"
                        />
                        <span>{docName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <label className="block mb-2 font-medium">คำอธิบายงาน</label>
              <textarea
                name="assignment_description"
                value={newAssignment.assignment_description}
                onChange={handleAssignmentChange}
                className="border rounded w-full p-2 mb-4 min-h-[100px]"
                placeholder="กรอกคำแนะนำรายละเอียดสำหรับงาน..."
              />

              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={handleCreateAssignment}
                  className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                >
                  สร้างงาน
                </button>
                <button
                  onClick={closeFullScreenTaskForm}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showPreview && importedStudents.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">ดูตัวอย่างนักศึกษาที่นำเข้า</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        รหัสนักศึกษา
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ชื่อ
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        นามสกุล
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        อีเมล
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importedStudents.map((student, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{student.student_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{student.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{student.userlastname}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{student.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => {
                    setImportedStudents([]);
                    setShowPreview(false);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    handleSaveImportedStudents();
                    setShowPreview(false);
                  }}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  ยืนยันการนำเข้า
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <EditSubjectModal
        isOpen={isEditing}
        onClose={handleEditToggle}
        subject={subject}
        onSave={handleSaveSubject}
      />
      <AssignmentDetailModal
        isOpen={isAssignmentDetailOpen}
        onClose={() => setIsAssignmentDetailOpen(false)}
        assignment={selectedAssignment}
        onSave={async (updatedAssignment) => {
          try {
            const response = await fetch(`/api/admin/subjectDetailManagement/${subjectid}?action=update-assignment`, {
              method: 'PUT',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updatedAssignment),
            });
      
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Failed to update assignment: ${errorText}`);
            }
      
            const result = await response.json();
           
            setAssignments(prev => 
              prev.map(assignment => 
                assignment.assignmentid === updatedAssignment.assignmentid 
                  ? result.data 
                  : assignment
              )
            );
            
            setIsAssignmentDetailOpen(false);
            alert('อัปเดตงานเรียบร้อยแล้ว');
          } catch (error) {
            console.error('Error updating assignment:', error);
            alert(`Failed to update assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }}
      />
    </div>
  );
};

export default SubjectDetailManagement;
