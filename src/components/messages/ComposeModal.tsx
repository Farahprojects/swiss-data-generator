import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Send, X, Bold, Italic, Underline, Loader2 } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { LinkInsertPopup } from './LinkInsertPopup';
import { ColorPicker } from './ColorPicker';
import { FontSelector } from './FontSelector';
import { AttachmentDropzone } from './AttachmentDropzone';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend?: (messageData: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    attachments: Attachment[];
  }) => void;
}

export const ComposeModal = ({ isOpen, onClose, onSend }: ComposeModalProps) => {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentFont, setCurrentFont] = useState('font-inter');
  const [currentSize, setCurrentSize] = useState('text-base');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [textStyles, setTextStyles] = useState({
    bold: false,
    italic: false,
    underline: false
  });
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateEmailList = (emails: string) => {
    if (!emails.trim()) return true;
    return emails.split(',').every(email => validateEmail(email.trim()));
  };

  const formatBodyWithStyles = () => {
    let formattedBody = body;
    
    // Convert basic formatting to HTML
    if (textStyles.bold) {
      formattedBody = `<strong>${formattedBody}</strong>`;
    }
    if (textStyles.italic) {
      formattedBody = `<em>${formattedBody}</em>`;
    }
    if (textStyles.underline) {
      formattedBody = `<u>${formattedBody}</u>`;
    }
    
    // Apply color if not default
    if (currentColor !== '#000000') {
      formattedBody = `<span style="color: ${currentColor}">${formattedBody}</span>`;
    }
    
    // Convert line breaks to HTML
    formattedBody = formattedBody.replace(/\n/g, '<br>');
    
    return formattedBody;
  };

  const handleSend = async () => {
    // Validation
    if (!to.trim()) {
      toast({
        title: "Error",
        description: "Please enter a recipient email address.",
        variant: "destructive"
      });
      return;
    }

    if (!validateEmail(to.trim())) {
      toast({
        title: "Error",
        description: "Please enter a valid recipient email address.",
        variant: "destructive"
      });
      return;
    }

    if (cc && !validateEmailList(cc)) {
      toast({
        title: "Error",
        description: "Please enter valid CC email addresses.",
        variant: "destructive"
      });
      return;
    }

    if (bcc && !validateEmailList(bcc)) {
      toast({
        title: "Error",
        description: "Please enter valid BCC email addresses.",
        variant: "destructive"
      });
      return;
    }

    if (!body.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message before sending.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);

    try {
      const formattedBody = formatBodyWithStyles();
      
      // Call the outbound-messenger edge function
      const { data, error } = await supabase.functions.invoke('outbound-messenger', {
        body: {
          to: to.trim(),
          subject: subject.trim() || 'No Subject',
          html: formattedBody,
          text: body // Also send plain text version
        }
      });

      if (error) {
        console.error('Error sending email:', error);
        toast({
          title: "Error",
          description: "Failed to send email. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Call the original onSend callback if provided
      if (onSend) {
        onSend({
          to: to.trim(),
          subject: subject.trim() || 'No Subject',
          body: formattedBody,
          cc: cc.trim() || undefined,
          bcc: bcc.trim() || undefined,
          attachments
        });
      }

      toast({
        title: "Success",
        description: "Email sent successfully!"
      });

      // Reset form
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setBody('');
      setAttachments([]);
      setShowCc(false);
      setShowBcc(false);
      setTextStyles({ bold: false, italic: false, underline: false });
      setCurrentColor('#000000');
      onClose();

    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const insertText = (text: string) => {
    const textarea = document.getElementById('compose-body') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentBody = body;
      const newBody = currentBody.substring(0, start) + text + currentBody.substring(end);
      setBody(newBody);
      
      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
        textarea.focus();
      }, 0);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    insertText(emoji);
  };

  const handleLinkInsert = (url: string, linkText: string) => {
    insertText(`[${linkText}](${url})`);
  };

  const toggleStyle = (style: 'bold' | 'italic' | 'underline') => {
    setTextStyles(prev => ({
      ...prev,
      [style]: !prev[style]
    }));
  };

  const getTextareaClasses = () => {
    let classes = `${currentFont} ${currentSize}`;
    if (textStyles.bold) classes += ' font-bold';
    if (textStyles.italic) classes += ' italic';
    if (textStyles.underline) classes += ' underline';
    return classes;
  };

  const handleClose = () => {
    if (body.trim() || subject.trim() || to.trim()) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Recipients */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Label htmlFor="to" className="w-12 text-sm font-medium">
                To:
              </Label>
              <Input
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@email.com"
                className="flex-1"
              />
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCc(!showCc)}
                  className={showCc ? 'bg-primary text-primary-foreground' : ''}
                >
                  Cc
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBcc(!showBcc)}
                  className={showBcc ? 'bg-primary text-primary-foreground' : ''}
                >
                  Bcc
                </Button>
              </div>
            </div>

            {showCc && (
              <div className="flex items-center space-x-2">
                <Label htmlFor="cc" className="w-12 text-sm font-medium">
                  Cc:
                </Label>
                <Input
                  id="cc"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@email.com"
                  className="flex-1"
                />
              </div>
            )}

            {showBcc && (
              <div className="flex items-center space-x-2">
                <Label htmlFor="bcc" className="w-12 text-sm font-medium">
                  Bcc:
                </Label>
                <Input
                  id="bcc"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@email.com"
                  className="flex-1"
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Label htmlFor="subject" className="w-12 text-sm font-medium">
                Subject:
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Message subject"
                className="flex-1"
              />
            </div>
          </div>

          {/* Message Body */}
          <div className="space-y-2">
            <Label htmlFor="compose-body">Message</Label>
            <Textarea
              id="compose-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..."
              className={`min-h-[200px] resize-none ${getTextareaClasses()}`}
              style={{ color: currentColor }}
            />
          </div>
        </div>

        {/* Actions with formatting tools */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-1">
            {/* Text Formatting */}
            <Button
              variant={textStyles.bold ? "default" : "ghost"}
              size="sm"
              type="button"
              onClick={() => toggleStyle('bold')}
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              variant={textStyles.italic ? "default" : "ghost"}
              size="sm"
              type="button"
              onClick={() => toggleStyle('italic')}
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              variant={textStyles.underline ? "default" : "ghost"}
              size="sm"
              type="button"
              onClick={() => toggleStyle('underline')}
            >
              <Underline className="w-4 h-4" />
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Font and Color Tools */}
            <FontSelector
              onFontSelect={setCurrentFont}
              onFontSizeSelect={setCurrentSize}
              currentFont={currentFont}
              currentSize={currentSize}
            />
            <ColorPicker
              onColorSelect={setCurrentColor}
              currentColor={currentColor}
            />

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Content Tools */}
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
            <LinkInsertPopup onLinkInsert={handleLinkInsert} />
            <AttachmentDropzone
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
            
            {attachments.length > 0 && (
              <span className="text-sm text-muted-foreground ml-2">
                {attachments.length} attachment(s)
              </span>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={!to.trim() || !body.trim() || isSending}>
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
