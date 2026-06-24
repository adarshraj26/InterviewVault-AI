import ContactClient from "./contact-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | InterviewVault AI",
  description: "Get in touch with the InterviewVault AI team. We're here to help you accelerate your engineering career.",
};

export default function ContactPage() {
  return <ContactClient />;
}
