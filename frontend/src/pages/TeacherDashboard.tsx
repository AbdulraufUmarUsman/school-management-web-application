import { useState } from 'react';
import { useGetCallerTeacherProfile, useGetStudentsInMySubjects, useGetSubjects, useAssignGrade, useUploadLearningMaterial, useGetLearningMaterials, useGetTeacherQuestions, useReplyToQuestion, useCreateExam, useGetExamsBySubject, useGetExamSubmissions, useCreateQuiz, useGetQuizzesBySubject, useGetQuizSubmissionsForGrading } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, Award, Upload, FileText, Download, MessageCircle, Plus, Trash2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Principal } from '@icp-sdk/core/principal';
import { ExternalBlob, QuizQuestion } from '../backend';
import type { ExamQuestion } from '../hooks/useQueries';

export default function TeacherDashboard() {
  const { data: teacherProfile, isLoading: profileLoading } = useGetCallerTeacherProfile();
  const { data: students = [] } = useGetStudentsInMySubjects();
  const { data: subjects = [] } = useGetSubjects();
  const { data: teacherQuestions = [] } = useGetTeacherQuestions();
  const { data: quizSubmissions = [] } = useGetQuizSubmissionsForGrading();
  const assignGradeMutation = useAssignGrade();
  const uploadMaterialMutation = useUploadLearningMaterial();
  const replyMutation = useReplyToQuestion();
  const createExamMutation = useCreateExam();
  const createQuizMutation = useCreateQuiz();

  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Principal | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [gradeValue, setGradeValue] = useState('');

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [viewMaterialsSubject, setViewMaterialsSubject] = useState<string | null>(null);
  const { data: learningMaterials = [] } = useGetLearningMaterials(viewMaterialsSubject || '');

  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  // Exam creation state
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [examSubject, setExamSubject] = useState('');
  const [examDuration, setExamDuration] = useState('60');
  const [examStartTime, setExamStartTime] = useState('');
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([
    { text: '', options: ['', '', '', ''], correctAnswer: null }
  ]);

  // Quiz creation state
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizSubject, setQuizSubject] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDuration, setQuizDuration] = useState('30');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    { text: '', options: ['', '', '', ''], correctAnswer: BigInt(0) }
  ]);

  const [viewQuizzesSubject, setViewQuizzesSubject] = useState<string | null>(null);
  const { data: quizzes = [] } = useGetQuizzesBySubject(viewQuizzesSubject || '');

  const handleAssignGrade = async () => {
    if (!selectedStudent || !selectedSubject || !gradeValue) {
      toast.error('Please fill all fields');
      return;
    }

    const grade = parseInt(gradeValue);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      toast.error('Grade must be between 0 and 100');
      return;
    }

    try {
      await assignGradeMutation.mutateAsync({
        student: selectedStudent,
        subjectId: selectedSubject,
        grade: BigInt(grade),
      });
      toast.success('Grade assigned successfully!');
      setGradeDialogOpen(false);
      setSelectedStudent(null);
      setSelectedSubject('');
      setGradeValue('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign grade');
    }
  };

  const handleUploadMaterial = async () => {
    if (!uploadSubject || !uploadFile) {
      toast.error('Please select a subject and file');
      return;
    }

    if (!uploadFile.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are allowed');
      return;
    }

    try {
      const arrayBuffer = await uploadFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const fileBlob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });

      await uploadMaterialMutation.mutateAsync({
        subjectId: uploadSubject,
        filename: uploadFile.name,
        file: fileBlob,
      });

      toast.success('Material uploaded successfully!');
      setUploadDialogOpen(false);
      setUploadSubject('');
      setUploadFile(null);
      setUploadProgress(0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload material');
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

  const handleReplyToQuestion = async (messageId: string) => {
    const reply = replyText[messageId];
    if (!reply?.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    try {
      await replyMutation.mutateAsync({ messageId, replyText: reply });
      toast.success('Reply sent successfully!');
      setReplyText({ ...replyText, [messageId]: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reply');
    }
  };

  const handleCreateExam = async () => {
    if (!examSubject || !examDuration || !examStartTime) {
      toast.error('Please fill all required fields');
      return;
    }

    const invalidQuestion = examQuestions.find(
      q => !q.text.trim() || q.options.some(o => !o.trim()) || q.correctAnswer === null
    );

    if (invalidQuestion) {
      toast.error('Please complete all questions with text, options, and correct answer');
      return;
    }

    try {
      const startTime = BigInt(new Date(examStartTime).getTime() * 1000000);
      await createExamMutation.mutateAsync({
        subjectId: examSubject,
        questions: examQuestions,
        duration: BigInt(examDuration),
        startTime,
      });

      toast.success('Exam created successfully!');
      setExamDialogOpen(false);
      setExamSubject('');
      setExamDuration('60');
      setExamStartTime('');
      setExamQuestions([{ text: '', options: ['', '', '', ''], correctAnswer: null }]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create exam');
    }
  };

  const handleCreateQuiz = async () => {
    if (!quizSubject || !quizTitle.trim() || !quizDuration) {
      toast.error('Please fill all required fields');
      return;
    }

    const invalidQuestion = quizQuestions.find(
      q => !q.text.trim() || q.options.some(o => !o.trim()) || q.correctAnswer === null
    );

    if (invalidQuestion) {
      toast.error('Please complete all questions with text, options, and correct answer');
      return;
    }

    try {
      await createQuizMutation.mutateAsync({
        title: quizTitle,
        subjectId: quizSubject,
        duration: BigInt(quizDuration),
        questions: quizQuestions,
      } as any);

      toast.success('Quiz created successfully!');
      setQuizDialogOpen(false);
      setQuizSubject('');
      setQuizTitle('');
      setQuizDuration('30');
      setQuizQuestions([{ text: '', options: ['', '', '', ''], correctAnswer: BigInt(0) }]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create quiz');
    }
  };

  const addExamQuestion = () => {
    setExamQuestions([...examQuestions, { text: '', options: ['', '', '', ''], correctAnswer: null }]);
  };

  const removeExamQuestion = (index: number) => {
    setExamQuestions(examQuestions.filter((_, i) => i !== index));
  };

  const updateExamQuestion = (index: number, field: keyof ExamQuestion, value: any) => {
    const updated = [...examQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setExamQuestions(updated);
  };

  const updateExamOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...examQuestions];
    updated[qIndex].options[oIndex] = value;
    setExamQuestions(updated);
  };

  const addQuizQuestion = () => {
    setQuizQuestions([...quizQuestions, { text: '', options: ['', '', '', ''], correctAnswer: BigInt(0) }]);
  };

  const removeQuizQuestion = (index: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  const updateQuizQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    const updated = [...quizQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setQuizQuestions(updated);
  };

  const updateQuizOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...quizQuestions];
    updated[qIndex].options[oIndex] = value;
    setQuizQuestions(updated);
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

  const assignedSubjects = subjects.filter(s => teacherProfile?.assignedSubjects.includes(s.id));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Teacher Dashboard</h1>
        <p className="text-muted-foreground">Manage your students and assigned subjects.</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subjects">My Subjects</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="questions">Student Questions</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assigned Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignedSubjects.length}</div>
                <p className="text-xs text-muted-foreground">subjects teaching</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{students.length}</div>
                <p className="text-xs text-muted-foreground">in your subjects</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quiz Submissions</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{quizSubmissions.length}</div>
                <p className="text-xs text-muted-foreground">total submissions</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">Email: {teacherProfile?.email || 'Not set'}</p>
              {teacherProfile?.photo && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Profile Photo:</p>
                  <img 
                    src={teacherProfile.photo.getDirectURL()} 
                    alt="Profile" 
                    className="h-24 w-24 rounded-full object-cover"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Assigned Subjects</CardTitle>
              <CardDescription>Subjects you are currently teaching</CardDescription>
            </CardHeader>
            <CardContent>
              {assignedSubjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No subjects assigned yet. Please contact an administrator.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignedSubjects.map((subject) => (
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
        </TabsContent>

        <TabsContent value="materials" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Learning Materials</CardTitle>
                  <CardDescription>Upload and manage study materials for your subjects</CardDescription>
                </div>
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Material
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Learning Material</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Select onValueChange={setUploadSubject}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignedSubjects.map((subject) => (
                              <SelectItem key={subject.id} value={subject.id}>
                                {subject.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="materialFile">PDF File</Label>
                        <Input
                          id="materialFile"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        />
                        <p className="text-xs text-muted-foreground">Only PDF files are allowed</p>
                      </div>

                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Uploading...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <Button 
                        onClick={handleUploadMaterial} 
                        className="w-full"
                        disabled={uploadMaterialMutation.isPending || !uploadSubject || !uploadFile}
                      >
                        {uploadMaterialMutation.isPending ? 'Uploading...' : 'Upload Material'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {assignedSubjects.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No subjects assigned yet.
                </p>
              ) : (
                <div className="space-y-6">
                  {assignedSubjects.map((subject) => (
                    <div key={subject.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{subject.name}</h3>
                          <p className="text-sm text-muted-foreground">{subject.description}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewMaterialsSubject(subject.id)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Materials
                        </Button>
                      </div>
                      
                      {viewMaterialsSubject === subject.id && (
                        <div className="mt-4 space-y-2">
                          {learningMaterials.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No materials uploaded yet for this subject.
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

        <TabsContent value="questions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Questions</CardTitle>
              <CardDescription>View and respond to questions from your students</CardDescription>
            </CardHeader>
            <CardContent>
              {teacherQuestions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No questions received yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {teacherQuestions
                    .filter(q => 'question' in q.messageType)
                    .map((question) => {
                      const subject = subjects.find(s => s.id === question.subjectId);
                      return (
                        <Card key={question.messageId}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">
                                Question about {subject?.name || question.subjectId}
                              </CardTitle>
                              <Badge>Pending</Badge>
                            </div>
                            <CardDescription>
                              From: {question.sender.toString().slice(0, 10)}...
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="bg-muted p-3 rounded-lg">
                              <p className="text-sm">{question.messageText}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {new Date(Number(question.timestamp) / 1000000).toLocaleString()}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Your Reply</Label>
                              <Textarea
                                placeholder="Type your reply here..."
                                value={replyText[question.messageId] || ''}
                                onChange={(e) =>
                                  setReplyText({ ...replyText, [question.messageId]: e.target.value })
                                }
                                rows={3}
                              />
                              <Button
                                onClick={() => handleReplyToQuestion(question.messageId)}
                                disabled={replyMutation.isPending}
                                className="w-full"
                              >
                                {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Manage Exams</CardTitle>
                  <CardDescription>Create and manage exams for your subjects</CardDescription>
                </div>
                <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Exam
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Exam</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Select onValueChange={setExamSubject}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {assignedSubjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Duration (minutes)</Label>
                          <Input
                            type="number"
                            value={examDuration}
                            onChange={(e) => setExamDuration(e.target.value)}
                            min="1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                          type="datetime-local"
                          value={examStartTime}
                          onChange={(e) => setExamStartTime(e.target.value)}
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-base">Questions</Label>
                          <Button onClick={addExamQuestion} size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                          </Button>
                        </div>

                        {examQuestions.map((question, qIndex) => (
                          <Card key={qIndex}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">Question {qIndex + 1}</CardTitle>
                                {examQuestions.length > 1 && (
                                  <Button
                                    onClick={() => removeExamQuestion(qIndex)}
                                    size="sm"
                                    variant="ghost"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label>Question Text</Label>
                                <Textarea
                                  value={question.text}
                                  onChange={(e) => updateExamQuestion(qIndex, 'text', e.target.value)}
                                  placeholder="Enter question text"
                                  rows={2}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Options</Label>
                                {question.options.map((option, oIndex) => (
                                  <div key={oIndex} className="flex items-center gap-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => updateExamOption(qIndex, oIndex, e.target.value)}
                                      placeholder={`Option ${oIndex + 1}`}
                                    />
                                    <input
                                      type="radio"
                                      name={`correct-${qIndex}`}
                                      checked={question.correctAnswer === oIndex}
                                      onChange={() => updateExamQuestion(qIndex, 'correctAnswer', oIndex)}
                                      className="h-4 w-4"
                                    />
                                  </div>
                                ))}
                                <p className="text-xs text-muted-foreground">
                                  Select the radio button for the correct answer
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <Button
                        onClick={handleCreateExam}
                        disabled={createExamMutation.isPending}
                        className="w-full"
                      >
                        {createExamMutation.isPending ? 'Creating...' : 'Create Exam'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Select a subject to view exams or create a new exam using the button above.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Manage Quizzes</CardTitle>
                  <CardDescription>Create and manage quizzes for your subjects</CardDescription>
                </div>
                <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Quiz
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Quiz</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label>Quiz Title</Label>
                        <Input
                          value={quizTitle}
                          onChange={(e) => setQuizTitle(e.target.value)}
                          placeholder="Enter quiz title"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Select onValueChange={setQuizSubject}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {assignedSubjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Duration (minutes)</Label>
                          <Input
                            type="number"
                            value={quizDuration}
                            onChange={(e) => setQuizDuration(e.target.value)}
                            min="1"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-base">Questions</Label>
                          <Button onClick={addQuizQuestion} size="sm" variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                          </Button>
                        </div>

                        {quizQuestions.map((question, qIndex) => (
                          <Card key={qIndex}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">Question {qIndex + 1}</CardTitle>
                                {quizQuestions.length > 1 && (
                                  <Button
                                    onClick={() => removeQuizQuestion(qIndex)}
                                    size="sm"
                                    variant="ghost"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label>Question Text</Label>
                                <Textarea
                                  value={question.text}
                                  onChange={(e) => updateQuizQuestion(qIndex, 'text', e.target.value)}
                                  placeholder="Enter question text"
                                  rows={2}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Options</Label>
                                {question.options.map((option, oIndex) => (
                                  <div key={oIndex} className="flex items-center gap-2">
                                    <Input
                                      value={option}
                                      onChange={(e) => updateQuizOption(qIndex, oIndex, e.target.value)}
                                      placeholder={`Option ${oIndex + 1}`}
                                    />
                                    <input
                                      type="radio"
                                      name={`quiz-correct-${qIndex}`}
                                      checked={Number(question.correctAnswer) === oIndex}
                                      onChange={() => updateQuizQuestion(qIndex, 'correctAnswer', BigInt(oIndex))}
                                      className="h-4 w-4"
                                    />
                                  </div>
                                ))}
                                <p className="text-xs text-muted-foreground">
                                  Select the radio button for the correct answer
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <Button
                        onClick={handleCreateQuiz}
                        disabled={createQuizMutation.isPending}
                        className="w-full"
                      >
                        {createQuizMutation.isPending ? 'Creating...' : 'Create Quiz'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Select Subject to View Quizzes</Label>
                <Select onValueChange={setViewQuizzesSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {viewQuizzesSubject && (
                <div className="space-y-4">
                  {quizzes.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No quizzes created yet for this subject.
                    </p>
                  ) : (
                    quizzes.map((quiz) => {
                      const submissions = quizSubmissions.filter(s => s.quizId === quiz.quizId);
                      return (
                        <Card key={quiz.quizId}>
                          <CardHeader>
                            <CardTitle className="text-lg">{quiz.title}</CardTitle>
                            <CardDescription>
                              {quiz.questions.length} questions • {Number(quiz.duration)} minutes
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Submissions:</span>
                                <Badge>{submissions.length}</Badge>
                              </div>
                              {submissions.length > 0 && (
                                <div className="mt-4">
                                  <p className="text-sm font-medium mb-2">Recent Submissions:</p>
                                  <div className="space-y-2">
                                    {submissions.slice(0, 3).map((sub) => (
                                      <div key={sub.quizId + sub.studentPrincipal.toString()} className="flex items-center justify-between p-2 bg-muted rounded">
                                        <span className="text-xs">{sub.studentPrincipal.toString().slice(0, 10)}...</span>
                                        <Badge variant="secondary">
                                          {Number(sub.score)} / {quiz.questions.length}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
