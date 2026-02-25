# School Management Web Application

A comprehensive web application for managing a Nigerian secondary school with student, teacher, and administrative functionality.

## Core Features

### Public Pages
- **Landing Page**: School branding, mission statement, and navigation to key sections with "Get Started" button that opens registration modal
- **About Page**: School information and details
- **Contact Page**: Contact form with backend processing
- **Subjects Page**: Display of 9 core subjects (Physics, Chemistry, Biology, Agricultural Science, Geography, English, Mathematics, Economics, Marketing) with descriptions

### Authentication System
- **Internet Identity Integration**: Secure authentication using Internet Identity
- **Registration Modal**: Modal interface triggered by "Get Started" button on landing page
- **Role Selection**: Modal first displays role selection step asking users to choose between "Student" or "Teacher" registration
- **Registration Forms**: After role selection, the modal displays the corresponding registration form with smooth transitions
- **Profile Completion**: After initial login, users complete their profile with name, email, and optional photo upload for teachers and students
- **Authentication State Display**: User-friendly indicators for loading, logged in, and logged out states
- **Automatic Navigation**: After profile completion and approval request submission, users are automatically directed to their respective dashboards

### Student Portal
- **Dashboard**: Personal profile view with prominently displayed name and profile image in header/profile card, enrolled subjects display, grades overview, message center, and downloadable learning materials for enrolled subjects
- **Profile Management**: Update personal information and upload profile image functionality
- **Learning Materials Access**: View and download PDF materials uploaded by teachers for subjects the student is enrolled in
- **Ask Teacher Tab**: Chat-like interface for sending questions to teachers filtered by enrolled subjects, view conversation history with teachers for each subject
- **Exams Tab**: View upcoming exams for enrolled subjects, take exams within allowed time with timer functionality, view exam results after completion
- **Quizzes Tab**: View available quizzes for enrolled subjects, take quizzes within specified time limits with timer functionality, select answers for multiple-choice questions, submit completed quizzes, and view quiz results and scores

### Teacher Portal
- **Dashboard**: View assigned subjects and manage student interactions
- **Student Management**: Access to student information for assigned subjects
- **Photo Upload**: Capability to upload and manage profile photos
- **Learning Materials Management**: Upload PDF materials for assigned subjects with file type restriction to PDF only
- **Student Questions Tab**: View questions received from students for each assigned subject, reply to questions inline with responses appearing in students' view
- **Exams Section**: Create and manage exams for assigned subjects, specify exam duration and questions with multiple choice options, view student exam results
- **Create Quiz Tab**: Quiz creation interface with question builder for assigned subjects, specify quiz title, duration, and multiple-choice questions with one correct answer each

### Admin Panel
- **Admin Authentication**: Secure admin login system using Internet Identity
- **Enhanced User Management Dashboard**: 
  - **Real-time Data Display**: Show all registered students and teachers with live data from backend queries using `getStudentsWithApprovalStatus` and `getTeachersWithApprovalStatus` functions
  - **Tabbed Interface**: Clear separation with dedicated tabs for "Students" and "Teachers" sections, both populated correctly with backend data
  - **Comprehensive User Information**: Display name, email, role, registration date, and current approval status for each user in sortable, searchable tables grouped by role
  - **Search and Filter Functionality**: Search users by name and email, with sorting options by name, email, registration date, and approval status
  - **Visual Status Indicators**: Color-coded badges showing approval status (pending, approved, rejected) with dynamic count summaries for each status type that update automatically after actions
  - **Live Status Counters**: Real-time counters displaying totals for pending, approved, and rejected users for each role (students and teachers)
  - **Interactive Action Buttons**: Individual "Approve" and "Reject" buttons for each pending user row that trigger `setApproval` backend calls
  - **Confirmation Modals**: Modal dialogs to confirm approval/rejection actions before execution
  - **Loading States**: Loading indicators displayed during approval/rejection actions and data fetching
  - **Real-time Updates**: Instant dashboard refresh using React Query invalidation after approval/rejection actions without page reload
  - **Toast Notifications**: Success and error feedback messages for all approval actions with clear messaging
  - **Status Management**: Handle all three approval states (pending, approved, rejected) with appropriate visual distinctions
  - **Backend Integration**: Utilize existing `listApprovals`, `setApproval`, `getStudentsWithApprovalStatus`, and `getTeachersWithApprovalStatus` functions through `useQueries.ts` with proper cache invalidation and refetching
  - **Automatic List Refresh**: Lists automatically refresh after each approval action to reflect updated statuses
  - **Responsive Design**: Tables and buttons adapt to different screen sizes for optimal mobile and desktop experience
- **Subject Assignment**: Assign subjects to approved teachers
- **Data Management**: Manage student records, teacher records, and system messages

## Backend Data Storage

### User Management
- Internet Identity principals linked to user accounts
- Student and teacher profiles with registration status (pending/approved/rejected)
- Student profile images stored in blob storage
- User roles and permissions
- Profile completion status and approval requests
- Registration dates for tracking purposes

### Academic Data
- Subject information and descriptions
- Student-subject enrollments
- Grade records
- Teacher-subject assignments
- Learning materials (PDF files) stored in blob storage with metadata including subjectId, teacherPrincipal, filename, and uploadDate

### Student-Teacher Interactions
- Messages between students and teachers linked to specific subjects
- Message structure including sender, receiver, subjectId, message text, timestamp, and message type (question or reply)
- Conversation threads organized by subject and teacher-student pairs

### Examination System
- Exam records with examId, subjectId, teacherPrincipal, questions with multiple choice options, correct answers, duration, and start time
- Student exam submissions and results
- Exam scheduling and availability tracking

### Quiz System
- Quiz records with quizId, subjectId, teacherPrincipal, quiz title, questions with multiple choice options, correct answers, and duration
- Student quiz submissions and automatically calculated scores
- Quiz availability and completion tracking per student

### Communication
- System messages between users
- Contact form submissions

## Backend Operations

### User Approval System
- **setApproval Function**: Backend function to update user approval status (approve/reject)
- **getStudentsWithApprovalStatus Function**: Retrieve all students with their current approval status
- **getTeachersWithApprovalStatus Function**: Retrieve all teachers with their current approval status
- **listApprovals Function**: Backend function for listing approval data
- **Real-time Data Queries**: Support for live data fetching to keep admin dashboard current
- **Status Tracking**: Maintain and update approval states across all user interactions
- **Search and Filter Support**: Backend functions to support searching and filtering users by name, email, and approval status
- **Status Count Queries**: Backend functions to provide counts of users by approval status for dashboard indicators

### File Management
- **Profile Image Storage**: Store and retrieve student profile images using blob storage
- **Learning Materials Storage**: Store PDF files uploaded by teachers with metadata linking to subjects
- **Access Control**: Enforce permissions so only teachers can upload materials and only enrolled students can access subject materials
- **File Metadata Management**: Track uploaded files with subject associations, teacher principals, filenames, and upload dates

### Interaction Management
- **sendQuestion Function**: Allow students to send questions to teachers for specific subjects
- **replyToQuestion Function**: Enable teachers to respond to student questions
- **getConversation Function**: Retrieve conversation history between student and teacher for a specific subject

### Examination Management
- **createExam Function**: Allow teachers to create exams for their assigned subjects with questions, duration, and scheduling
- **getExamsBySubject Function**: Retrieve available exams for specific subjects
- **submitExamAnswers Function**: Process student exam submissions
- **getStudentExamResult Function**: Retrieve exam results for students

### Quiz Management
- **createQuiz Function**: Allow teachers to create quizzes for their assigned subjects with title, questions, and duration
- **getQuizzesBySubject Function**: Retrieve available quizzes for specific subjects with access control for enrolled students
- **submitQuizAnswers Function**: Process student quiz submissions and automatically calculate scores
- **getStudentQuizResults Function**: Retrieve quiz results and scores for students
- **Access Control**: Enforce that only assigned teachers can create quizzes and only enrolled students can take them

## User Workflow

1. **Public Access**: Browse school information and subjects
2. **Registration Initiation**: Users click "Get Started" button on landing page to open registration modal
3. **Role Selection**: Users choose between "Student" or "Teacher" registration in the modal
4. **Authentication**: Users authenticate via Internet Identity
5. **Registration**: Users complete registration forms based on selected role within the modal
6. **Profile Completion**: Users complete their profiles including optional profile image upload and submit approval requests
7. **Admin Approval**: Admin reviews and manages all user accounts from the enhanced dashboard with tabbed interface populated with accurate backend data, sortable and searchable tables, dynamic status count indicators, confirmation modals, loading states, real-time data refresh, responsive interactive buttons, and instant feedback with success/error toast notifications
8. **Subject Assignment**: Admin assigns subjects to approved teachers
9. **Student Enrollment**: Approved students enroll in available subjects
10. **Learning Materials**: Teachers upload PDF materials for their assigned subjects, students access materials for enrolled subjects
11. **Student-Teacher Interaction**: Students send questions to teachers through chat-like interface, teachers respond to questions for their assigned subjects
12. **Examination Process**: Teachers create and schedule exams for their subjects, students take exams within specified time limits and view results
13. **Quiz Management**: Teachers create quizzes with multiple-choice questions for their assigned subjects, students take available quizzes for enrolled subjects within time limits and view automatically calculated scores
14. **Daily Operations**: Students view grades, messages, learning materials, interact with teachers, take exams and quizzes; teachers manage assigned subjects, upload materials, respond to student questions, create exams and quizzes
