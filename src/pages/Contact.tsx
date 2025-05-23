
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { logToSupabase } from "@/utils/batchedLogManager";

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    logToSupabase("Contact form submission started", {
      level: 'info',
      page: 'Contact',
      data: { 
        name: formData.name,
        email: formData.email,
        subject: formData.subject
      }
    });

    try {
      const response = await fetch(
        "https://wrvqqvqvwqmfdqvqmaar.functions.supabase.co/functions/v1/send-email",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: "support@theraiastro.com",
            from: "Theria Contact <no-reply@theraiastro.com>",
            subject: `Contact Form: ${formData.subject}`,
            html: `
              <h2>New Contact Message</h2>
              <p><strong>From:</strong> ${formData.name} (${formData.email})</p>
              <p><strong>Subject:</strong> ${formData.subject}</p>
              <hr />
              <p><strong>Message:</strong></p>
              <p>${formData.message.replace(/\n/g, '<br>')}</p>
            `,
            text: `
              New Contact Message
              
              From: ${formData.name} (${formData.email})
              Subject: ${formData.subject}
              
              Message:
              ${formData.message}
            `
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorData}`);
      }
      
      logToSupabase("Contact form submission successful", {
        level: 'info',
        page: 'Contact'
      });
      
      toast({
        title: "Message sent!",
        description: "Thanks for reaching out. We'll respond soon."
      });
      
      // Reset form after successful submission
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      logToSupabase("Contact form submission failed", {
        level: 'error',
        page: 'Contact',
        data: { error: error.message }
      });
      
      toast({
        title: "Something went wrong",
        description: "We couldn't send your message. Please try again later.",
        variant: "destructive"
      });
      
      console.error("Error sending contact form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-grow">
        <section className="bg-white py-20 text-center">
          <h1 className="text-4xl font-bold text-primary md:text-5xl mb-4">
            Get in Touch
          </h1>
          <p className="text-gray-600 text-lg">
            Reach out about the API, partnerships, or anything else we can help with.
          </p>
        </section>

        <section className="py-16">
          <div className="container mx-auto max-w-3xl px-4">
            <div className="rounded-xl border p-8 shadow-sm">
              <h2 className="mb-6 text-2xl font-semibold text-primary">Send a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="API Support">API Support</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Billing">Billing</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full py-6">
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </div>

            <div className="mt-12 text-center text-sm text-gray-500">
              <Mail className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p>support@theraiapi.com</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
