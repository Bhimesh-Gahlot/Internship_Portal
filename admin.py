import random
import string
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from flask_login import current_user
from flask import redirect, url_for, flash, request, Markup
from werkzeug.security import generate_password_hash
from models import User, Mentor, Student, PasswordChangeLog, db
from markupsafe import Markup
from wtforms import StringField

# Secure admin views - only accessible to admins
class SecureModelView(ModelView):
    def is_accessible(self):
        return current_user.is_authenticated and current_user.is_admin
    
    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('login', next=request.url))

# Custom Admin Home View
class MyAdminIndexView(AdminIndexView):
    @expose('/')
    def index(self):
        if not current_user.is_authenticated or not current_user.is_admin:
            return redirect(url_for('login'))
        return super(MyAdminIndexView, self).index()

# User Admin View with enhanced password management
class UserAdminView(SecureModelView):
    column_list = ('username', 'email', 'first_name', 'last_name', 'is_admin', 'password_actions')
    column_searchable_list = ('username', 'email', 'first_name', 'last_name')
    column_filters = ('is_admin',)
    form_excluded_columns = ('password_hash', 'temp_password')
    
    # Add a column for password actions
    def _password_actions(view, context, model, name):
        reset_url = url_for('user.reset_password', user_id=model.id)
        view_url = url_for('user.view_password', user_id=model.id)
        return Markup(
            f'<a class="btn btn-danger btn-sm" href="{reset_url}" '
            f'onclick="return confirm(\'Are you sure you want to reset the password for {model.username}?\');">'
            f'<i class="fa fa-key"></i> Reset</a> '
            f'<a class="btn btn-info btn-sm" href="{view_url}">'
            f'<i class="fa fa-eye"></i> Generate & View</a>'
        )
    
    column_formatters = {
        'password_actions': _password_actions
    }
    
    # Add a field for temporary password display
    form_extra_fields = {
        'temp_password_display': StringField('Temporary Password')
    }
    
    # Reset password action
    @expose('/reset_password/<int:user_id>', methods=['GET'])
    def reset_password(self, user_id):
        user = User.query.get(user_id)
        if not user:
            flash('User not found.', 'error')
            return redirect(url_for('user.index_view'))
        
        # Generate a secure random password
        new_password = self._generate_secure_password()
        
        # Hash the password and save
        user.password_hash = generate_password_hash(new_password)
        
        # Store temporary password for display
        user.temp_password = new_password
        
        # Log the password change
        log_entry = PasswordChangeLog(
            user=user,
            changed_by=current_user
        )
        db.session.add(log_entry)
        db.session.commit()
        
        flash(Markup(f'Password for <strong>{user.username}</strong> has been reset to: '
                    f'<code style="background-color: #ffffcc; padding: 5px; '
                    f'border-radius: 3px;">{new_password}</code>'), 'success')
        return redirect(url_for('user.edit_view', id=user_id))
    
    # Generate and view password action
    @expose('/view_password/<int:user_id>', methods=['GET'])
    def view_password(self, user_id):
        user = User.query.get(user_id)
        if not user:
            flash('User not found.', 'error')
            return redirect(url_for('user.index_view'))
        
        # Generate a secure random password
        new_password = self._generate_secure_password()
        
        # Hash the password and save
        user.password_hash = generate_password_hash(new_password)
        
        # Store temporary password for display
        user.temp_password = new_password
        
        # Log the password change
        log_entry = PasswordChangeLog(
            user=user,
            changed_by=current_user
        )
        db.session.add(log_entry)
        db.session.commit()
        
        # Return to the edit view with the password displayed
        flash(Markup(f'New password for <strong>{user.username}</strong>: '
                    f'<code style="background-color: #ffffcc; padding: 5px; '
                    f'border-radius: 3px;">{new_password}</code>'), 'success')
        return redirect(url_for('user.edit_view', id=user_id))
    
    def _generate_secure_password(self):
        """Generate a secure random password"""
        password_length = 12
        password_chars = string.ascii_letters + string.digits + "!@#$%^&*()"
        return ''.join(random.choice(password_chars) for i in range(password_length))
    
    # Override the edit form to display the temporary password
    def edit_form(self, obj=None):
        form = super(UserAdminView, self).edit_form(obj)
        if obj and hasattr(obj, 'temp_password') and obj.temp_password:
            form.temp_password_display.data = obj.temp_password
        return form

# Mentor Admin View
class MentorAdminView(SecureModelView):
    column_list = ('user.username', 'user.email', 'department', 'specialization', 'password_actions')
    column_searchable_list = ('user.username', 'user.email', 'department')
    column_filters = ('department',)
    
    def _password_actions(view, context, model, name):
        reset_url = url_for('user.reset_password', user_id=model.user_id)
        view_url = url_for('user.view_password', user_id=model.user_id)
        return Markup(
            f'<a class="btn btn-danger btn-sm" href="{reset_url}" '
            f'onclick="return confirm(\'Are you sure you want to reset the password?\');">'
            f'<i class="fa fa-key"></i> Reset</a> '
            f'<a class="btn btn-info btn-sm" href="{view_url}">'
            f'<i class="fa fa-eye"></i> Generate & View</a>'
        )
    
    column_formatters = {
        'password_actions': _password_actions
    }

# Student Admin View
class StudentAdminView(SecureModelView):
    column_list = ('user.username', 'user.email', 'registration_number', 'batch', 'mentor_rel.user.username', 'password_actions')
    column_searchable_list = ('user.username', 'user.email', 'registration_number')
    column_filters = ('batch', 'mentor_rel')
    
    def _password_actions(view, context, model, name):
        reset_url = url_for('user.reset_password', user_id=model.user_id)
        view_url = url_for('user.view_password', user_id=model.user_id)
        return Markup(
            f'<a class="btn btn-danger btn-sm" href="{reset_url}" '
            f'onclick="return confirm(\'Are you sure you want to reset the password?\');">'
            f'<i class="fa fa-key"></i> Reset</a> '
            f'<a class="btn btn-info btn-sm" href="{view_url}">'
            f'<i class="fa fa-eye"></i> Generate & View</a>'
        )
    
    column_formatters = {
        'password_actions': _password_actions
    }

# Password Change Log Admin View
class PasswordChangeLogAdminView(SecureModelView):
    column_list = ('user.username', 'changed_by.username', 'changed_at')
    column_filters = ('changed_at',)
    can_create = False
    can_edit = False
    can_delete = False

# Simplified User Admin View for testing
class SimpleUserAdminView(SecureModelView):
    column_list = ('username', 'email', 'is_admin', 'actions')
    
    def _format_actions(view, context, model, name):
        return Markup(
            f'<a href="/test-password-reset/{model.id}" class="btn btn-danger">Reset Password</a>'
        )
    
    column_formatters = {
        'actions': _format_actions
    }

# Initialize Flask-Admin
def init_admin(app):
    admin = Admin(app, name='Admin Dashboard', template_mode='bootstrap3', index_view=MyAdminIndexView())
    
    # Add views
    admin.add_view(UserAdminView(User, db.session, name='Users'))
    admin.add_view(MentorAdminView(Mentor, db.session, name='Mentors'))
    admin.add_view(StudentAdminView(Student, db.session, name='Students'))
    admin.add_view(PasswordChangeLogAdminView(PasswordChangeLog, db.session, name='Password Changes'))
    admin.add_view(SimpleUserAdminView(User, db.session, name='Simple Users'))
    
    return admin 