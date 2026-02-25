import { useState, useEffect } from 'react';
import { useGetCallerStudentProfile, useGetSubjects, useEnrollInSubject, useSaveStudentProfile, useGetLearningMaterials, useSendQuestion, useGetConversation, useGetExamsBySubject, useSubmitExamAnswers, useGetQuizzesBySubject, useSubmitQuizAnswers, useGetMyQuizResults } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Mail, User, Award, Upload, Download, FileText, MessageCircle, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ExternalBlob } from '../backend';
import { Principal } from '@icp-sdk/core/principal';

export default function StudentDashboard() {
  const { data: studentProfile, isLoading: profileLoading } = useGetCallerStudentProfile();
  const { data: subjects = [] } = useGetSubjects();
  const enrollMutation = useEnrollInSubject();
  const saveProfileMutation = useSaveStudentProfile();
  const sendQuestionMutation = useSendQuestion();
  const submitExamMutation = useSubmitExamAnswers();
  const submitQuizMutation = useSubmitQuizAnswers();
  const { data: myQuizResults = [] } = useGetMyQuizResults();

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedSubjectForMaterials, setSelectedSubjectForMaterials] = useState<string | null>(null);

  // Ask Teacher state
  const [selectedSubjectForQuestion, setSelectedSubjectForQuestion] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [questionText, setQuestionText] = useState('');
  const [viewConversationSubject, setViewConversationSubject] = useState<string>('');
  const [viewConversationTeacher, setViewConversationTeacher] = useState<string>('');

  // Exam state
  const [selectedExamSubject, setSelectedExamSubject] = useState<string>('');
  const [takingExam, setTakingExam] = useState<string | null>(null);
  const [examAnswers, setExamAnswers] = useState<{ [key: number]: number }>({});
  const [examTimeRemaining, setExamTimeRemaining] = useState<number>(0);

  // Quiz state
  const [selectedQuizSubject, setSelectedQuizSubject] = useState<string>('');
  const [takingQuiz, setTakingQuiz] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: number]: number }>({});
  const [quizTimeRemaining, setQuizTimeRemaining] = useState<number>(0);

  const { data: learningMaterials = [] } = useGetLearningMaterials(selectedSubjectForMaterials || '');
  const { data: conversation = [] } = useGetConversation(viewConversationSubject, viewConversationTeacher);
  const { data: exams = [] } = useGetExamsBySubject(selectedExamSubject);
  const { data: quizzes = [] } = useGetQuizzesBySubject(selectedQuizSubject);

  // Timer for exam
  useEffect(() => {
    if (takingExam && examTimeRemaining > 0) {
      const timer = setInterval(() => {
        setExamTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [takingExam, examTimeRemaining]);

  // Timer for quiz
  useEffect(() => {
    if (takingQuiz && quizTimeRemaining > 0) {
      const timer = setInterval(() => {
        setQuizTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [takingQuiz, quizTimeRemaining]);

  const handleEnroll = async (subjectId: string) => {
    try {
      await enrollMutation.mutateAsync(subjectId);
      toast.success('Successfully enrolled in subject!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to enroll in subject');
    }
  };

  const handleUploadProfileImage = async () => {
    if (!profileImageFile || !studentProfile) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploadingImage(true);
    try {
      const arrayBuffer = await profileImageFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const imageBlob = ExternalBlob.fromBytes(uint8Array);

      await saveProfileMutation.mutateAsync({
        ...studentProfile,
        profileImage: imageBlob,
      });

      toast.success('Profile image updated successfully!');
      setProfileDialogOpen(false);
      setProfileImageFile(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload profile image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDownloadMaterial = async (material: any) => {
    try {
      const bytes = await material.file.getBytes();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = material.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download material');
    }
  };

  const handleSendQuestion = async () => {
    if (!selectedSubjectForQuestion || !selectedTeacher || !questionText.trim()) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await sendQuestionMutation.mutateAsync({
        receiver: Principal.fromText(selectedTeacher),
        subjectId: selectedSubjectForQuestion,
        messageText: questionText,
      });
      toast.success('Question sent successfully!');
      setQuestionText('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send question');
    }
  };

  const handleStartExam = (exam: any) => {
    const now = Date.now();
    const startTime = Number(exam.startTime) / 1000000;
    if (now < startTime) {
      toast.error('Exam has not started yet');
      return;
    }
    setTakingExam(exam.examId);
    setExamAnswers({});
    setExamTimeRemaining(Number(exam.duration) * 60);
  };

  const handleSubmitExam = async () => {
    if (!takingExam) return;

    const currentExam = exams.find(e => e.examId === takingExam);
    if (!currentExam) return;

    const answers = Array.from({ length: currentExam.questions.length }, (_, i) => 
      BigInt(examAnswers[i] ?? 0)
    );

    try {
      await submitExamMutation.mutateAsync({
        examId: takingExam,
        answers,
      });
      toast.success('Exam submitted successfully!');
      setTakingExam(null);
      setExamAnswers({});
      setExamTimeRemaining(0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit exam');
    }
  };

  const handleStartQuiz = (quiz: any) => {
    setTakingQuiz(quiz.quizId);
    setQuizAnswers({});
    setQuizTimeRemaining(Number(quiz.duration) * 60);
  };

  const handleSubmitQuiz = async () => {
    if (!takingQuiz) return;

    const currentQuiz = quizzes.find(q => q.quizId === takingQuiz);
    if (!currentQuiz) return;

    const answers = Array.from({ length: currentQuiz.questions.length }, (_, i) => 
      BigInt(quizAnswers[i] ?? 0)
    );

    try {
      await submitQuizMutation.mutateAsync({
        quizId: takingQuiz,
        answers,
      });
      toast.success('Quiz submitted successfully!');
      setTakingQuiz(null);
      setQuizAnswers({});
      setQuizTimeRemaining(0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit quiz');
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const enrolledSubjectIds = studentProfile?.enrolledSubjects || [];
  const availableSubjects = subjects.filter(s => !enrolledSubjectIds.includes(s.id));
  const enrolledSubjects = subjects.filter(s => enrolledSubjectIds.includes(s.id));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-6">
          {studentProfile?.profileImage ? (
            <img 
              src={studentProfile.profileImage.getDirectURL()} 
              alt="Profile" 
              className="h-24 w-24 rounded-full object-cover border-4 border-primary"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary">
              <User className="h-12 w-12 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{studentProfile?.name || 'Student Dashboard'}</h1>
            <p className="text-muted-foreground">Welcome back! Manage your subjects and view your progress.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="ask-teacher">Ask Teacher</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enrolled Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enrolledSubjects.length}</div>
                <p className="text-xs text-muted-foreground">out of {subjects.length} available</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {studentProfile?.grades.length ? 
                    Math.round(studentProfile.grades.reduce((acc, [_, grade]) => acc + Number(grade), 0) / studentProfile.grades.length) 
                    : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {studentProfile?.grades.length || 0} grades recorded
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quizzes Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myQuizResults.length}</div>
                <p className="text-xs text-muted-foreground">quiz submissions</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Profile Information</CardTitle>
                <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Update Photo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Profile Image</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="profileImage">Profile Image</Label>
                        <Input
                          id="profileImage"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
                        />
                      </div>
                      <Button 
                        onClick={handleUploadProfileImage} 
                        className="w-full"
                        disabled={isUploadingImage || !profileImageFile}
                      >
                        {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Email: {studentProfile?.email || 'Not set'}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Subjects</CardTitle>
              <CardDescription>Subjects you are currently enrolled in</CardDescription>
            </CardHeader>
            <CardContent>
              {enrolledSubjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  You haven't enrolled in any subjects yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrolledSubjects.map((subject) => (
                    <Card key={subject.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{subject.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">{subject.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Subjects</CardTitle>
              <CardDescription>Enroll in additional subjects</CardDescription>
            </CardHeader>
            <CardContent>
              {availableSubjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  You are enrolled in all available subjects.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableSubjects.map((subject) => (
                    <Card key={subject.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{subject.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{subject.description}</p>
                        <Button 
                          onClick={() => handleEnroll(subject.id)}
                          disabled={enrollMutation.isPending}
                          className="w-full"
                        >
                          Enroll
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Learning Materials</CardTitle>
              <CardDescription>Access study materials for your enrolled subjects</CardDescription>
            </CardHeader>
            <CardContent>
              {enrolledSubjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Enroll in subjects to access learning materials.
                </p>
              ) : (
                <div className="space-y-6">
                  {enrolledSubjects.map((subject) => (
                    <div key={subject.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{subject.name}</h3>
                          <p className="text-sm text-muted-foreground">{subject.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSubjectForMaterials(subject.id)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Materials
                        </Button>
                      </div>
                      
                      {selectedSubjectForMaterials === subject.id && (
                        <div className="mt-4 space-y-2">
                          {learningMaterials.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No materials available yet for this subject.
                            </p>
                          ) : (
                            learningMaterials.map((material) => (
                              <div key={material.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="text-sm font-medium">{material.filename}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Uploaded: {new Date(Number(material.uploadDate) / 1000000).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadMaterial(material)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ask-teacher" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ask Your Teacher</CardTitle>
              <CardDescription>Send questions to your teachers about enrolled subjects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Subject</Label>
                  <Select onValueChange={setSelectedSubjectForQuestion}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {enrolledSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSubjectForQuestion && (
                  <>
                    <div className="space-y-2">
                      <Label>Select Teacher</Label>
                      <Select onValueChange={setSelectedTeacher}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a teacher" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="demo-teacher">Demo Teacher (Backend Integration Pending)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Your Question</Label>
                      <Textarea
                        placeholder="Type your question here..."
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <Button 
                      onClick={handleSendQuestion}
                      disabled={sendQuestionMutation.isPending || !selectedTeacher || !questionText.trim()}
                      className="w-full"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {sendQuestionMutation.isPending ? 'Sending...' : 'Send Question'}
                    </Button>
                  </>
                )}
              </div>

              {selectedSubjectForQuestion && selectedTeacher && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Conversation History</h3>
                  <ScrollArea className="h-[400px] border rounded-lg p-4">
                    {conversation.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No messages yet. Start the conversation!
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {conversation
                          .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
                          .map((msg) => {
                            const isQuestion = 'question' in msg.messageType;
                            return (
                              <div
                                key={msg.messageId}
                                className={`flex ${isQuestion ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[70%] rounded-lg p-3 ${
                                    isQuestion
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted'
                                  }`}
                                >
                                  <p className="text-sm">{msg.messageText}</p>
                                  <p className="text-xs opacity-70 mt-1">
                                    {new Date(Number(msg.timestamp) / 1000000).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="space-y-6">
          {takingExam ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Taking Exam</CardTitle>
                  <Badge variant="destructive" className="text-lg">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatTime(examTimeRemaining)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const currentExam = exams.find(e => e.examId === takingExam);
                  if (!currentExam) return null;

                  return (
                    <div className="space-y-6">
                      {currentExam.questions.map((question, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <p className="font-medium mb-3">
                            {index + 1}. {question.text}
                          </p>
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <label
                                key={optIndex}
                                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted"
                              >
                                <input
                                  type="radio"
                                  name={`question-${index}`}
                                  checked={examAnswers[index] === optIndex}
                                  onChange={() =>
                                    setExamAnswers({ ...examAnswers, [index]: optIndex })
                                  }
                                  className="h-4 w-4"
                                />
                                <span className="text-sm">{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <Button onClick={handleSubmitExam} className="w-full" size="lg">
                        Submit Exam
                      </Button>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Available Exams</CardTitle>
                <CardDescription>View and take exams for your enrolled subjects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Subject</Label>
                  <Select onValueChange={setSelectedExamSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {enrolledSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedExamSubject && (
                  <div className="space-y-4 mt-6">
                    {exams.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No exams available for this subject yet.
                      </p>
                    ) : (
                      exams.map((exam) => {
                        const startTime = Number(exam.startTime) / 1000000;
                        const now = Date.now();
                        const hasStarted = now >= startTime;

                        return (
                          <Card key={exam.examId}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">
                                  Exam - {subjects.find(s => s.id === exam.subjectId)?.name}
                                </CardTitle>
                                <Badge variant={hasStarted ? 'default' : 'secondary'}>
                                  {hasStarted ? 'Available' : 'Upcoming'}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>Duration: {Number(exam.duration)} minutes</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span>{exam.questions.length} questions</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Start Time: {new Date(startTime).toLocaleString()}
                              </div>
                              <Button
                                onClick={() => handleStartExam(exam)}
                                disabled={!hasStarted}
                                className="w-full"
                              >
                                {hasStarted ? 'Start Exam' : 'Not Available Yet'}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-6">
          {takingQuiz ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Taking Quiz</CardTitle>
                  <Badge variant="destructive" className="text-lg">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatTime(quizTimeRemaining)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const currentQuiz = quizzes.find(q => q.quizId === takingQuiz);
                  if (!currentQuiz) return null;

                  return (
                    <div className="space-y-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-semibold">{currentQuiz.title}</h3>
                      </div>
                      {currentQuiz.questions.map((question, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <p className="font-medium mb-3">
                            {index + 1}. {question.text}
                          </p>
                          <div className="space-y-2">
                            {question.options.map((option, optIndex) => (
                              <label
                                key={optIndex}
                                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted"
                              >
                                <input
                                  type="radio"
                                  name={`quiz-question-${index}`}
                                  checked={quizAnswers[index] === optIndex}
                                  onChange={() =>
                                    setQuizAnswers({ ...quizAnswers, [index]: optIndex })
                                  }
                                  className="h-4 w-4"
                                />
                                <span className="text-sm">{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <Button onClick={handleSubmitQuiz} className="w-full" size="lg">
                        Submit Quiz
                      </Button>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Available Quizzes</CardTitle>
                  <CardDescription>Take quizzes for your enrolled subjects</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Subject</Label>
                    <Select onValueChange={setSelectedQuizSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {enrolledSubjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedQuizSubject && (
                    <div className="space-y-4 mt-6">
                      {quizzes.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">
                          No quizzes available for this subject yet.
                        </p>
                      ) : (
                        quizzes.map((quiz) => {
                          const isCompleted = myQuizResults.some(r => r.quizId === quiz.quizId);
                          const result = myQuizResults.find(r => r.quizId === quiz.quizId);

                          return (
                            <Card key={quiz.quizId}>
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-lg">{quiz.title}</CardTitle>
                                  {isCompleted && (
                                    <Badge variant="secondary">
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Completed
                                    </Badge>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span>Duration: {Number(quiz.duration)} minutes</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span>{quiz.questions.length} questions</span>
                                </div>
                                {isCompleted && result && (
                                  <div className="mt-2 p-3 bg-muted rounded-lg">
                                    <p className="text-sm font-medium">
                                      Your Score: {Number(result.score)} / {quiz.questions.length}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Completed: {new Date(Number(result.timestamp) / 1000000).toLocaleString()}
                                    </p>
                                  </div>
                                )}
                                <Button
                                  onClick={() => handleStartQuiz(quiz)}
                                  disabled={isCompleted}
                                  className="w-full"
                                >
                                  {isCompleted ? 'Already Completed' : 'Start Quiz'}
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quiz Results</CardTitle>
                  <CardDescription>View your completed quiz scores</CardDescription>
                </CardHeader>
                <CardContent>
                  {myQuizResults.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No quiz results yet. Complete a quiz to see your scores.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {myQuizResults.map((result) => {
                        const quiz = quizzes.find(q => q.quizId === result.quizId);
                        const subject = subjects.find(s => s.id === quiz?.subjectId);
                        const percentage = quiz ? Math.round((Number(result.score) / quiz.questions.length) * 100) : 0;

                        return (
                          <div key={result.quizId} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{quiz?.title || 'Quiz'}</p>
                              <p className="text-sm text-muted-foreground">{subject?.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(Number(result.timestamp) / 1000000).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={percentage >= 70 ? 'default' : percentage >= 50 ? 'secondary' : 'destructive'}>
                                {Number(result.score)} / {quiz?.questions.length || 0}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">{percentage}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="grades" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Grades</CardTitle>
              <CardDescription>View your performance across all subjects</CardDescription>
            </CardHeader>
            <CardContent>
              {!studentProfile?.grades.length ? (
                <p className="text-muted-foreground text-center py-8">
                  No grades have been assigned yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {studentProfile.grades.map(([subjectId, grade]) => {
                    const subject = subjects.find(s => s.id === subjectId);
                    return (
                      <div key={subjectId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">{subject?.name || subjectId}</p>
                          <p className="text-sm text-muted-foreground">{subject?.description}</p>
                        </div>
                        <Badge variant={Number(grade) >= 70 ? 'default' : Number(grade) >= 50 ? 'secondary' : 'destructive'}>
                          {Number(grade)}%
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
