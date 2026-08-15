"use client";

import { useState } from "react";
import type { Lecturer } from "../types/lecturer";

interface ManualEntryFormProps {
  data: Lecturer[];
  onDataChange: (data: Lecturer[]) => void;
}

export function LecturerManualEntryForm({ data, onDataChange }: ManualEntryFormProps) {
  const [name, setName] = useState("");
  const [staffNumber, setStaffNumber] = useState("");

  const resetForm = () => {
    setName("");
    setStaffNumber("");
  };

  const addLecturer = () => {
    if (!name || !staffNumber) return;

    const existing = data.find((l) => l.staffNumber === staffNumber);
    if (existing) {
      alert("A lecturer with this staff number already exists");
      return;
    }

    const newLecturer: Lecturer = {
      id: `lecturer-${Date.now()}`,
      name,
      staffNumber,
    };
    onDataChange([...data, newLecturer]);
    resetForm();
  };

  const deleteLecturer = (id: string) => {
    onDataChange(data.filter((l) => l.id !== id));
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
            placeholder="e.g. Dr. Jane Smith"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Staff Number
          </label>
          <input
            type="text"
            value={staffNumber}
            onChange={(e) => setStaffNumber(e.target.value)}
            placeholder="e.g. L789012"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={addLecturer}
        disabled={!name || !staffNumber}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2 px-4 rounded-lg font-medium transition"
      >
        Add Lecturer
      </button>

      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No lecturers added yet.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-3 font-medium text-gray-700">Name</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700">Staff Number</th>
                <th className="w-1"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((lecturer) => (
                <tr key={lecturer.id} className="border-t border-gray-100">
                  <td className="py-2 px-3">{lecturer.name}</td>
                  <td className="py-2 px-3">{lecturer.staffNumber}</td>
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      onClick={() => deleteLecturer(lecturer.id)}
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
