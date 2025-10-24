"""
Custom Django Email Backend using Brevo (Sendinblue) API
Perfect for Railway deployment - no SMTP needed
300 emails/day FREE with no credit card required
"""
import os
import logging
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)

try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException
    BREVO_AVAILABLE = True
except ImportError:
    BREVO_AVAILABLE = False
    logger.warning("Brevo (sib-api-v3-sdk) package not installed. Email sending will fail.")


class BrevoEmailBackend(BaseEmailBackend):
    """
    Email backend that uses Brevo (Sendinblue) API instead of SMTP
    
    Advantages over SMTP:
    - Works on Railway (no SMTP port restrictions)
    - 300 emails/day free (vs Resend's 100)
    - Send to ANY email (no domain verification needed)
    - Professional email delivery
    """
    
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = os.getenv('BREVO_API_KEY')
        
        if not self.api_key:
            if not fail_silently:
                raise ValueError("BREVO_API_KEY environment variable is not set")
            logger.error("BREVO_API_KEY not set. Emails will not be sent.")
        
        # Configure Brevo API client
        if BREVO_AVAILABLE and self.api_key:
            self.configuration = sib_api_v3_sdk.Configuration()
            self.configuration.api_key['api-key'] = self.api_key
            self.api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
                sib_api_v3_sdk.ApiClient(self.configuration)
            )
        else:
            self.api_instance = None
    
    def send_messages(self, email_messages):
        """
        Send one or more EmailMessage objects and return the number of email
        messages sent.
        """
        if not BREVO_AVAILABLE:
            logger.error("Brevo package not available")
            if not self.fail_silently:
                raise ImportError("sib-api-v3-sdk package is not installed. Run: pip install sib-api-v3-sdk")
            return 0
        
        if not self.api_key or not self.api_instance:
            logger.error("BREVO_API_KEY not configured")
            if not self.fail_silently:
                raise ValueError("BREVO_API_KEY is not set")
            return 0
        
        num_sent = 0
        for message in email_messages:
            try:
                sent = self._send(message)
                if sent:
                    num_sent += 1
            except Exception as e:
                logger.error(f"Failed to send email: {str(e)}")
                if not self.fail_silently:
                    raise
        
        return num_sent
    
    def _send(self, email_message):
        """Send a single email message via Brevo API"""
        if not email_message.recipients():
            return False
        
        # Get from email and parse name/email
        from_email = email_message.from_email or os.getenv('DEFAULT_FROM_EMAIL', 'noreply@pharmago.com')
        
        # Parse "Name <email@domain.com>" format
        if '<' in from_email and '>' in from_email:
            from_name = from_email.split('<')[0].strip()
            from_email_addr = from_email.split('<')[1].split('>')[0].strip()
        else:
            from_name = "PharmGo"
            from_email_addr = from_email
        
        # Prepare sender
        sender = {
            "name": from_name,
            "email": from_email_addr
        }
        
        # Prepare recipients
        to_list = [{"email": email} for email in email_message.to]
        
        # Prepare email data
        email_data = {
            "sender": sender,
            "to": to_list,
            "subject": email_message.subject,
        }
        
        # Add CC if present
        if email_message.cc:
            email_data["cc"] = [{"email": email} for email in email_message.cc]
        
        # Add BCC if present
        if email_message.bcc:
            email_data["bcc"] = [{"email": email} for email in email_message.bcc]
        
        # Add reply-to if present
        if email_message.reply_to:
            email_data["replyTo"] = {"email": email_message.reply_to[0]}
        
        # Handle HTML vs plain text
        if isinstance(email_message, EmailMultiAlternatives) and email_message.alternatives:
            # Has HTML content
            for content, mimetype in email_message.alternatives:
                if mimetype == 'text/html':
                    email_data["htmlContent"] = content
                    break
            # Include plain text as fallback
            if email_message.body:
                email_data["textContent"] = email_message.body
        else:
            # Plain text only
            email_data["textContent"] = email_message.body
        
        try:
            # Create SendSmtpEmail object
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(**email_data)
            
            # Send via Brevo API
            api_response = self.api_instance.send_transac_email(send_smtp_email)
            
            logger.info(
                f"Email sent successfully via Brevo. "
                f"Message ID: {api_response.message_id}, "
                f"To: {', '.join(email_message.to)}"
            )
            return True
            
        except ApiException as e:
            logger.error(f"Brevo API error: {e}")
            if not self.fail_silently:
                raise
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending email: {str(e)}")
            if not self.fail_silently:
                raise
            return False

