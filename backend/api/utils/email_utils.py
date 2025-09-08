"""
Email utility functions for PharmaGo application.
"""
import logging
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.urls import reverse

logger = logging.getLogger(__name__)


def send_pharmacy_welcome_email(pharmacy, login_token):
    """
    Send welcome email to approved pharmacy with login link.
    
    Args:
        pharmacy: Pharmacy model instance
        login_token: TemporaryLoginToken instance
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Generate the login link
        login_link = f"{settings.FRONTEND_URL}/initial-login?token={login_token.token}"
        
        # Prepare email context
        context = {
            'pharmacy_name': pharmacy.pharmacy_name,
            'business_email': pharmacy.business_email,
            'login_link': login_link,
        }
        
        # Render email templates
        html_content = render_to_string('emails/pharmacy_welcome.html', context)
        text_content = render_to_string('emails/pharmacy_welcome.txt', context)
        
        # Email subject
        subject = f"Welcome to PharmaGo - Your Pharmacy Account is Approved!"
        
        # Send email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[pharmacy.business_email],
        )
        email.attach_alternative(html_content, "text/html")
        
        result = email.send()
        
        if result:
            logger.info(f"Welcome email sent successfully to {pharmacy.business_email} for pharmacy {pharmacy.pharmacy_name}")
            return True
        else:
            logger.error(f"Failed to send welcome email to {pharmacy.business_email}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending welcome email to {pharmacy.business_email}: {str(e)}")
        return False


def send_simple_email(subject, message, recipient_email, html_message=None):
    """
    Send a simple email message.
    
    Args:
        subject: Email subject
        message: Plain text message
        recipient_email: Recipient email address
        html_message: Optional HTML message
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        result = send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False,
        )
        
        if result:
            logger.info(f"Email sent successfully to {recipient_email}")
            return True
        else:
            logger.error(f"Failed to send email to {recipient_email}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending email to {recipient_email}: {str(e)}")
        return False
