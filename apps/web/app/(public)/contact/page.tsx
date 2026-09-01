"use client";
import React, { useState, useCallback } from "react";
import AppHeader from "@/components/layout/app-header";
import AppFooter from "@/components/layout/app-footer";
import LogoIcon from "@/components/shared/logo-icon";

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
}

const initialForm: ContactForm = {
  name: "",
  email: "",
  subject: "",
  category: "",
  message: "",
};

const ContactPage: React.FC = () => {
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ContactForm, string>>
  >({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = useCallback((values: ContactForm) => {
    const nextErrors: Partial<Record<keyof ContactForm, string>> = {};
    if (!values.name.trim()) nextErrors.name = "Please enter your name.";
    if (!values.email.trim()) nextErrors.email = "Please enter your email.";
    else if (!/^[\w-.]+@[\w-]+\.[A-Za-z]{2,}$/.test(values.email))
      nextErrors.email = "Please enter a valid email.";
    if (!values.category) nextErrors.category = "Please choose a category.";
    if (!values.subject.trim()) nextErrors.subject = "Please enter a subject.";
    if (!values.message.trim()) nextErrors.message = "Please enter a message.";
    return nextErrors;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setServerError(
          data?.message || "Something went wrong. Please try again.",
        );
        setIsSubmitting(false);
        return;
      }

      setIsSubmitted(true);
      setForm(initialForm);
    } catch (err) {
      setServerError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-linear-to-b from-slate-50 to-white">
      <AppHeader />

      <main className="grow">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 mb-6 shadow-lg">
                <LogoIcon className="w-10 h-10" variant="light" />
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4">
                Get in Touch
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Have questions, feedback, or need assistance? Our team is here
                to help. Whether you&apos;re evaluating MarkWise for your
                institution or need support with an existing account,
                we&apos;d love to hear from you.
              </p>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6">
                Send a Message
              </h3>

              {isSubmitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6">
                    <svg
                      className="w-8 h-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-3">
                    Message Sent!
                  </h4>
                  <p className="text-slate-600 mb-6">
                    Thank you for reaching out. We&apos;ll get back to you
                    within 24-48 hours.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                    aria-live="polite"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {serverError && (
                    <div role="alert" className="text-sm text-red-600">
                      {serverError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                        aria-invalid={!!errors.name}
                        aria-describedby={
                          errors.name ? "name-error" : undefined
                        }
                        placeholder="Jane Smith"
                      />
                      {errors.name && (
                        <p
                          id="name-error"
                          className="text-xs text-red-600 mt-2"
                        >
                          {errors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                        aria-invalid={!!errors.email}
                        aria-describedby={
                          errors.email ? "email-error" : undefined
                        }
                        placeholder="jane@university.edu"
                      />
                      {errors.email && (
                        <p
                          id="email-error"
                          className="text-xs text-red-600 mt-2"
                        >
                          {errors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Category
                      </label>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors bg-white"
                        aria-invalid={!!errors.category}
                        aria-describedby={
                          errors.category ? "category-error" : undefined
                        }
                      >
                        <option value="">Select a category</option>
                        <option value="general">General Inquiry</option>
                        <option value="support">Technical Support</option>
                        <option value="sales">Sales & Partnerships</option>
                        <option value="feedback">Feedback & Suggestions</option>
                      </select>
                      {errors.category && (
                        <p
                          id="category-error"
                          className="text-xs text-red-600 mt-2"
                        >
                          {errors.category}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                        aria-invalid={!!errors.subject}
                        aria-describedby={
                          errors.subject ? "subject-error" : undefined
                        }
                        placeholder="How can we help you?"
                      />
                      {errors.subject && (
                        <p
                          id="subject-error"
                          className="text-xs text-red-600 mt-2"
                        >
                          {errors.subject}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Message
                      </label>
                      <textarea
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors resize-none"
                        aria-invalid={!!errors.message}
                        aria-describedby={
                          errors.message ? "message-error" : undefined
                        }
                        placeholder="Please provide as much detail as possible..."
                      />
                      {errors.message && (
                        <p
                          id="message-error"
                          className="text-xs text-red-600 mt-2"
                        >
                          {errors.message}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-linear-to-r from-green-600 to-teal-700 hover:from-green-700 hover:to-teal-800 text-white py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Send Message"
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
};

export default ContactPage;
