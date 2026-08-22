export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
}

export function validateContactForm(body: Partial<ContactForm>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!body.name || !body.name.trim()) errors.name = "Name is required.";
  if (!body.email || !/^([\w-.]+)@([\w-]+)\.([A-Za-z]{2,})$/.test(body.email)) errors.email = "Valid email required.";
  if (!body.category) errors.category = "Category is required.";
  if (!body.subject || !body.subject.trim()) errors.subject = "Subject is required.";
  if (!body.message || !body.message.trim()) errors.message = "Message is required.";
  return errors;
}