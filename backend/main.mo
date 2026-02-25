import AccessControl "authorization/access-control";
import UserApproval "user-approval/approval";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Debug "mo:base/Debug";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";
import Nat "mo:base/Nat";

actor SchoolManagement {
  // Initialize access control and approval states
  let accessControlState = AccessControl.initState();
  let approvalState = UserApproval.initState(accessControlState);

  // Initialize storage for file uploads
  let storage = Storage.new();
  include MixinStorage(storage);

  // Data types
  public type Subject = {
    id : Text;
    name : Text;
    description : Text;
  };

  public type StudentProfile = {
    name : Text;
    email : Text;
    profileImage : ?Storage.ExternalBlob;
    enrolledSubjects : [Text];
    grades : [(Text, Nat)];
    registrationDate : Int;
  };

  public type TeacherProfile = {
    name : Text;
    email : Text;
    photo : ?Storage.ExternalBlob;
    assignedSubjects : [Text];
    registrationDate : Int;
  };

  public type AdminProfile = {
    name : Text;
    email : Text;
  };

  public type Message = {
    id : Text;
    from : Principal;
    to : Principal;
    subject : Text;
    content : Text;
    timestamp : Int;
  };

  public type UserProfile = {
    name : Text;
  };

  public type LearningMaterial = {
    id : Text;
    subjectId : Text;
    teacherPrincipal : Principal;
    filename : Text;
    uploadDate : Int;
    file : Storage.ExternalBlob;
  };

  public type InteractionMessage = {
    messageId : Text;
    sender : Principal;
    receiver : Principal;
    subjectId : Text;
    messageText : Text;
    timestamp : Int;
    messageType : {
      #question;
      #reply;
    };
  };

  public type Exam = {
    examId : Text;
    subjectId : Text;
    teacherPrincipal : Principal;
    questions : [ExamQuestion];
    duration : Nat;
    startTime : Int;
  };

  public type ExamQuestion = {
    text : Text;
    options : [Text];
    correctAnswer : ?Nat;
  };

  public type ExamSubmission = {
    examId : Text;
    studentPrincipal : Principal;
    answers : [Nat];
    timestamp : Int;
    score : ?Nat;
    graded : Bool;
  };

  // New type for quiz
  public type Quiz = {
    quizId : Text;
    subjectId : Text;
    teacherPrincipal : Principal;
    title : Text;
    questions : [QuizQuestion];
    duration : Nat;
    createdAt : Int;
  };

  public type QuizQuestion = {
    text : Text;
    options : [Text];
    correctAnswer : ?Nat;
  };

  public type QuizSubmission = {
    quizId : Text;
    studentPrincipal : Principal;
    answers : [Nat];
    timestamp : Int;
    score : Nat;
    completed : Bool;
  };

  // OrderedMap operations
  transient let textMap = OrderedMap.Make<Text>(Text.compare);
  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);

  // Storage for subjects and profiles
  var subjects = textMap.empty<Subject>();
  var studentProfiles = principalMap.empty<StudentProfile>();
  var teacherProfiles = principalMap.empty<TeacherProfile>();
  var adminProfiles = principalMap.empty<AdminProfile>();
  var userProfiles = principalMap.empty<UserProfile>();
  var messages = textMap.empty<Message>();
  var learningMaterials = textMap.empty<LearningMaterial>();
  var messageCounter : Nat = 0;

  // Storage for interactions and exams
  var interactionMessages = textMap.empty<InteractionMessage>();
  var interactionCounter : Nat = 0;
  var exams = textMap.empty<Exam>();
  var examSubmissions = textMap.empty<ExamSubmission>();
  var examCounter : Nat = 0;

  // Storage for quizzes
  var quizzes = textMap.empty<Quiz>();
  var quizSubmissions = textMap.empty<QuizSubmission>();
  var quizCounter : Nat = 0;

  // Initialize default subjects
  func initializeSubjects() {
    let defaultSubjects = [
      ("physics", { id = "physics"; name = "Physics"; description = "Study of matter, energy, and the laws of nature." }),
      ("chemistry", { id = "chemistry"; name = "Chemistry"; description = "Study of substances, their properties, and reactions." }),
      ("biology", { id = "biology"; name = "Biology"; description = "Study of living organisms and life processes." }),
      ("agricultural_science", { id = "agricultural_science"; name = "Agricultural Science"; description = "Study of farming, crops, and animal husbandry." }),
      ("geography", { id = "geography"; name = "Geography"; description = "Study of the earth, its features, and human activity." }),
      ("english", { id = "english"; name = "English"; description = "Study of the English language and literature." }),
      ("mathematics", { id = "mathematics"; name = "Mathematics"; description = "Study of numbers, quantities, and shapes." }),
      ("economics", { id = "economics"; name = "Economics"; description = "Study of production, consumption, and wealth distribution." }),
      ("marketing", { id = "marketing"; name = "Marketing"; description = "Study of promoting and selling products or services." }),
    ];
    subjects := textMap.fromIter(Iter.fromArray(defaultSubjects));
  };

  // Initialize subjects on first deployment
  initializeSubjects();

  // Access control functions
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // User approval functions
  public query ({ caller }) func isCallerApproved() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can check approval status");
    };
    AccessControl.hasPermission(accessControlState, caller, #admin) or UserApproval.isApproved(approvalState, caller);
  };

  public shared ({ caller }) func requestApproval() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can request approval");
    };
    UserApproval.requestApproval(approvalState, caller);
  };

  public shared ({ caller }) func setApproval(user : Principal, status : UserApproval.ApprovalStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.setApproval(approvalState, user, status);
  };

  public query ({ caller }) func listApprovals() : async [UserApproval.UserApprovalInfo] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    UserApproval.listApprovals(approvalState);
  };

  // Subject management
  public query func getSubjects() : async [Subject] {
    // Public access - anyone can view subjects
    Iter.toArray(textMap.vals(subjects));
  };

  public query func getSubject(id : Text) : async ?Subject {
    // Public access - anyone can view a subject
    textMap.get(subjects, id);
  };

  // Generic user profile management (required by instructions)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  // Student profile management
  public shared ({ caller }) func saveStudentProfile(profile : StudentProfile) : async () {
    // Users can create/update their own student profile (needed for registration)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save student profiles");
    };
    studentProfiles := principalMap.put(studentProfiles, caller, profile);
  };

  public query ({ caller }) func getCallerStudentProfile() : async ?StudentProfile {
    // Users can view their own profile even if not approved
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view student profiles");
    };
    principalMap.get(studentProfiles, caller);
  };

  public query ({ caller }) func getStudentProfile(user : Principal) : async ?StudentProfile {
    // Verify caller is at least a user
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view profiles");
    };

    // Students can view their own profile
    if (caller == user) {
      return principalMap.get(studentProfiles, user);
    };

    // Admins can view any student profile
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return principalMap.get(studentProfiles, user);
    };

    // Check if caller is an approved teacher with assigned subjects
    if (not UserApproval.isApproved(approvalState, caller)) {
      Debug.trap("Unauthorized: Only approved users can view other student profiles");
    };

    switch (principalMap.get(teacherProfiles, caller)) {
      case (?teacherProfile) {
        // Teacher can view student if they share a subject
        switch (principalMap.get(studentProfiles, user)) {
          case (?studentProfile) {
            let hasSharedSubject = Array.find<Text>(
              teacherProfile.assignedSubjects,
              func(subjectId : Text) : Bool {
                Array.find<Text>(studentProfile.enrolledSubjects, func(s : Text) : Bool { s == subjectId }) != null
              }
            );
            if (hasSharedSubject != null) {
              return ?studentProfile;
            };
          };
          case null {};
        };
      };
      case null {};
    };

    Debug.trap("Unauthorized: Can only view your own profile or students in your assigned subjects");
  };

  public query ({ caller }) func listAllStudents() : async [(Principal, StudentProfile)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can list all students");
    };
    Iter.toArray(principalMap.entries(studentProfiles));
  };

  // Student enrollment in subjects
  public shared ({ caller }) func enrollInSubject(subjectId : Text) : async () {
    // Verify caller is a user first
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can enroll in subjects");
    };

    // Verify caller is approved
    if (not (UserApproval.isApproved(approvalState, caller))) {
      Debug.trap("Unauthorized: Only approved students can enroll in subjects");
    };

    // Verify caller has a student profile (not a teacher)
    switch (principalMap.get(studentProfiles, caller)) {
      case null {
        Debug.trap("Unauthorized: Only students can enroll in subjects");
      };
      case (?profile) {
        // Verify subject exists
        switch (textMap.get(subjects, subjectId)) {
          case null { Debug.trap("Subject not found"); };
          case (?_) {};
        };

        // Check if already enrolled
        let alreadyEnrolled = Array.find<Text>(profile.enrolledSubjects, func(s : Text) : Bool { s == subjectId });
        if (alreadyEnrolled != null) {
          Debug.trap("Already enrolled in this subject");
        };

        let updatedProfile = {
          name = profile.name;
          email = profile.email;
          profileImage = profile.profileImage;
          enrolledSubjects = Array.append(profile.enrolledSubjects, [subjectId]);
          grades = profile.grades;
          registrationDate = profile.registrationDate;
        };
        studentProfiles := principalMap.put(studentProfiles, caller, updatedProfile);
      };
    };
  };

  // Teacher profile management
  public shared ({ caller }) func saveTeacherProfile(profile : TeacherProfile) : async () {
    // Users can create/update their own teacher profile (needed for registration)
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save teacher profiles");
    };
    teacherProfiles := principalMap.put(teacherProfiles, caller, profile);
  };

  public query ({ caller }) func getCallerTeacherProfile() : async ?TeacherProfile {
    // Users can view their own profile even if not approved
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view teacher profiles");
    };
    principalMap.get(teacherProfiles, caller);
  };

  public query ({ caller }) func getTeacherProfile(user : Principal) : async ?TeacherProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(teacherProfiles, user);
  };

  public query ({ caller }) func listAllTeachers() : async [(Principal, TeacherProfile)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can list all teachers");
    };
    Iter.toArray(principalMap.entries(teacherProfiles));
  };

  // Admin assigns subjects to teachers
  public shared ({ caller }) func assignSubjectToTeacher(teacher : Principal, subjectId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can assign subjects to teachers");
    };

    // Verify subject exists
    switch (textMap.get(subjects, subjectId)) {
      case null { Debug.trap("Subject not found"); };
      case (?_) {};
    };

    switch (principalMap.get(teacherProfiles, teacher)) {
      case (?profile) {
        // Check if already assigned
        let alreadyAssigned = Array.find<Text>(profile.assignedSubjects, func(s : Text) : Bool { s == subjectId });
        if (alreadyAssigned != null) {
          Debug.trap("Subject already assigned to this teacher");
        };

        let updatedProfile = {
          name = profile.name;
          email = profile.email;
          photo = profile.photo;
          assignedSubjects = Array.append(profile.assignedSubjects, [subjectId]);
          registrationDate = profile.registrationDate;
        };
        teacherProfiles := principalMap.put(teacherProfiles, teacher, updatedProfile);
      };
      case null {
        Debug.trap("Teacher profile not found");
      };
    };
  };

  // Grade management
  public shared ({ caller }) func assignGrade(student : Principal, subjectId : Text, grade : Nat) : async () {
    // Verify caller is at least a user
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can assign grades");
    };

    // Only teachers with assigned subject or admins can assign grades
    var authorized = false;

    if (AccessControl.isAdmin(accessControlState, caller)) {
      authorized := true;
    } else {
      // Verify caller is approved
      if (not UserApproval.isApproved(approvalState, caller)) {
        Debug.trap("Unauthorized: Only approved teachers can assign grades");
      };

      switch (principalMap.get(teacherProfiles, caller)) {
        case (?teacherProfile) {
          let hasSubject = Array.find<Text>(teacherProfile.assignedSubjects, func(s : Text) : Bool { s == subjectId });
          if (hasSubject != null) {
            authorized := true;
          };
        };
        case null {};
      };
    };

    if (not authorized) {
      Debug.trap("Unauthorized: Only teachers assigned to this subject or admins can assign grades");
    };

    // Verify subject exists
    switch (textMap.get(subjects, subjectId)) {
      case null { Debug.trap("Subject not found"); };
      case (?_) {};
    };

    switch (principalMap.get(studentProfiles, student)) {
      case (?profile) {
        // Check if student is enrolled in the subject
        let isEnrolled = Array.find<Text>(profile.enrolledSubjects, func(s : Text) : Bool { s == subjectId });
        if (isEnrolled == null) {
          Debug.trap("Student is not enrolled in this subject");
        };

        // Update or add grade
        let updatedGrades = Buffer.Buffer<(Text, Nat)>(profile.grades.size());
        var gradeUpdated = false;

        for ((subj, g) in profile.grades.vals()) {
          if (subj == subjectId) {
            updatedGrades.add((subj, grade));
            gradeUpdated := true;
          } else {
            updatedGrades.add((subj, g));
          };
        };

        if (not gradeUpdated) {
          updatedGrades.add((subjectId, grade));
        };

        let updatedProfile = {
          name = profile.name;
          email = profile.email;
          profileImage = profile.profileImage;
          enrolledSubjects = profile.enrolledSubjects;
          grades = Buffer.toArray(updatedGrades);
          registrationDate = profile.registrationDate;
        };
        studentProfiles := principalMap.put(studentProfiles, student, updatedProfile);
      };
      case null {
        Debug.trap("Student profile not found");
      };
    };
  };

  // Get students for a teacher's assigned subjects
  public query ({ caller }) func getStudentsInMySubjects() : async [(Principal, StudentProfile)] {
    // Verify caller is a user first
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view students");
    };

    // Only approved teachers can access this
    if (not (UserApproval.isApproved(approvalState, caller))) {
      Debug.trap("Unauthorized: Only approved teachers can view their students");
    };

    switch (principalMap.get(teacherProfiles, caller)) {
      case (?teacherProfile) {
        let result = Buffer.Buffer<(Principal, StudentProfile)>(0);

        for ((studentPrincipal, studentProfile) in principalMap.entries(studentProfiles)) {
          // Check if student is enrolled in any of teacher's subjects
          let hasSharedSubject = Array.find<Text>(
            teacherProfile.assignedSubjects,
            func(subjectId : Text) : Bool {
              Array.find<Text>(studentProfile.enrolledSubjects, func(s : Text) : Bool { s == subjectId }) != null
            }
          );

          if (hasSharedSubject != null) {
            result.add((studentPrincipal, studentProfile));
          };
        };

        Buffer.toArray(result);
      };
      case null {
        Debug.trap("Unauthorized: Only teachers can view their students");
      };
    };
  };

  // Admin profile management
  public shared ({ caller }) func saveAdminProfile(profile : AdminProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    adminProfiles := principalMap.put(adminProfiles, caller, profile);
  };

  public query ({ caller }) func getCallerAdminProfile() : async ?AdminProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can perform this action");
    };
    principalMap.get(adminProfiles, caller);
  };

  public query ({ caller }) func getAdminProfile(user : Principal) : async ?AdminProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view admin profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(adminProfiles, user);
  };

  // File and learning materials management
  public shared ({ caller }) func uploadLearningMaterial(subjectId : Text, filename : Text, file : Storage.ExternalBlob) : async Text {
    // Verify caller is at least a user
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only teachers or admins can upload learning materials");
    };

    // Verify subject exists
    switch (textMap.get(subjects, subjectId)) {
      case null { Debug.trap("Subject not found"); };
      case (?_) {};
    };

    // Verify PDF file extension
    if (not Text.endsWith(filename, #text ".pdf")) {
      Debug.trap("Invalid file format: Only PDF files are allowed");
    };

    // Admins can upload materials for any subject
    if (AccessControl.isAdmin(accessControlState, caller)) {
      let materialId = "material_" # debug_show(Time.now());

      let material : LearningMaterial = {
        id = materialId;
        subjectId;
        teacherPrincipal = caller;
        filename;
        uploadDate = Time.now();
        file;
      };

      learningMaterials := textMap.put(learningMaterials, materialId, material);
      return materialId;
    };

    // For non-admins, verify they are approved teachers
    if (not UserApproval.isApproved(approvalState, caller)) {
      Debug.trap("Unauthorized: Only approved teachers can upload learning materials");
    };

    // Verify caller has teacher profile and is assigned to the subject
    switch (principalMap.get(teacherProfiles, caller)) {
      case null {
        Debug.trap("Unauthorized: Only teachers can upload learning materials");
      };
      case (?teacherProfile) {
        // Verify teacher is assigned to the subject
        let isAssigned = Array.find<Text>(teacherProfile.assignedSubjects, func(s : Text) : Bool { s == subjectId });
        if (isAssigned == null) {
          Debug.trap("Unauthorized: Only teachers assigned to this subject can upload materials");
        };

        let materialId = "material_" # debug_show(Time.now());

        let material : LearningMaterial = {
          id = materialId;
          subjectId;
          teacherPrincipal = caller;
          filename;
          uploadDate = Time.now();
          file;
        };

        learningMaterials := textMap.put(learningMaterials, materialId, material);
        materialId;
      };
    };
  };

  public query ({ caller }) func getLearningMaterials(subjectId : Text) : async [LearningMaterial] {
    // Verify caller is at least a user
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can access learning materials");
    };

    // Verify subject exists
    switch (textMap.get(subjects, subjectId)) {
      case null { Debug.trap("Subject not found"); };
      case (?_) {};
    };

    // Admins can view all materials
    if (AccessControl.isAdmin(accessControlState, caller)) {
      let result = Buffer.Buffer<LearningMaterial>(0);
      for (material in textMap.vals(learningMaterials)) {
        if (material.subjectId == subjectId) {
          result.add(material);
        };
      };
      return Buffer.toArray(result);
    };

    // Verify caller is approved
    if (not UserApproval.isApproved(approvalState, caller)) {
      Debug.trap("Unauthorized: Only approved users can access learning materials");
    };

    // Check if caller is a teacher assigned to this subject
    switch (principalMap.get(teacherProfiles, caller)) {
      case (?teacherProfile) {
        let isAssigned = Array.find<Text>(teacherProfile.assignedSubjects, func(s : Text) : Bool { s == subjectId });
        if (isAssigned != null) {
          let result = Buffer.Buffer<LearningMaterial>(0);
          for (material in textMap.vals(learningMaterials)) {
            if (material.subjectId == subjectId) {
              result.add(material);
            };
          };
          return Buffer.toArray(result);
        };
      };
      case null {};
    };

    // Check if caller is a student enrolled in this subject
    switch (principalMap.get(studentProfiles, caller)) {
      case (?studentProfile) {
        let isEnrolled = Array.find<Text>(studentProfile.enrolledSubjects, func(s : Text) : Bool { s == subjectId });
        if (isEnrolled != null) {
          let result = Buffer.Buffer<LearningMaterial>(0);
          for (material in textMap.vals(learningMaterials)) {
            if (material.subjectId == subjectId) {
              result.add(material);
            };
          };
          return Buffer.toArray(result);
        };
      };
      case null {};
    };

    Debug.trap("Unauthorized: Only students enrolled in this subject or teachers assigned to it can access materials");
  };

  public query ({ caller }) func getMaterialDetails(materialId : Text) : async ?LearningMaterial {
    // Verify caller is at least a user
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view material details");
    };

    switch (textMap.get(learningMaterials, materialId)) {
      case null { return null };
      case (?material) {
        // Admins can view any material
        if (AccessControl.isAdmin(accessControlState, caller)) {
          return ?material;
        };

        // Verify caller is approved
        if (not UserApproval.isApproved(approvalState, caller)) {
          Debug.trap("Unauthorized: Only approved users can view material details");
        };

        // Check if caller is a teacher assigned to the subject
        switch (principalMap.get(teacherProfiles, caller)) {
          case (?teacherProfile) {
            let isAssigned = Array.find<Text>(teacherProfile.assignedSubjects, func(s : Text) : Bool { s == material.subjectId });
            if (isAssigned != null) {
              return ?material;
            };
          };
          case null {};
        };

        // Check if caller is a student enrolled in the subject
        switch (principalMap.get(studentProfiles, caller)) {
          case (?studentProfile) {
            let isEnrolled = Array.find<Text>(studentProfile.enrolledSubjects, func(s : Text) : Bool { s == material.subjectId });
            if (isEnrolled != null) {
              return ?material;
            };
          };
          case null {};
        };

        Debug.trap("Unauthorized: Only students enrolled in the subject or teachers assigned to it can view material details");
      };
    };
  };

  // ----- Quiz Management -----

  // Teacher creates a quiz
  public shared ({ caller }) func createQuiz(quiz : Quiz) : async Text {
    // Verify caller is at least a user
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only teachers or admins can create quizzes");
    };

    // Admins can create quizzes for any subject
    if (AccessControl.isAdmin(accessControlState, caller)) {
      let quizId = "quiz_" # debug_show(Time.now());

      let newQuiz : Quiz = {
        quizId;
        subjectId = quiz.subjectId;
        teacherPrincipal = caller;
        title = quiz.title;
        questions = quiz.questions;
        duration = quiz.duration;
        createdAt = Time.now();
      };

      quizzes := textMap.put(quizzes, quizId, newQuiz);
      return quizId;
    };

    // For non-admins, verify they are approved teachers
    if (not UserApproval.isApproved(approvalState, caller)) {
      Debug.trap("Unauthorized: Only approved teachers can create quizzes");
    };

    // Verify caller has teacher profile and is assigned to the subject
    switch (principalMap.get(teacherProfiles, caller)) {
      case null {
        Debug.trap("Unauthorized: Only teachers can create quizzes");
      };
      case (?teacherProfile) {
        let isAssigned = Array.find<Text>(teacherProfile.assignedSubjects, func(s : Text) : Bool { s == quiz.subjectId });
        if (isAssigned == null) {
          Debug.trap("Unauthorized: Only teachers assigned to this subject can create quizzes");
        };

        let quizId = "quiz_" # debug_show(Time.now());

        let newQuiz : Quiz = {
          quizId;
          subjectId = quiz.subjectId;
          teacherPrincipal = caller;
          title = quiz.title;
          questions = quiz.questions;
          duration = quiz.duration;
          createdAt = Time.now();
        };

        quizzes := textMap.put(quizzes, quizId, newQuiz);
        return quizId;
      };
    };
  };

  // Get quizzes for a subject (students can only access quizzes for enrolled subjects)
  public query ({ caller }) func getQuizzesBySubject(subjectId : Text) : async [Quiz] {
    // Verify caller is at least a user
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can access quizzes");
    };

    // Verify subject exists
    switch (textMap.get(subjects, subjectId)) {
      case null { Debug.trap("Subject not found"); };
      case (?_) {};
    };

    // Admins can view all quizzes
    if (AccessControl.isAdmin(accessControlState, caller)) {
      let result = Buffer.Buffer<Quiz>(0);
      for (quiz in textMap.vals(quizzes)) {
        if (quiz.subjectId == subjectId) {
          result.add(quiz);
        };
      };
      return Buffer.toArray(result);
    };

    // Verify caller is approved
    if (not UserApproval.isApproved(approvalState, caller)) {
      Debug.trap("Unauthorized: Only approved users can access quizzes");
    };

    // Check if caller is a teacher assigned to this subject
    switch (principalMap.get(teacherProfiles, caller)) {
      case (?teacherProfile) {
        let isAssigned = Array.find<Text>(teacherProfile.assignedSubjects, func(s : Text) : Bool { s == subjectId });
        if (isAssigned != null) {
          let result = Buffer.Buffer<Quiz>(0);
          for (quiz in textMap.vals(quizzes)) {
            if (quiz.subjectId == subjectId) {
              result.add(quiz);
            };
          };
          return Buffer.toArray(result);
        };
      };
      case null {};
    };

    // Check if caller is a student enrolled in this subject
    switch (principalMap.get(studentProfiles, caller)) {
      case (?studentProfile) {
        let isEnrolled = Array.find<Text>(studentProfile.enrolledSubjects, func(s : Text) : Bool { s == subjectId });
        if (isEnrolled != null) {
          let result = Buffer.Buffer<Quiz>(0);
          for (quiz in textMap.vals(quizzes)) {
            if (quiz.subjectId == subjectId) {
              result.add(quiz);
            };
          };
          return Buffer.toArray(result);
        };
      };
      case null {};
    };

    Debug.trap("Unauthorized: Only students enrolled in this subject or teachers assigned to it can access quizzes");
  };

  // Get details of a specific quiz
  public query ({ caller }) func getQuizDetails(quizId : Text) : async ?Quiz {
    // Verify caller is at least a user
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view quiz details");
    };

    switch (textMap.get(quizzes, quizId)) {
      case null { null };
      case (?quiz) {
        // Admins can view any quiz
        if (AccessControl.isAdmin(accessControlState, caller)) {
          return ?quiz;
        };

        // Verify caller is approved
        if (not UserApproval.isApproved(approvalState, caller)) {
          Debug.trap("Unauthorized: Only approved users can view quiz details");
        };

        // Check if caller is a teacher (ownership check)
        switch (principalMap.get(teacherProfiles, caller)) {
          case (?teacherProfile) {
            // Verify teacher is assigned to the subject (extra check to ensure access is restricted)
            let isAssigned = Array.find<Text>(teacherProfile.assignedSubjects, func(s : Text) : Bool { s == quiz.subjectId });
            if (isAssigned != null) {
              return ?quiz;
            };
          };
          case null {};
        };

        // Check if caller is a student and enrolled in the subject
        switch (principalMap.get(studentProfiles, caller)) {
          case (?studentProfile) {
            let isEnrolled = Array.find<Text>(studentProfile.enrolledSubjects, func(s : Text) : Bool { s == quiz.subjectId });
            if (isEnrolled != null) {
              return ?quiz;
            };
          };
          case null {};
        };

        Debug.trap("Unauthorized: Only teachers assigned to this subject or students enrolled in it can view quiz details");
      };
    };
  };

  // Student submits quiz answers
  public shared ({ caller }) func submitQuizAnswers(quizId : Text, answers : [Nat]) : async () {
    // Verify caller is a user first
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only students can submit quiz answers");
    };

    // Verify caller is approved
    if (not UserApproval.isApproved(approvalState, caller)) {
      Debug.trap("Unauthorized: Only approved students can submit quizzes");
    };

    // Verify caller has a student profile (not a teacher)
    switch (principalMap.get(studentProfiles, caller)) {
      case null {
        Debug.trap("Unauthorized: Only students can submit quizzes");
      };
      case (?studentProfile) {
        switch (textMap.get(quizzes, quizId)) {
          case null {
            Debug.trap("Quiz not found");
          };
          case (?quiz) {
            // Verify student is enrolled in the quiz's subject
            let isEnrolled = Array.find<Text>(studentProfile.enrolledSubjects, func(s : Text) : Bool { s == quiz.subjectId });
            if (isEnrolled == null) {
              Debug.trap("Unauthorized: Only students enrolled in this subject can submit quiz answers");
            };

            // Score the quiz
            var score = 0;
            var i = 0;
            while (i < quiz.questions.size()) {
              if (i < answers.size()) {
                let answer = answers[i];
                let question = quiz.questions[i];
                switch (question.correctAnswer) {
                  case null {};
                  case (?correctAnswer) {
                    if (answer == correctAnswer) {
                      score += 1;
                    };
                  };
                };
              };
              i += 1;
            };

            // Create quiz submission record
            let submissionId = "submission_" # debug_show(Time.now());
            let _submission : QuizSubmission = {
              quizId;
              studentPrincipal = caller;
              answers;
              timestamp = Time.now();
              score;
              completed = true;
            };

            quizSubmissions := textMap.put(quizSubmissions, submissionId, _submission);
          };
        };
      };
    };
  };

  // Get quiz results for a student
  public query ({ caller }) func getMyQuizResults() : async [QuizSubmission] {
    // Verify caller is a user first
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only students can access quiz results");
    };

    // Verify caller is approved
    if (not UserApproval.isApproved(approvalState, caller)) {
      Debug.trap("Unauthorized: Only approved students can access quiz results");
    };

    let results = Buffer.Buffer<QuizSubmission>(0);
    for ((id, submission) in textMap.entries(quizSubmissions)) {
      if (submission.studentPrincipal == caller) {
        results.add(submission);
      };
    };
    Buffer.toArray(results);
  };

  // Get all quiz submissions for grading (admin or teacher only)
  public query ({ caller }) func getQuizSubmissionsForGrading() : async [QuizSubmission] {
    // Verify caller is at least a user
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only teachers or admins can access grading submissions");
    };

    // Admins can access all submissions
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return Iter.toArray(textMap.vals(quizSubmissions));
    };

    // For non-admins, verify they are approved teachers
    if (not UserApproval.isApproved(approvalState, caller)) {
      Debug.trap("Unauthorized: Only approved teachers can access grading submissions");
    };

    switch (principalMap.get(teacherProfiles, caller)) {
      case (?teacherProfile) {
        let result = Buffer.Buffer<QuizSubmission>(0);
        for ((quizId, quiz) in textMap.entries(quizzes)) {
          if (quiz.teacherPrincipal == caller) {
            for ((id, submission) in textMap.entries(quizSubmissions)) {
              if (submission.quizId == quizId) {
                result.add(submission);
              };
            };
          };
        };
        Buffer.toArray(result);
      };
      case null {
        Debug.trap("Unauthorized: Only teachers can access grading submissions");
      };
    };
  };
};
