
import React, { useState } from 'react';



const ProjectForm: React.FC = () => {

  const [projectName, setProjectName] = useState('');

  const [groupName, setGroupName] = useState('');

  const [teacher, setTeacher] = useState('');

  const [subject, setSubject] = useState('');



  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    // Handle form submission logic here

  };



  return (

    <form onSubmit={handleSubmit} className="space-y-4">

      <div>

        <label className="block text-sm font-medium text-gray-700">Project Name</label>

        <input

          type="text"

          value={projectName}

          onChange={(e) => setProjectName(e.target.value)}

          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"

        />

      </div>

      <div>

        <label className="block text-sm font-medium text-gray-700">Group Name</label>

        <input

          type="text"

          value={groupName}

          onChange={(e) => setGroupName(e.target.value)}

          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"

        />

      </div>

      <div>

        <label className="block text-sm font-medium text-gray-700">Teacher</label>

        <input

          type="text"

          value={teacher}

          onChange={(e) => setTeacher(e.target.value)}

          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"

        />

      </div>

      <div>

        <label className="block text-sm font-medium text-gray-700">Subject</label>

        <input

          type="text"

          value={subject}

          onChange={(e) => setSubject(e.target.value)}

          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"

        />

      </div>

      <div className="mt-4 flex justify-end space-x-3">

        <button

          type="button"

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

  );

};



export default ProjectForm;
