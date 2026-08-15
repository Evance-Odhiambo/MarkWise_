"use client";

import { useState, useEffect } from "react";
import type { Institution } from "@/app/types/auth";

export default function InstitutionsAdminPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
  });

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/institutions");
      const data = await response.json();
      setInstitutions(data.institutions || []);
    } catch (err) {
      console.error("Failed to fetch institutions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const response = await fetch("/api/institutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      await fetchInstitutions();
      setShowForm(false);
      setFormData({ name: "" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this institution?")) return;

    await fetch(`/api/institutions?id=${id}`, { method: "DELETE" });
    await fetchInstitutions();
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Institutions</h1>
            <p className="text-gray-600">
              Manage institutions available for student and lecturer registration.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            {showForm ? "Cancel" : "Add Institution"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Harvard University"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Save Institution
            </button>
          </form>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                <th className="w-20 py-3 px-4 font-medium text-gray-700 text-right">Actions</th>
               </tr>
             </thead>
             <tbody>
               {loading ? (
                 <tr>
                   <td colSpan={2} className="py-8 px-4 text-center text-gray-500">
                     Loading institutions...
                   </td>
                 </tr>
               ) : institutions.length === 0 ? (
                 <tr>
                   <td colSpan={2} className="py-8 px-4 text-center text-gray-500">
                    No institutions added yet.
                  </td>
                </tr>
              ) : (
                institutions.map((inst) => (
                  <tr key={inst.id} className="border-t border-gray-100">
                    <td className="py-3 px-4">{inst.name}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleDelete(inst.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
