import React from 'react';

interface SubjectCardProps {
  subjectid: string;
  subject_name: string;
  section: string;
  subject_semester: string;
  subject_year: string;
  group_data: {
    BIT: number;
    Network: number;
    Web: number;
  };
}

const SubjectCard: React.FC<SubjectCardProps> = ({
  subjectid,
  subject_name,
  section,
  subject_semester,
  subject_year,
  group_data,
}) => {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-2">{subject_name}</h2>
      <p>Section: {section}</p>
      <p>Semester: {subject_semester}</p>
      <p>Year: {subject_year}</p>
      <div className="mt-2">
        <h3 className="font-semibold">Group Data:</h3>
        <ul className="list-disc list-inside">
          <li>BIT: {group_data.BIT}</li>
          <li>Network: {group_data.Network}</li>
          <li>Web: {group_data.Web}</li>
        </ul>
      </div>
      {/* Add edit or delete buttons if needed */}
    </div>
  );
};

export default SubjectCard;