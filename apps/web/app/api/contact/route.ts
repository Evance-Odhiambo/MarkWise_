import { NextResponse } from "next/server";

type ContactForm = {
  name: string;
  email: string;
  subject: string;
  category: string;
  message: string;
};

function validate(body: Partial<ContactForm>) {
  const errors: Record<string, string> = {};
  if (!body.name || !body.name.trim()) errors.name = "Name is required.";
  if (!body.email || !/^([\w-.]+)@([\w-]+)\.([A-Za-z]{2,})$/.test(body.email)) errors.email = "Valid email required.";
  if (!body.category) errors.category = "Category is required.";
  if (!body.subject || !body.subject.trim()) errors.subject = "Subject is required.";
  if (!body.message || !body.message.trim()) errors.message = "Message is required.";
  return errors;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<ContactForm>;
    const errors = validate(body);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ message: "Validation failed.", errors }, { status: 400 });
    }

    // TODO: Replace with real persistence / email sending.
    // For now, log and return success.
    // Avoid logging sensitive data in production.
    console.log("Contact form received:", {
      name: body.name,
      email: body.email,
      category: body.category,
      subject: body.subject,
    });

    return NextResponse.json({ message: "Message received." });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }
}

export const runtime = "edge";
