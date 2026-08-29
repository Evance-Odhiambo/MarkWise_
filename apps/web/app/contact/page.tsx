"use client";
import React, { useState, useCallback } from "react";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import LogoIcon from "../../components/LogoIcon";

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
      const res = await fetch("/api/contact", {
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
                to help. Whether you're evaluating MarkWise for your institution
                or need support with an existing account, we'd love to hear from
                you.
              </p>
            </div>

            {/* Three Contact Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              {/* Email Card */}
              <div className="group bg-white rounded-2xl p-8 shadow-md border border-slate-100 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Email Us
                </h3>
                <p className="text-slate-600 text-sm mb-4">
                  Send us an email and we'll respond within 24-48 hours.
                </p>
                <div className="space-y-2">
                  <a
                    href="mailto:info@markwise.com"
                    className="block text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                  >
                    info@markwise.com
                  </a>
                  <a
                    href="mailto:support@markwise.com"
                    className="block text-slate-600 hover:text-emerald-700 transition-colors"
                  >
                    support@markwise.com{" "}
                    <span className="text-xs text-slate-500">(Support)</span>
                  </a>
                </div>
              </div>

              {/* Contact Card */}
              <div className="group bg-white rounded-2xl p-8 shadow-md border border-slate-100 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.124 3.372a1 1 0 01-.524 1.224l-2.074.828a1 1 0 00-.566.566l-.828 2.074a1 1 0 01-1.224.524V14a1 1 0 001 1h3m9-9V7a2 2 0 012-2h3a1 1 0 011 1v3m0 0v10a2 2 0 01-2 2h-5m-9 0h.01M12 12v6m-3-3h6"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Contact Info
                </h3>
                <p className="text-slate-600 text-sm mb-4">
                  Reach us by phone during business hours.
                </p>
                <div className="space-y-3">
                  <p className="text-emerald-700 font-medium text-lg">
                    +1 (617) 555-0123
                  </p>
                  <p className="text-slate-600 text-sm">
                    Mon – Fri: 9:00 AM – 6:00 PM EST
                    <br />
                    Sat – Sun: 10:00 AM – 4:00 PM EST
                  </p>
                  <a
                    href="https://wa.me/16175550123"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-slate-600 hover:text-emerald-700 transition-colors text-sm"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12.04 3.01C7.59 3.01 4 6.6 4 11.05c0 1.95.52 3.87 1.5 5.6l-.28 3.35 2.9-.73c1.16.82 2.54 1.29 4.05 1.29 4.45 0 8.04-3.59 8.04-8.04S16.49 3.01 12.04 3.01zm0 14.08c-1.41 0-2.75-.37-3.92-1.05l-.28-.16-2.49.62.64-2.62-.32-.52c-.82-1.31-1.27-2.78-1.27-4.3v-.27c0-2.9 2.37-5.27 5.28-5.27 1.41 0 2.75.37 3.92 1.05l.28.16 2.49-.62-.64 2.62.32.52.88 1.41.28.52c0 .01 0 .02.01.03 0 .19-.01.38-.01.57 0 2.9-2.37 5.28-5.28 5.28z" />
                    </svg>
                    WhatsApp
                  </a>
                </div>
              </div>

              {/* Location Card */}
              <div className="group bg-white rounded-2xl p-8 shadow-md border border-slate-100 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17.657 16.657L12.394 21.92a1 1 0 01-1.414 0L5.343 16.657a1 1 0 01-.34-.533L3.5 12.25V7a1 1 0 011-1h4.5a.5.5 0 01.5.5v4a1 1 0 102 0V6.5a.5.5 0 01.5-.5H18a1 1 0 011 1v5.25l-.493 3.874a1 1 0 01-.34.533z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 7V4a3 3 0 116 0v3m-3 5h.01M12 11v5"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  Our Location
                </h3>
                <p className="text-slate-600 text-sm mb-4">
                  Visit our office in Juja. We're open Mon-Fri 9am-6pm.
                </p>
                <div className="space-y-2">
                  <p className="text-slate-900 font-medium">JHUB Africa</p>
                  <p className="text-slate-600">
                    Juja, Kenya
                    <br />
                  </p>
                  <a
                    href="https://maps.google.com/?q=123+University+Avenue,+Cambridge,+MA"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors mt-2"
                  >
                    Get Directions
                  </a>
                </div>
              </div>
            </div>

            {/* FAQ Quick Link */}
            <div className="bg-linear-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-100 mb-12 text-center">
              <h4 className="text-lg font-semibold text-slate-900 mb-3">
                Need Immediate Help?
              </h4>
              <p className="text-slate-600 text-sm mb-4">
                Check our comprehensive documentation and community forums for
                quick answers.
              </p>
              <a
                href="/docs"
                className="inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
              >
                Visit Documentation
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 8l4 4m0 0l-4 4m4-4H7"
                  />
                </svg>
              </a>
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
                    Thank you for reaching out. We'll get back to you within
                    24-48 hours.
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
