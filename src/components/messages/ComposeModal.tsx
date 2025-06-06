
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send, X, Paperclip, Bold, Italic, Link } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (messageData: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
  }) => void;
}

export const ComposeModal = ({ isOpen, onClose, onSend }: ComposeModalProps) => {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!to.trim() || !body.trim()) {
      return;
    }

    setSending(true);
    try {
      await onSend({
        to: to.trim(),
        subject: subject.trim() || 'No Subject',
        body: body.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
      });
      
      // Reset form
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setBody('');
      setShowCc(false);
      setShowBcc(false);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    // Could add a confirmation dialog if there's content
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>New Message</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
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
                  className={showCc ? 'text-blue-600' : ''}
                >
                  Cc
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBcc(!showBcc)}
                  className={showBcc ? 'text-blue-600' : ''}
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

          {/* Formatting Toolbar */}
          <div className="flex items-center gap-1 py-2 border-y">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Link className="h-4 w-4" />
            </Button>
            <div className="h-4 w-px bg-gray-300 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>

          {/* Message Body */}
          <div className="flex-1 flex flex-col">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 resize-none min-h-[200px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Paperclip className="w-4 h-4 mr-1" />
              Attach
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={!to.trim() || !body.trim() || sending}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
