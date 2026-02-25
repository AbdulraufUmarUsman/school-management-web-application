import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface LearningMaterial {
    id: string;
    file: ExternalBlob;
    filename: string;
    subjectId: string;
    teacherPrincipal: Principal;
    uploadDate: bigint;
}
export interface QuizQuestion {
    text: string;
    correctAnswer?: bigint;
    options: Array<string>;
}
export interface Quiz {
    title: string;
    duration: bigint;
    createdAt: bigint;
    subjectId: string;
    teacherPrincipal: Principal;
    questions: Array<QuizQuestion>;
    quizId: string;
}
export interface QuizSubmission {
    answers: Array<bigint>;
    completed: boolean;
    studentPrincipal: Principal;
    score: bigint;
    timestamp: bigint;
    quizId: string;
}
export interface TeacherProfile {
    name: string;
    email: string;
    assignedSubjects: Array<string>;
    photo?: ExternalBlob;
    registrationDate: bigint;
}
export interface UserApprovalInfo {
    status: ApprovalStatus;
    principal: Principal;
}
export interface StudentProfile {
    grades: Array<[string, bigint]>;
    profileImage?: ExternalBlob;
    name: string;
    email: string;
    registrationDate: bigint;
    enrolledSubjects: Array<string>;
}
export interface AdminProfile {
    name: string;
    email: string;
}
export interface Subject {
    id: string;
    name: string;
    description: string;
}
export interface UserProfile {
    name: string;
}
export enum ApprovalStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignGrade(student: Principal, subjectId: string, grade: bigint): Promise<void>;
    assignSubjectToTeacher(teacher: Principal, subjectId: string): Promise<void>;
    createQuiz(quiz: Quiz): Promise<string>;
    enrollInSubject(subjectId: string): Promise<void>;
    getAdminProfile(user: Principal): Promise<AdminProfile | null>;
    getCallerAdminProfile(): Promise<AdminProfile | null>;
    getCallerStudentProfile(): Promise<StudentProfile | null>;
    getCallerTeacherProfile(): Promise<TeacherProfile | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLearningMaterials(subjectId: string): Promise<Array<LearningMaterial>>;
    getMaterialDetails(materialId: string): Promise<LearningMaterial | null>;
    getMyQuizResults(): Promise<Array<QuizSubmission>>;
    getQuizDetails(quizId: string): Promise<Quiz | null>;
    getQuizSubmissionsForGrading(): Promise<Array<QuizSubmission>>;
    getQuizzesBySubject(subjectId: string): Promise<Array<Quiz>>;
    getStudentProfile(user: Principal): Promise<StudentProfile | null>;
    getStudentsInMySubjects(): Promise<Array<[Principal, StudentProfile]>>;
    getSubject(id: string): Promise<Subject | null>;
    getSubjects(): Promise<Array<Subject>>;
    getTeacherProfile(user: Principal): Promise<TeacherProfile | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isCallerApproved(): Promise<boolean>;
    listAllStudents(): Promise<Array<[Principal, StudentProfile]>>;
    listAllTeachers(): Promise<Array<[Principal, TeacherProfile]>>;
    listApprovals(): Promise<Array<UserApprovalInfo>>;
    requestApproval(): Promise<void>;
    saveAdminProfile(profile: AdminProfile): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveStudentProfile(profile: StudentProfile): Promise<void>;
    saveTeacherProfile(profile: TeacherProfile): Promise<void>;
    setApproval(user: Principal, status: ApprovalStatus): Promise<void>;
    submitQuizAnswers(quizId: string, answers: Array<bigint>): Promise<void>;
    uploadLearningMaterial(subjectId: string, filename: string, file: ExternalBlob): Promise<string>;
}
