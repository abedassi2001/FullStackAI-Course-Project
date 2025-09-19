# Email Configuration Setup

To enable email functionality for sending database files, you need to configure SMTP settings.

## Gmail Setup (Recommended)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Set the following environment variables:

```bash
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
EMAIL_FROM=your-email@gmail.com
```

## Other Email Providers

### Outlook/Hotmail
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo
```bash
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

## Setting Environment Variables

### Option 1: Create a .env file in the backend directory
```bash
# backend/.env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### Option 2: Set system environment variables
```bash
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_SECURE=false
export SMTP_USER=your-email@gmail.com
export SMTP_PASS=your-app-password
export EMAIL_FROM=your-email@gmail.com
```

## Testing Email Configuration

The email service will log warnings if SMTP credentials are missing. Once configured, you can test by:

1. Upload a database file
2. Click the "Email .db" button
3. Check the server logs for email sending status

## Troubleshooting

- **"Email failed: Database file not found"**: The database file wasn't saved properly during upload
- **SMTP connection errors**: Check your email credentials and app password
- **Authentication failed**: Make sure 2FA is enabled and you're using an app password, not your regular password
