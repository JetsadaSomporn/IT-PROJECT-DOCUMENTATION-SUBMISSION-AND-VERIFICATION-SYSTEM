import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Notification {
  id: number;
  assignmentId: number;
  groupId: number;
  groupName: string;
  assignmentName: string;
  fileName: string;
  filePath: string;
  fileSize: string;
  uploadedBy: string;
  created: string;
  issue: string;
  isRead: boolean;
  subjectId?: string;
  subjectName?: string;
}

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState<number | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/admin/notifications');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (error) {
        // Silent error
      }
    };

    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 60000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('th-TH', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleDownload = async (notification: Notification, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setIsDownloading(notification.id);
      
      const response = await fetch(`/api/files/download?path=${encodeURIComponent(notification.filePath)}`);
      
      if (!response.ok) {
        throw new Error('ดาวน์โหลดไฟล์ไม่สำเร็จ');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = notification.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      setIsDownloading(null);
    } catch (error) {
      alert('ไม่สามารถดาวน์โหลดไฟล์ได้ ไฟล์อาจเสียหายหรือไม่มีอยู่');
      setIsDownloading(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">การแจ้งเตือน</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div key={notification.id} className="relative">
                    <Link 
                      href={`/dashboard/admin/subjectDetailManagement/${notification.subjectId}?openAssignment=${notification.assignmentId}`}
                      className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900 mb-0.5">
                            กลุ่ม {notification.groupName} ({notification.issue})
                          </p>
                          {notification.subjectName && (
                            <p className="text-blue-600 text-xs">
                              {notification.subjectName}
                            </p>
                          )}
                          <p className="text-gray-600 text-xs">
                            {notification.assignmentName}
                          </p>
                          <p className="text-gray-500 text-xs mt-1">
                            ไฟล์: {notification.fileName}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(notification.created)}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleDownload(notification, e)}
                        className={`absolute bottom-3 right-4 px-2 py-1 text-xs ${
                          isDownloading === notification.id 
                          ? 'bg-gray-200 text-gray-500' 
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        } rounded transition-colors`}
                        disabled={isDownloading === notification.id}
                      >
                        {isDownloading === notification.id ? 'กำลังดาวน์โหลด' : 'ดาวน์โหลด'}
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-gray-500">
                ไม่มีการแจ้งเตือนใหม่
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
