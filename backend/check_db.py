from app import app
from extensions import db
from models.user import User
from models.student import Student
from models.mentor import Mentor
from models.internship import Internship
from models.mentor_assignment import MentorAssignment

def check_database():
    with app.app_context():
        print("====== DATABASE CHECK ======")
        
        # Check Users
        users = User.query.all()
        print(f"\nUsers ({len(users)}):")
        for user in users:
            print(f"  ID: {user.id}, Email: {user.email}, Role: {user.role}")
        
        # Check Students
        students = Student.query.all()
        print(f"\nStudents ({len(students)}):")
        for student in students:
            print(f"  ID: {student.id}, User ID: {student.user_id}, Name: {student.name}, Reg: {student.registration_number}")
            
            # Check if user exists
            user = User.query.get(student.user_id)
            if not user:
                print(f"    WARNING: No user found for student {student.id} with user_id {student.user_id}")
            
        # Check Mentors
        mentors = Mentor.query.all()
        print(f"\nMentors ({len(mentors)}):")
        for mentor in mentors:
            print(f"  ID: {mentor.id}, User ID: {mentor.user_id}, Name: {mentor.name}")
            
            # Check if user exists
            user = User.query.get(mentor.user_id)
            if not user:
                print(f"    WARNING: No user found for mentor {mentor.id} with user_id {mentor.user_id}")
        
        # Check Internships
        internships = Internship.query.all()
        print(f"\nInternships ({len(internships)}):")
        for internship in internships:
            print(f"  ID: {internship.id}, Student ID: {internship.student_id}, Company: {internship.company_name}")
            
            # Check if user exists
            user = User.query.get(internship.student_id)
            if not user:
                print(f"    WARNING: No user found for internship {internship.id} with student_id {internship.student_id}")
            
            # Check if student profile exists
            student = Student.query.filter_by(user_id=internship.student_id).first()
            if not student:
                print(f"    WARNING: No student profile found for internship {internship.id} with student_id {internship.student_id}")
        
        # Check Mentor Assignments
        assignments = MentorAssignment.query.all()
        print(f"\nMentor Assignments ({len(assignments)}):")
        for assignment in assignments:
            print(f"  ID: {assignment.id}, Student ID: {assignment.student_id}, Mentor ID: {assignment.mentor_id}")
            
            # Check if student exists
            student = Student.query.get(assignment.student_id)
            if not student:
                print(f"    WARNING: No student found for assignment {assignment.id} with student_id {assignment.student_id}")
            
            # Check if mentor exists
            mentor = Mentor.query.get(assignment.mentor_id)
            if not mentor:
                print(f"    WARNING: No mentor found for assignment {assignment.id} with mentor_id {assignment.mentor_id}")
        
        print("\n====== END DATABASE CHECK ======")

if __name__ == "__main__":
    check_database() 