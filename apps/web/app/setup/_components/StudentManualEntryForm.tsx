"use client";

import { useState } from "react";
import type { Student } from "../types/student";

interface ManualEntryFormProps {
  data: Student[];
  onDataChange: (data: Student[]) => void;
  selectedCourse: string;
}

export function StudentManualEntryForm({ data, onDataChange, selectedCourse }: ManualEntryFormProps) {
  const [name, setName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");

  const resetForm = () => {
    setName("");
    setAdmissionNumber("");
  };

  const addStudent = () => {
    if (!name || !admissionNumber) return;

    const existing = data.find((s) => s.admissionNumber === admissionNumber);
    if (existing) {
      alert("A student with this admission number already exists");
      return;
    }

    const newStudent: Student = {
      id: `student-${Date.now()}`,
      name,
      admissionNumber,
      course: selectedCourse,
    };
    onDataChange([...data, newStudent]);
    resetForm();
  };

  const deleteStudent = (id: string) => {
    onDataChange(data.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Doe"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Admission Number
          </label>
          <input
            type="text"
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            placeholder="e.g. S1234567"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={addStudent}
        disabled={!name || !admissionNumber}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition"
      >
        Add Student
      </button>

      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No students added yet.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-3 font-medium text-gray-700">Name</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Admission Number</th>
                <th className="w-1"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((student) => (
                <tr key={student.id} className="border-t border-gray-100">
                  <td className="py-2 px-3">{student.name}</td>
                  <td className="py-2 px-3">{student.admissionNumber}</td>
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      onClick={() => deleteStudent(student.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
