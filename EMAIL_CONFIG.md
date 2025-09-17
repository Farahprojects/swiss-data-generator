# Email Configuration Documentation

## Overview
This document outlines the complete email system configuration for TheRAI email infrastructure, including VPS setup, Postfix configuration, OpenDKIM signing, and Supabase edge functions.

## VPS Email Infrastructure

### Server Details
- **Main IP**: 5.161.196.180
- **Floating IP**: 5.161.20.187
- **Domain**: therai.co
- **Mail Domain**: mail.therai.co

### DNS Records
```
A     mail.therai.co        → 5.161.20.187
A     therai.co            → 5.161.20.187
AAAA  mail.therai.co       → 2a01:4ff:f0:4b95::1
MX    therai.co            → mail.therai.co (priority 10)
TXT   therai.co            → "v=spf1 ip4:5.161.20.187 ip6:2a01:4ff:f0:4b95::1 -all"
TXT   default._domainkey   → [DKIM public key]
TXT   _dmarc               → "v=DMARC1; p=quarantine; rua=mailto:info@theraiastro.com; fo=1; adkim=s; aspf=s; pct=100"
```

## Postfix Configuration

### Main Configuration File
**Location**: `/etc/postfix/main.cf`

**Key Settings**:
```ini
# Network interfaces
inet_interfaces = 127.0.0.1, [::1], 5.161.20.187

# Domain settings
myhostname = mail.therai.co
mydomain = therai.co
mydestination = $myhostname, localhost, localhost.localdomain

# TLS Configuration
smtpd_tls_cert_file = /etc/letsencrypt/live/mail.therai.co/fullchain.pem
smtpd_tls_key_file = /etc/letsencrypt/live/mail.therai.co/privkey.pem
smtpd_tls_security_level = may

# OpenDKIM Milter Integration
smtpd_milters = inet:localhost:8891
non_smtpd_milters = inet:localhost:8891
milter_default_action = accept
milter_protocol = 6
```

### Master Configuration File
**Location**: `/etc/postfix/master.cf`

**Key Settings**:
```ini
# SMTP service
smtp      inet  n       -       y       -       -       smtpd

# Custom pipe transport for therai domains
therai-flask unix - n n - - pipe
    flags=Fq user=therai 
    argv=/usr/bin/python3 /usr/local/therai/inbox_v187.py
```

## OpenDKIM Configuration

### Main Configuration File
**Location**: `/etc/opendkim.conf`

**Key Settings**:
```ini
# Socket configuration
Socket inet:8891@localhost

# Key and signing
KeyTable /etc/opendkim/key.table
SigningTable /etc/opendkim/signing.table

# Trust and hosts
TrustAnchorFile /usr/share/dns/root.key
ExternalIgnoreList /etc/opendkim/trusted.hosts
InternalHosts /etc/opendkim/trusted.hosts

# Logging
Syslog yes
SyslogSuccess yes
LogWhy yes
```

### Signing Table
**Location**: `/etc/opendkim/signing.table`

**Current Entries**:
```
@therai.co                    default._domainkey.therai.co
noreply@therai.co            default._domainkey.therai.co
no-reply@therai.co           default._domainkey.therai.co
info@therai.co               default._domainkey.therai.co
hello@therai.co              default._domainkey.therai.co
contact@therai.co            default._domainkey.therai.co
help@therai.co               default._domainkey.therai.co
marketing@therai.co          default._domainkey.therai.co
admin@therai.co              default._domainkey.therai.co
legal@therai.co              default._domainkey.therai.co
hr@therai.co                 default._domainkey.therai.co
dev@therai.co                default._domainkey.therai.co
```

### Key Table
**Location**: `/etc/opendkim/key.table`

**Current Entries**:
```
default._domainkey.therai.co therai.co:default:/etc/opendkim/keys/therai.co/default.private
```

### DKIM Keys
**Location**: `/etc/opendkim/keys/therai.co/`
- `default.private` - Private key for signing
- `default.txt` - Public key for DNS

## Email Processing Scripts

### Incoming Email Handler
**Location**: `/usr/local/therai/inbox_v187.py`

**Purpose**: Processes incoming emails and forwards to Supabase edge function

**Key Features**:
- Receives emails from Postfix via pipe transport
- Extracts email content and metadata
- Forwards to `inboundMessenger` edge function
- Handles domain/slug validation

### Outbound Email Handler
**Location**: `/opt/send_outbound.py`

**Purpose**: Processes outbound emails from Supabase edge functions

**Key Features**:
- Receives JSON payload from edge functions
- Validates email data
- Injects emails into Postfix for delivery
- Logs all email attempts

## Supabase Edge Functions

### Inbound Email Processing
**Function**: `inboundMessenger`

**Purpose**: Processes incoming emails from VPS

**Key Features**:
- Validates email format and direction
- Extracts clean email addresses
- Saves to `email_messages` table
- Handles domain/slug validation

### Outbound Email Processing
**Function**: `outbound-messenger`

**Purpose**: Sends emails via VPS SMTP endpoint

**Key Features**:
- Validates email data
- Sends payload to VPS SMTP endpoint
- Logs VPS response
- Saves to database only if VPS approves

### Verification Email
**Function**: `verification-emailer`

**Purpose**: Sends verification emails during signup

**Key Features**:
- Uses same SMTP endpoint as outbound-messenger
- Sends verification emails with templates
- Handles signup flow

## Database Configuration

### Email Messages Table
**Table**: `public.email_messages`

**Key Columns**:
- `id` - Primary key
- `from_email` - Sender email
- `to_email` - Recipient email
- `subject` - Email subject
- `body` - Email content
- `direction` - 'inbound' or 'outgoing'
- `raw_headers` - VPS response data
- `created_at` - Timestamp

### Domain Slugs Table
**Table**: `public.domain_slugs`

**Purpose**: Validates domain/slug combinations

**Current Configuration**:
```sql
UPDATE public.domain_slugs 
SET 
    info = true,
    media = true,
    billing = true,
    support = true,
    noreply = true,
    hello = true,
    contact = true,
    help = true,
    marketing = true,
    admin = true,
    legal = true,
    hr = true,
    dev = true
WHERE domain = 'therai.co';
```

## Service Management

### Systemd Services
```bash
# Postfix
systemctl status postfix
systemctl restart postfix
systemctl reload postfix

# OpenDKIM
systemctl status opendkim
systemctl restart opendkim
systemctl reload opendkim
```

### Service Dependencies
**File**: `/etc/systemd/system/postfix.service.d/override.conf`
```ini
[Unit]
After=opendkim.service
Requires=opendkim.service
```

## Logging and Monitoring

### Log Locations
- **Postfix**: `/var/log/mail.log`
- **OpenDKIM**: `journalctl -u opendkim`
- **Outbound**: `/var/log/outbound_sender.log`

### Log Rotation Configuration
**Postfix logs** (`/var/log/mail.log`):
- **Rotation**: Weekly
- **Retention**: 4 weeks
- **Compression**: Yes (gzip)
- **Config**: `/etc/logrotate.d/rsyslog`

**Outbound sender logs** (`/var/log/outbound_sender.log`):
- **Rotation**: Daily
- **Retention**: 7 days
- **Compression**: Yes (gzip)
- **Config**: `/etc/logrotate.d/outbound-sender`

### Key Log Patterns
```bash
# Check incoming connections
tail -f /var/log/mail.log | grep -i "connect\|ehlo\|helo"

# Check DKIM signing
tail -f /var/log/mail.log | grep -i dkim

# Check outbound email processing
tail -f /var/log/outbound_sender.log
```

### Log Management Commands
```bash
# Check log sizes
du -h /var/log/mail.log* /var/log/outbound_sender.log*

# Test log rotation
logrotate -d /etc/logrotate.d/outbound-sender

# Force log rotation
logrotate -f /etc/logrotate.d/outbound-sender

# Check logrotate status
cat /var/lib/logrotate/status | grep -E "(mail|outbound)"
```

## Troubleshooting Commands

### Check Service Status
```bash
# Check all email services
systemctl status postfix opendkim

# Check listening ports
netstat -tlnp | grep :25
netstat -tlnp | grep :8891
```

### Test Email Flow
```bash
# Test local email delivery
echo "Test message" | mail -s "Test Subject" info@therai.co

# Test external connection
telnet 5.161.20.187 25

# Check DNS resolution
dig MX therai.co
dig A mail.therai.co
```

### Validate Configuration
```bash
# Check Postfix configuration
postfix check

# Check OpenDKIM configuration
opendkim-testkey -d therai.co -s default

# Check TLS certificates
openssl s_client -connect mail.therai.co:25 -starttls smtp
```

## Adding New Email Addresses/Slugs

### 1. Update OpenDKIM Signing Table
```bash
# Edit signing table
nano /etc/opendkim/signing.table

# Add new email address
newemail@therai.co    default._domainkey.therai.co

# Reload OpenDKIM
systemctl reload opendkim
```

### 2. Update Domain Slugs Table
```sql
-- Add new slug column if needed
ALTER TABLE public.domain_slugs 
ADD COLUMN IF NOT EXISTS newslug boolean DEFAULT false;

-- Enable slug for domain
UPDATE public.domain_slugs 
SET newslug = true
WHERE domain = 'therai.co';
```

### 3. Update VPS Scripts
- Modify `/usr/local/therai/inbox_v187.py` if needed
- Update `/opt/send_outbound.py` if needed

## Security Considerations

### Firewall Rules
- Port 25 (SMTP) - Open for incoming mail
- Port 587 (Submission) - Not configured
- Port 465 (SMTPS) - Not configured

### TLS Configuration
- Uses Let's Encrypt certificates
- TLS security level: `may` (optional but preferred)
- Self-signed certificates for internal communication

### DKIM Security
- 2048-bit RSA keys
- Relaxed/simple canonicalization
- Headers: From, To, Subject, Date, Message-ID

## Backup and Recovery

### Critical Files to Backup
- `/etc/postfix/main.cf`
- `/etc/postfix/master.cf`
- `/etc/opendkim/opendkim.conf`
- `/etc/opendkim/signing.table`
- `/etc/opendkim/key.table`
- `/etc/opendkim/keys/therai.co/`
- `/usr/local/therai/inbox_v187.py`
- `/opt/send_outbound.py`

### Database Backups
- `public.email_messages` table
- `public.domain_slugs` table
- `public.email_notification_templates` table

## Environment Variables

### Supabase Edge Functions
- `OUTBOUND_SMTP_ENDPOINT` - VPS SMTP endpoint URL
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

### VPS Environment
- No additional environment variables required
- Configuration via files only

## Maintenance Schedule

### Daily
- Monitor email logs for errors
- Check service status

### Weekly
- Review email delivery rates
- Check DKIM key rotation (if needed)

### Monthly
- Review and update domain slugs
- Check TLS certificate expiration
- Review firewall rules

## Support Contacts

### VPS Provider
- [VPS Provider Support]

### Domain Registrar
- [Domain Registrar Support]

### Supabase Support
- [Supabase Support]

---

**Last Updated**: 2025-09-17
**Version**: 1.0
**Maintainer**: TheRAI Development Team
