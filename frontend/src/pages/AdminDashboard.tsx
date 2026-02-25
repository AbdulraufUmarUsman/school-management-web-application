import { 
  useListApprovals, 
  useSetApproval, 
  useListAllStudents,
  useListAllTeachers,
  useAssignSubjectToTeacher,
  useGetSubjects
} from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, GraduationCap, BookOpen, Mail, CheckCircle, XCircle, Search, Clock, UserCheck, UserX, ArrowUpDown, Loader2, RefreshCw } from 'lucide-react';
import { ApprovalStatus } from '../backend';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import { Principal } from '@icp-sdk/core/principal';

type SortField = 'name' | 'email' | 'status' | 'date';
type SortOrder = 'asc' | 'desc';

export default function AdminDashboard() {
  const { data: approvals = [], isLoading: approvalsLoading, refetch: refetchApprovals } = useListApprovals();
  const { data: allStudents = [], isLoading: studentsLoading, refetch: refetchStudents } = useListAllStudents();
  const { data: allTeachers = [], isLoading: teachersLoading, refetch: refetchTeachers } = useListAllTeachers();
  const { data: subjects = [] } = useGetSubjects();
  const setApprovalMutation = useSetApproval();
  const assignSubjectMutation = useAssignSubjectToTeacher();

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Principal | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  
  const [studentFilter, setStudentFilter] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'all' | ApprovalStatus>('all');
  const [studentSortField, setStudentSortField] = useState<SortField>('date');
  const [studentSortOrder, setStudentSortOrder] = useState<SortOrder>('desc');
  
  const [teacherFilter, setTeacherFilter] = useState('');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<'all' | ApprovalStatus>('all');
  const [teacherSortField, setTeacherSortField] = useState<SortField>('date');
  const [teacherSortOrder, setTeacherSortOrder] = useState<SortOrder>('desc');

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ user: Principal; status: ApprovalStatus; name: string; role: string } | null>(null);

  // Compute students with approval status
  const studentsWithStatus = useMemo(() => {
    return allStudents.map(([principal, student]) => {
      const approval = approvals.find(a => a.principal.toString() === principal.toString());
      const status = approval?.status || ApprovalStatus.pending;
      return [principal, student, status] as [Principal, typeof student, ApprovalStatus];
    });
  }, [allStudents, approvals]);

  // Compute teachers with approval status
  const teachersWithStatus = useMemo(() => {
    return allTeachers.map(([principal, teacher]) => {
      const approval = approvals.find(a => a.principal.toString() === principal.toString());
      const status = approval?.status || ApprovalStatus.pending;
      return [principal, teacher, status] as [Principal, typeof teacher, ApprovalStatus];
    });
  }, [allTeachers, approvals]);

  // Compute status counts
  const statusCounts = useMemo(() => {
    const studentCounts = studentsWithStatus.reduce(
      (acc, [, , status]) => {
        if (status === ApprovalStatus.pending) acc.pending++;
        else if (status === ApprovalStatus.approved) acc.approved++;
        else if (status === ApprovalStatus.rejected) acc.rejected++;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 }
    );

    const teacherCounts = teachersWithStatus.reduce(
      (acc, [, , status]) => {
        if (status === ApprovalStatus.pending) acc.pending++;
        else if (status === ApprovalStatus.approved) acc.approved++;
        else if (status === ApprovalStatus.rejected) acc.rejected++;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 }
    );

    return {
      students: studentCounts,
      teachers: teacherCounts,
    };
  }, [studentsWithStatus, teachersWithStatus]);

  const handleApprovalClick = (user: Principal, status: ApprovalStatus, name: string, role: string) => {
    setConfirmAction({ user, status, name, role });
    setConfirmDialogOpen(true);
  };

  const handleApprovalConfirm = async () => {
    if (!confirmAction) return;

    const actionText = confirmAction.status === ApprovalStatus.approved ? 'approved' : 'rejected';
    
    try {
      await setApprovalMutation.mutateAsync({ 
        user: confirmAction.user, 
        status: confirmAction.status 
      });
      
      // Manually refetch all related data to ensure UI is up to date
      await Promise.all([
        refetchApprovals(),
        refetchStudents(),
        refetchTeachers()
      ]);
      
      toast.success(`${confirmAction.role} ${actionText}`, {
        description: `${confirmAction.name} has been ${actionText} successfully.`
      });
      
      setConfirmDialogOpen(false);
      setConfirmAction(null);
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error(`Failed to ${actionText.slice(0, -1)} ${confirmAction.role.toLowerCase()}`, {
        description: error.message || 'An unexpected error occurred. Please try again.'
      });
    }
  };

  const handleAssignSubject = async () => {
    if (!selectedTeacher || !selectedSubject) {
      toast.error('Missing information', {
        description: 'Please select both teacher and subject'
      });
      return;
    }

    try {
      await assignSubjectMutation.mutateAsync({
        teacher: selectedTeacher,
        subjectId: selectedSubject,
      });
      
      // Refetch teachers data
      await refetchTeachers();
      
      const subjectName = subjects.find(s => s.id === selectedSubject)?.name || selectedSubject;
      toast.success('Subject assigned successfully', {
        description: `${subjectName} has been assigned to the teacher.`
      });
      
      setAssignDialogOpen(false);
      setSelectedTeacher(null);
      setSelectedSubject('');
    } catch (error: any) {
      console.error('Assignment error:', error);
      toast.error('Failed to assign subject', {
        description: error.message || 'An unexpected error occurred. Please try again.'
      });
    }
  };

  const handleRefreshData = async () => {
    toast.promise(
      Promise.all([
        refetchApprovals(),
        refetchStudents(),
        refetchTeachers()
      ]),
      {
        loading: 'Refreshing data...',
        success: 'Data refreshed successfully',
        error: 'Failed to refresh data'
      }
    );
  };

  const pendingApprovals = approvals.filter(a => a.status === ApprovalStatus.pending);

  // Sort function
  const sortUsers = <T extends { name: string; email: string; registrationDate: bigint }>(
    users: Array<[Principal, T, ApprovalStatus]>,
    sortField: SortField,
    sortOrder: SortOrder
  ) => {
    return [...users].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a[1].name.localeCompare(b[1].name);
          break;
        case 'email':
          comparison = a[1].email.localeCompare(b[1].email);
          break;
        case 'status':
          const statusOrder = { pending: 0, approved: 1, rejected: 2 };
          comparison = statusOrder[a[2]] - statusOrder[b[2]];
          break;
        case 'date':
          comparison = Number(a[1].registrationDate - b[1].registrationDate);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    const filtered = studentsWithStatus.filter(([principal, student, status]) => {
      const matchesSearch = student.name.toLowerCase().includes(studentFilter.toLowerCase()) ||
                           student.email.toLowerCase().includes(studentFilter.toLowerCase());
      const matchesStatus = studentStatusFilter === 'all' || status === studentStatusFilter;
      return matchesSearch && matchesStatus;
    });
    return sortUsers(filtered, studentSortField, studentSortOrder);
  }, [studentsWithStatus, studentFilter, studentStatusFilter, studentSortField, studentSortOrder]);

  // Filter and sort teachers
  const filteredAndSortedTeachers = useMemo(() => {
    const filtered = teachersWithStatus.filter(([principal, teacher, status]) => {
      const matchesSearch = teacher.name.toLowerCase().includes(teacherFilter.toLowerCase()) ||
                           teacher.email.toLowerCase().includes(teacherFilter.toLowerCase());
      const matchesStatus = teacherStatusFilter === 'all' || status === teacherStatusFilter;
      return matchesSearch && matchesStatus;
    });
    return sortUsers(filtered, teacherSortField, teacherSortOrder);
  }, [teachersWithStatus, teacherFilter, teacherStatusFilter, teacherSortField, teacherSortOrder]);

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.approved:
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case ApprovalStatus.rejected:
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case ApprovalStatus.pending:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  if (approvalsLoading || studentsLoading || teachersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage users, approvals, and system settings.</p>
        </div>
        <Button onClick={handleRefreshData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">
            Students
            {statusCounts.students.pending > 0 && (
              <Badge variant="destructive" className="ml-2">{statusCounts.students.pending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="teachers">
            Teachers
            {statusCounts.teachers.pending > 0 && (
              <Badge variant="destructive" className="ml-2">{statusCounts.teachers.pending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingApprovals.length}</div>
                <p className="text-xs text-muted-foreground">awaiting review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentsWithStatus.length}</div>
                <p className="text-xs text-muted-foreground">registered students</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teachersWithStatus.length}</div>
                <p className="text-xs text-muted-foreground">registered teachers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subjects.length}</div>
                <p className="text-xs text-muted-foreground">available subjects</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Student Status Overview</CardTitle>
                <CardDescription>Breakdown of student approval statuses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                    <span className="font-medium">Pending</span>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">{statusCounts.students.pending}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-green-600 dark:text-green-500" />
                    <span className="font-medium">Approved</span>
                  </div>
                  <Badge className="bg-green-500 hover:bg-green-600 text-lg px-3 py-1">{statusCounts.students.approved}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserX className="h-5 w-5 text-red-600 dark:text-red-500" />
                    <span className="font-medium">Rejected</span>
                  </div>
                  <Badge variant="destructive" className="text-lg px-3 py-1">{statusCounts.students.rejected}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Teacher Status Overview</CardTitle>
                <CardDescription>Breakdown of teacher approval statuses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                    <span className="font-medium">Pending</span>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">{statusCounts.teachers.pending}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-green-600 dark:text-green-500" />
                    <span className="font-medium">Approved</span>
                  </div>
                  <Badge className="bg-green-500 hover:bg-green-600 text-lg px-3 py-1">{statusCounts.teachers.approved}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <UserX className="h-5 w-5 text-red-600 dark:text-red-500" />
                    <span className="font-medium">Rejected</span>
                  </div>
                  <Badge variant="destructive" className="text-lg px-3 py-1">{statusCounts.teachers.rejected}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>Quick stats about your school management system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Subjects</span>
                <Badge>{subjects.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Approved Users</span>
                <Badge>{approvals.filter(a => a.status === ApprovalStatus.approved).length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Rejected Users</span>
                <Badge variant="destructive">{approvals.filter(a => a.status === ApprovalStatus.rejected).length}</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Students Management
                  </CardTitle>
                  <CardDescription>View and manage student records with approval status</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={studentFilter}
                      onChange={(e) => setStudentFilter(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={studentStatusFilter} onValueChange={(value) => setStudentStatusFilter(value as 'all' | ApprovalStatus)}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value={ApprovalStatus.pending}>Pending</SelectItem>
                      <SelectItem value={ApprovalStatus.approved}>Approved</SelectItem>
                      <SelectItem value={ApprovalStatus.rejected}>Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={studentSortField} onValueChange={(value) => setStudentSortField(value as SortField)}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setStudentSortOrder(studentSortOrder === 'asc' ? 'desc' : 'asc')}
                    title={`Sort ${studentSortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAndSortedStudents.length === 0 ? (
                <div className="text-center py-12">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">
                    {studentFilter || studentStatusFilter !== 'all' ? 'No students match your filters.' : 'No students registered yet.'}
                  </p>
                  {(studentFilter || studentStatusFilter !== 'all') && (
                    <Button 
                      variant="link" 
                      onClick={() => {
                        setStudentFilter('');
                        setStudentStatusFilter('all');
                      }}
                      className="mt-2"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Registration Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedStudents.map(([principal, student, status]) => (
                        <TableRow key={principal.toString()}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20">
                              <GraduationCap className="h-3 w-3 mr-1" />
                              Student
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(Number(student.registrationDate) / 1000000).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>{getStatusBadge(status)}</TableCell>
                          <TableCell className="text-right">
                            {status === ApprovalStatus.pending && (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprovalClick(principal, ApprovalStatus.approved, student.name, 'Student')}
                                  disabled={setApprovalMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleApprovalClick(principal, ApprovalStatus.rejected, student.name, 'Student')}
                                  disabled={setApprovalMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Teachers Management
                    </CardTitle>
                    <CardDescription>View and manage teacher records with approval status</CardDescription>
                  </div>
                  <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>Assign Subject</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Subject to Teacher</DialogTitle>
                        <DialogDescription>Select a teacher and subject to assign</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Teacher</Label>
                          <Select onValueChange={(value) => setSelectedTeacher(Principal.fromText(value))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select teacher" />
                            </SelectTrigger>
                            <SelectContent>
                              {teachersWithStatus
                                .filter(([, , status]) => status === ApprovalStatus.approved)
                                .map(([principal, teacher]) => (
                                  <SelectItem key={principal.toString()} value={principal.toString()}>
                                    {teacher.name} ({teacher.email})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Select onValueChange={setSelectedSubject}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <DialogFooter>
                          <Button 
                            onClick={handleAssignSubject} 
                            disabled={assignSubjectMutation.isPending}
                          >
                            {assignSubjectMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Assigning...
                              </>
                            ) : (
                              'Assign Subject'
                            )}
                          </Button>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={teacherFilter}
                      onChange={(e) => setTeacherFilter(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Select value={teacherStatusFilter} onValueChange={(value) => setTeacherStatusFilter(value as 'all' | ApprovalStatus)}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value={ApprovalStatus.pending}>Pending</SelectItem>
                      <SelectItem value={ApprovalStatus.approved}>Approved</SelectItem>
                      <SelectItem value={ApprovalStatus.rejected}>Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={teacherSortField} onValueChange={(value) => setTeacherSortField(value as SortField)}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTeacherSortOrder(teacherSortOrder === 'asc' ? 'desc' : 'asc')}
                    title={`Sort ${teacherSortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAndSortedTeachers.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">
                    {teacherFilter || teacherStatusFilter !== 'all' ? 'No teachers match your filters.' : 'No teachers registered yet.'}
                  </p>
                  {(teacherFilter || teacherStatusFilter !== 'all') && (
                    <Button 
                      variant="link" 
                      onClick={() => {
                        setTeacherFilter('');
                        setTeacherStatusFilter('all');
                      }}
                      className="mt-2"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Registration Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedTeachers.map(([principal, teacher, status]) => (
                        <TableRow key={principal.toString()}>
                          <TableCell className="font-medium">{teacher.name}</TableCell>
                          <TableCell>{teacher.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/20">
                              <BookOpen className="h-3 w-3 mr-1" />
                              Teacher
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(Number(teacher.registrationDate) / 1000000).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>{getStatusBadge(status)}</TableCell>
                          <TableCell className="text-right">
                            {status === ApprovalStatus.pending && (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  onClick={() => handleApprovalClick(principal, ApprovalStatus.approved, teacher.name, 'Teacher')}
                                  disabled={setApprovalMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleApprovalClick(principal, ApprovalStatus.rejected, teacher.name, 'Teacher')}
                                  disabled={setApprovalMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Approvals</CardTitle>
              <CardDescription>Review and approve or reject user registrations</CardDescription>
            </CardHeader>
            <CardContent>
              {approvals.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No approval requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvals.map((approval) => (
                    <Card key={approval.principal.toString()}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">
                              {approval.principal.toString().slice(0, 20)}...
                            </CardTitle>
                            <CardDescription>Principal ID</CardDescription>
                          </div>
                          {getStatusBadge(approval.status)}
                        </div>
                      </CardHeader>
                      {approval.status === ApprovalStatus.pending && (
                        <CardContent>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprovalClick(approval.principal, ApprovalStatus.approved, 'User', 'User')}
                              disabled={setApprovalMutation.isPending}
                            >
                              {setApprovalMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-1" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleApprovalClick(approval.principal, ApprovalStatus.rejected, 'User', 'User')}
                              disabled={setApprovalMutation.isPending}
                            >
                              {setApprovalMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-1" />
                              )}
                              Reject
                            </Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.status === ApprovalStatus.approved ? 'Approve User' : 'Reject User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmAction?.status === ApprovalStatus.approved ? 'approve' : 'reject'} <strong>{confirmAction?.name}</strong>? 
              {confirmAction?.status === ApprovalStatus.approved 
                ? ' This will grant them access to the system.' 
                : ' This will deny them access to the system.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setApprovalMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprovalConfirm}
              disabled={setApprovalMutation.isPending}
              className={confirmAction?.status === ApprovalStatus.rejected ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {setApprovalMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
