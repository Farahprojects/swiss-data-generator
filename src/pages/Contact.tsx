
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { logToSupabase } from "@/utils/batchedLogManager";
import { validateEmail } from "@/utils/authValidation";

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    honeypot: "" // Invisible field to catch bots
  });
  const [formErrors, setFormErrors] = useState({
    name: false,
    email: false,
    subject: false,
    message: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Clear "thank you" state when component mounts (on page refresh)
  useEffect(() => {
    // Remove submitted state from localStorage on refresh
    localStorage.removeItem("contactFormSubmitted");
    
    // Get the submitted status value only after the component mounts
    const hasSubmitted = localStorage.getItem("contactFormSubmitted");
    if (hasSubmitted === "true") {
      setSubmitted(true);
    }
  }, []);

  // Scroll to top when showing the thank you message
  useEffect(() => {
    if (submitted) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [submitted]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (attemptedSubmit) {
      setFormErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors = {
      name: !formData.name.trim(),
      email: !formData.email.trim() || !validateEmail(formData.email),
      subject: !formData.subject,
      message: !formData.message.trim(),
    };
    
    setFormErrors(errors);
    return !Object.values(errors).some(error => error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    
    // Validate form before submission
    if (!validateForm()) {
      toast({
        title: "Please check your form",
        description: "All fields are required and email must be valid.",
        variant: "destructive"
      });
      return;
    }
    
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
      // Set a timeout to detect slow responses
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request is taking longer than expected, but we\'re still processing it.'));
        }, 5000); // 5 second timeout
      });

      // The actual fetch request
      const fetchPromise = fetch(
        "https://wrvqqvqvwqmfdqvqmaar.functions.supabase.co/functions/v1/contact-form-handler",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      // Show a processing toast after 3 seconds if still submitting
      const toastTimeoutId = setTimeout(() => {
        if (isSubmitting) {
          toast({
            title: "Processing your message",
            description: "This is taking a bit longer than usual. Please wait..."
          });
        }
      }, 3000);

      // Race between timeout and actual fetch
      try {
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        clearTimeout(toastTimeoutId);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server responded with ${response.status}`);
        }
        
        logToSupabase("Contact form submission successful", {
          level: 'info',
          page: 'Contact'
        });
        
        // IMPROVED: Immediately show success state without waiting for background operations
        setSubmitted(true);
        localStorage.setItem("contactFormSubmitted", "true");
        
        // Reset form after successful submission
        setFormData({ name: "", email: "", subject: "", message: "", honeypot: "" });
        setIsSubmitting(false);

      } catch (timeoutError) {
        // If it was our timeout error, show a non-destructive toast but don't treat it as a failure yet
        if (timeoutError instanceof Error && timeoutError.message.includes('taking longer than expected')) {
          toast({
            title: "Please wait",
            description: "We're still processing your message. You'll see confirmation soon."
          });

          // Continue with the fetch in the background
          fetchPromise.then(response => {
            clearTimeout(toastTimeoutId);
            if (!response.ok) {
              throw new Error(`Server responded with ${response.status}`);
            }
            // IMPROVED: Set submitted state immediately when we get a response
            setSubmitted(true);
            localStorage.setItem("contactFormSubmitted", "true");
            // Reset form after successful submission
            setFormData({ name: "", email: "", subject: "", message: "", honeypot: "" });
            setIsSubmitting(false);
          }).catch(actualError => {
            setIsSubmitting(false);
            toast({
              title: "Something went wrong",
              description: actualError instanceof Error ? actualError.message : "We couldn't send your message. Please try again later.",
              variant: "destructive"
            });
          });
        } else {
          // Handle other errors
          throw timeoutError;
        }
      }
    } catch (error) {
      logToSupabase("Contact form submission failed", {
        level: 'error',
        page: 'Contact',
        data: { error: error instanceof Error ? error.message : String(error) }
      });
      
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "We couldn't send your message. Please try again later.",
        variant: "destructive"
      });
      
      console.error("Error sending contact form:", error);
      setIsSubmitting(false);
    }
  };

  // Thank you message component
  const ThankYouMessage = () => (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <CheckCircle className="h-16 w-16 text-primary mb-6 animate-bounce" />
      <h2 className="text-3xl font-bold text-primary mb-4">Thank You for Reaching Out</h2>
      <p className="text-lg text-gray-600 max-w-lg mb-6">
        Your message has been successfully received. We appreciate your inquiry and will respond to you within 24 hours.
      </p>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-grow">
        {submitted ? (
          <ThankYouMessage />
        ) : (
          <>
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
                    {/* Honeypot field - invisible to humans but bots will fill it */}
                    <div className="absolute opacity-0 pointer-events-none">
                      <Label htmlFor="honeypot">Leave this empty</Label>
                      <Input 
                        id="honeypot" 
                        name="honeypot" 
                        value={formData.honeypot} 
                        onChange={handleChange} 
                        tabIndex={-1} 
                        autoComplete="off"
                      />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center">
                          Name <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Input 
                          id="name" 
                          name="name" 
                          value={formData.name} 
                          onChange={handleChange} 
                          required 
                          className={formErrors.name ? "border-red-500" : ""}
                        />
                        {formErrors.name && (
                          <p className="text-xs text-red-500 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" /> Name is required
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center">
                          Email <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Input 
                          type="email" 
                          id="email" 
                          name="email" 
                          value={formData.email} 
                          onChange={handleChange} 
                          required 
                          className={formErrors.email ? "border-red-500" : ""}
                        />
                        {formErrors.email && (
                          <p className="text-xs text-red-500 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" /> Valid email address is required
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="flex items-center">
                        Subject <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className={`w-full rounded-md border px-3 py-2 text-sm ${formErrors.subject ? "border-red-500" : ""}`}
                      >
                        <option value="">Select</option>
                        <option value="General Inquiry">General Inquiry</option>
                        <option value="API Support">API Support</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Billing">Billing</option>
                      </select>
                      {formErrors.subject && (
                        <p className="text-xs text-red-500 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" /> Subject is required
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="flex items-center">
                        Message <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        className={formErrors.message ? "border-red-500" : ""}
                      />
                      {formErrors.message && (
                        <p className="text-xs text-red-500 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" /> Message is required
                        </p>
                      )}
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full py-6">
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </span>
                      ) : "Send Message"}
                    </Button>
                  </form>
                </div>

                <div className="mt-12 text-center text-sm text-gray-500">
                  <Mail className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <p>support@theraiapi.com</p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
