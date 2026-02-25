import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { 
  UserProfile, 
  StudentProfile, 
  TeacherProfile, 
  AdminProfile, 
  Subject, 
  UserRole,
  ApprovalStatus,
  UserApprovalInfo,
  LearningMaterial,
  Quiz,
  QuizSubmission
} from '../backend';
import { Principal } from '@icp-sdk/core/principal';
import { ExternalBlob } from '../backend';

// Interaction and Exam types (matching backend structure)
export interface InteractionMessage {
  messageId: string;
  sender: Principal;
  receiver: Principal;
  subjectId: string;
  messageText: string;
  timestamp: bigint;
  messageType: { question: null } | { reply: null };
}

export interface ExamQuestion {
  text: string;
  options: string[];
  correctAnswer: number | null;
}

export interface Exam {
  examId: string;
  subjectId: string;
  teacherPrincipal: Principal;
  questions: ExamQuestion[];
  duration: bigint;
  startTime: bigint;
}

export interface ExamSubmission {
  examId: string;
  studentPrincipal: Principal;
  answers: bigint[];
  timestamp: bigint;
  score: bigint | null;
  graded: boolean;
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// Role Queries
export function useGetCallerUserRole() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserRole>({
    queryKey: ['currentUserRole'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerAdmin'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
  });
}

// Approval Queries
export function useIsCallerApproved() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCallerApproved'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerApproved();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useRequestApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.requestApproval();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isCallerApproved'] });
    },
  });
}

export function useListApprovals() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserApprovalInfo[]>({
    queryKey: ['approvals'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listApprovals();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useSetApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, status }: { user: Principal; status: ApprovalStatus }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setApproval(user, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['allStudents'] });
      queryClient.invalidateQueries({ queryKey: ['allTeachers'] });
    },
  });
}

// Subject Queries
export function useGetSubjects() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSubjects();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetSubject(id: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Subject | null>({
    queryKey: ['subject', id],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getSubject(id);
    },
    enabled: !!actor && !actorFetching && !!id,
  });
}

// Student Profile Queries
export function useGetCallerStudentProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<StudentProfile | null>({
    queryKey: ['currentStudentProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerStudentProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useSaveStudentProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: StudentProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveStudentProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentStudentProfile'] });
    },
  });
}

export function useEnrollInSubject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subjectId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.enrollInSubject(subjectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentStudentProfile'] });
    },
  });
}

export function useListAllStudents() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<[Principal, StudentProfile]>>({
    queryKey: ['allStudents'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listAllStudents();
    },
    enabled: !!actor && !actorFetching,
  });
}

// Teacher Profile Queries
export function useGetCallerTeacherProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<TeacherProfile | null>({
    queryKey: ['currentTeacherProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerTeacherProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useSaveTeacherProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: TeacherProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveTeacherProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentTeacherProfile'] });
    },
  });
}

export function useGetStudentsInMySubjects() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<[Principal, StudentProfile]>>({
    queryKey: ['myStudents'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getStudentsInMySubjects();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useListAllTeachers() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<[Principal, TeacherProfile]>>({
    queryKey: ['allTeachers'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listAllTeachers();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useAssignSubjectToTeacher() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ teacher, subjectId }: { teacher: Principal; subjectId: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.assignSubjectToTeacher(teacher, subjectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTeachers'] });
    },
  });
}

// Admin Profile Queries
export function useGetCallerAdminProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<AdminProfile | null>({
    queryKey: ['currentAdminProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerAdminProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useSaveAdminProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: AdminProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveAdminProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentAdminProfile'] });
    },
  });
}

// Grade Management
export function useAssignGrade() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ student, subjectId, grade }: { student: Principal; subjectId: string; grade: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.assignGrade(student, subjectId, grade);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myStudents'] });
      queryClient.invalidateQueries({ queryKey: ['allStudents'] });
    },
  });
}

// Learning Materials Queries
export function useUploadLearningMaterial() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subjectId, filename, file }: { subjectId: string; filename: string; file: ExternalBlob }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.uploadLearningMaterial(subjectId, filename, file);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['learningMaterials', variables.subjectId] });
    },
  });
}

export function useGetLearningMaterials(subjectId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<LearningMaterial[]>({
    queryKey: ['learningMaterials', subjectId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getLearningMaterials(subjectId);
    },
    enabled: !!actor && !actorFetching && !!subjectId,
  });
}

export function useGetMaterialDetails(materialId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<LearningMaterial | null>({
    queryKey: ['materialDetails', materialId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMaterialDetails(materialId);
    },
    enabled: !!actor && !actorFetching && !!materialId,
  });
}

// Student-Teacher Interaction Queries (Backend functions to be implemented)
export function useSendQuestion() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ receiver, subjectId, messageText }: { receiver: Principal; subjectId: string; messageText: string }) => {
      if (!actor) throw new Error('Actor not available');
      // @ts-ignore - Backend function to be implemented
      return actor.sendQuestion(receiver, subjectId, messageText);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.subjectId, variables.receiver.toString()] });
    },
  });
}

export function useReplyToQuestion() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, replyText }: { messageId: string; replyText: string }) => {
      if (!actor) throw new Error('Actor not available');
      // @ts-ignore - Backend function to be implemented
      return actor.replyToQuestion(messageId, replyText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
      queryClient.invalidateQueries({ queryKey: ['teacherQuestions'] });
    },
  });
}

export function useGetConversation(subjectId: string, teacherPrincipal: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<InteractionMessage[]>({
    queryKey: ['conversation', subjectId, teacherPrincipal],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      // @ts-ignore - Backend function to be implemented
      return actor.getConversation(subjectId, Principal.fromText(teacherPrincipal));
    },
    enabled: !!actor && !actorFetching && !!subjectId && !!teacherPrincipal,
  });
}

export function useGetTeacherQuestions() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<InteractionMessage[]>({
    queryKey: ['teacherQuestions'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      // @ts-ignore - Backend function to be implemented
      return actor.getTeacherQuestions();
    },
    enabled: !!actor && !actorFetching,
  });
}

// Examination Queries (Backend functions to be implemented)
export function useCreateExam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subjectId, questions, duration, startTime }: { subjectId: string; questions: ExamQuestion[]; duration: bigint; startTime: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      // @ts-ignore - Backend function to be implemented
      return actor.createExam(subjectId, questions, duration, startTime);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['exams', variables.subjectId] });
    },
  });
}

export function useGetExamsBySubject(subjectId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Exam[]>({
    queryKey: ['exams', subjectId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      // @ts-ignore - Backend function to be implemented
      return actor.getExamsBySubject(subjectId);
    },
    enabled: !!actor && !actorFetching && !!subjectId,
  });
}

export function useGetExamDetails(examId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Exam | null>({
    queryKey: ['examDetails', examId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      // @ts-ignore - Backend function to be implemented
      return actor.getExamDetails(examId);
    },
    enabled: !!actor && !actorFetching && !!examId,
  });
}

export function useSubmitExamAnswers() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ examId, answers }: { examId: string; answers: bigint[] }) => {
      if (!actor) throw new Error('Actor not available');
      // @ts-ignore - Backend function to be implemented
      return actor.submitExamAnswers(examId, answers);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['examResult', variables.examId] });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

export function useGetStudentExamResult(examId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<ExamSubmission | null>({
    queryKey: ['examResult', examId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      // @ts-ignore - Backend function to be implemented
      return actor.getStudentExamResult(examId);
    },
    enabled: !!actor && !actorFetching && !!examId,
  });
}

export function useGetExamSubmissions(examId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<[Principal, ExamSubmission]>>({
    queryKey: ['examSubmissions', examId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      // @ts-ignore - Backend function to be implemented
      return actor.getExamSubmissions(examId);
    },
    enabled: !!actor && !actorFetching && !!examId,
  });
}

// Quiz Management Queries
export function useCreateQuiz() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quiz: Omit<Quiz, 'quizId' | 'createdAt' | 'teacherPrincipal'>) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createQuiz(quiz as Quiz);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', variables.subjectId] });
    },
  });
}

export function useGetQuizzesBySubject(subjectId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Quiz[]>({
    queryKey: ['quizzes', subjectId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getQuizzesBySubject(subjectId);
    },
    enabled: !!actor && !actorFetching && !!subjectId,
  });
}

export function useGetQuizDetails(quizId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Quiz | null>({
    queryKey: ['quizDetails', quizId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getQuizDetails(quizId);
    },
    enabled: !!actor && !actorFetching && !!quizId,
  });
}

export function useSubmitQuizAnswers() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quizId, answers }: { quizId: string; answers: bigint[] }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.submitQuizAnswers(quizId, answers);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myQuizResults'] });
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useGetMyQuizResults() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<QuizSubmission[]>({
    queryKey: ['myQuizResults'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMyQuizResults();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetQuizSubmissionsForGrading() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<QuizSubmission[]>({
    queryKey: ['quizSubmissionsForGrading'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getQuizSubmissionsForGrading();
    },
    enabled: !!actor && !actorFetching,
  });
}
