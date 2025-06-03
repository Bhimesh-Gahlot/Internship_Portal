from flask_mail import Mail, Message
from app import app
from threading import Thread

mail = Mail(app)

def send_async_email(app, msg):
    with app.app_context():
        mail.send(msg)

def send_email(subject, recipients, body, html=None):
    try:
        msg = Message(
            subject=subject,
            recipients=recipients,
            body=body,
            html=html
        )
        
        Thread(target=send_async_email, args=(app, msg)).start()
        return True
        
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False

def send_report_submission_notification(student_email, mentor_email, report_type):
    subject = f"New {report_type} Report Submission"
    body = f"A new {report_type} report has been submitted and is pending review."
    
    # Notify mentor
    send_email(
        subject=subject,
        recipients=[mentor_email],
        body=body
    )
    
    # Notify student
    send_email(
        subject="Report Submission Confirmation",
        recipients=[student_email],
        body=f"Your {report_type} report has been submitted successfully."
    ) 