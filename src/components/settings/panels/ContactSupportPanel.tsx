
import { useState, useRef } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type SupportFile = {
  file: File;
  id: string;
  preview?: string;
};

const SUPPORTED_FORMATS = ["image/jpeg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6MB
const MAX_FILES = 3;

export const ContactSupportPanel = () => {
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [files, setFiles] = useState<SupportFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const newFiles = Array.from(e.target.files);
    
    if (files.length + newFiles.length > MAX_FILES) {
      toast({
        title: "Too many files",
        description: "You can upload up to 3 attachments only.",
        variant: "destructive"
      });
      return;
    }
    
    const validFiles = newFiles.filter(file => {
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        toast({
          title: "Invalid file format",
          description: `${file.name} is not a supported format. Please upload JPEG, PNG, or PDF.`,
          variant: "destructive"
        });
        return false;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 6MB limit.`,
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    });
    
    const filesToAdd = validFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    
    setFiles(prev => [...prev, ...filesToAdd]);
    
    // Reset the input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const removeFile = (id: string) => {
    setFiles(prev => {
      const updatedFiles = prev.filter(file => file.id !== id);
      // Clean up any URL.createObjectURL resources
      const removedFile = prev.find(file => file.id === id);
      if (removedFile?.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      return updatedFiles;
    });
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!subject || !message.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a subject and enter a message.",
        variant: "destructive"
      });
      return;
    }
    
    if (!user?.email) {
      toast({
        title: "Authentication required",
        description: "Please sign in to contact support.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.functions.invoke('contact-form-handler', {
        body: {
          name: user.user_metadata?.full_name || user.email.split('@')[0],
          email: user.email,
          subject: subject,
          message: message.trim()
        }
      });
      
      if (error) {
        throw error;
      }
      
      // Success
      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you soon.",
      });
      
      // Reset form
      setSubject("");
      setMessage("");
      setFiles(files => {
        // Clean up URL.createObjectURL resources
        files.forEach(file => {
          if (file.preview) {
            URL.revokeObjectURL(file.preview);
          }
        });
        return [];
      });
    } catch (error) {
      console.error('Contact form error:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Contact Support</CardTitle>
        <CardDescription>We're here to help. Select a subject and tell us what's going on.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="subject" className="text-sm font-medium">
              Subject
            </label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger id="subject" className="rounded-lg">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="api">API Issue</SelectItem>
                <SelectItem value="billing">Billing Issue</SelectItem>
                <SelectItem value="account">Account Problem</SelectItem>
                <SelectItem value="general">General Inquiry</SelectItem>
                <SelectItem value="marketing">Marketing/Partnership Inquiry</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message
            </label>
            <Textarea
              id="message"
              placeholder="Type your message here..."
              className="min-h-[150px] rounded-lg resize-y"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Attachments</label>
              <span className="text-xs text-gray-500">
                Max 3 files (JPEG, PNG, PDF) up to 6MB each
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1"
                >
                  <span className="text-sm truncate max-w-[200px]">
                    {file.file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="text-gray-600 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {files.length < MAX_FILES && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex gap-2 rounded-md"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={16} />
                  <span>Add file</span>
                </Button>
              )}
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".jpeg,.jpg,.png,.pdf"
                multiple
                className="hidden"
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="rounded-lg w-full"
          >
            {isSubmitting ? "Sending..." : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
