
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Send, X, Bold, Italic, Underline } from 'lucide-react';
import { EmojiPicker } from './EmojiPicker';
import { LinkInsertPopup } from './LinkInsertPopup';
import { ColorPicker } from './ColorPicker';
import { FontSelector } from './FontSelector';
import { AttachmentDropzone } from './AttachmentDropzone';

interface EmailMessage {
  id: string;
  subject: string;
  body: string;
  from_address: string;
  to_address: string;
  direction: 'incoming' | 'outgoing';
  created_at: string;
  client_id?: string;
  sent_via: string;
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalMessage: EmailMessage;
  onSend: (replyData: {
    to: string;
    subject: string;
    body: string;
    attachments: Attachment[];
  }) => void;
}

export const ReplyModal = ({ isOpen, onClose, originalMessage, onSend }: ReplyModalProps) => {
  const [to] = useState(originalMessage.from_address);
  const [subject, setSubject] = useState(`Re: ${originalMessage.subject || 'No Subject'}`);
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [currentFont, setCurrentFont] = useState('font-inter');
  const [currentSize, setCurrentSize] = useState('text-base');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [textStyles, setTextStyles] = useState({
    bold: false,
    italic: false,
    underline: false
  });

  const handleSend = () => {
    if (!body.trim()) return;

    onSend({
      to,
      subject,
      body: formatBodyWithStyles(),
      attachments
    });

    // Reset form
    setBody('');
    setAttachments([]);
    setTextStyles({ bold: false, italic: false, underline: false });
    onClose();
  };

  const formatBodyWithStyles = () => {
    let formattedBody = body;
    
    // Add original message quote
    const originalDate = new Date(originalMessage.created_at).toLocaleString();
    const quote = `\n\n--- Original Message ---\nFrom: ${originalMessage.from_address}\nDate: ${originalDate}\nSubject: ${originalMessage.subject}\n\n${originalMessage.body}`;
    
    return formattedBody + quote;
  };

  const insertText = (text: string) => {
    const textarea = document.getElementById('reply-body') as HTMLTextAreaElement;
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Reply to Message</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              value={to}
              disabled
              className="bg-gray-50"
            />
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
          </div>

          {/* Formatting Toolbar */}
          <div className="border rounded-lg p-2">
            <div className="flex items-center gap-1 flex-wrap">
              {/* Text Formatting */}
              <Button
                variant={textStyles.bold ? "secondary" : "ghost"}
                size="sm"
                type="button"
                onClick={() => toggleStyle('bold')}
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                variant={textStyles.italic ? "secondary" : "ghost"}
                size="sm"
                type="button"
                onClick={() => toggleStyle('italic')}
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                variant={textStyles.underline ? "secondary" : "ghost"}
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
            </div>
          </div>

          {/* Message Body */}
          <div className="space-y-2">
            <Label htmlFor="reply-body">Message</Label>
            <Textarea
              id="reply-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your reply..."
              className={`min-h-[200px] resize-none ${getTextareaClasses()}`}
              style={{ color: currentColor }}
            />
          </div>

          {/* Original Message Preview */}
          <div className="border-l-4 border-gray-300 pl-4 bg-gray-50 p-3 rounded">
            <div className="text-sm text-gray-600 mb-2">Original message:</div>
            <div className="text-sm">
              <div className="font-medium">{originalMessage.subject}</div>
              <div className="text-gray-600 text-xs mb-2">
                From: {originalMessage.from_address} • {new Date(originalMessage.created_at).toLocaleString()}
              </div>
              <div className="text-gray-800 max-h-20 overflow-y-auto">
                {originalMessage.body}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-500">
            {attachments.length > 0 && `${attachments.length} attachment(s)`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={!body.trim()}>
              <Send className="w-4 h-4 mr-2" />
              Send Reply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
