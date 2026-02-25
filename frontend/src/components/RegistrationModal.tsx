import { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile, useSaveCallerUserProfile, useSaveStudentProfile, useSaveTeacherProfile, useRequestApproval } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, BookOpen, ArrowRight, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { ExternalBlob } from '../backend';

type RegistrationStep = 'role' | 'login' | 'name' | 'details';
type RoleType = 'student' | 'teacher' | null;

interface RegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RegistrationModal({ open, onOpenChange }: RegistrationModalProps) {
  const { login, identity, loginStatus } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const saveUserProfile = useSaveCallerUserProfile();
  const saveStudentProfile = useSaveStudentProfile();
  const saveTeacherProfile = useSaveTeacherProfile();
  const requestApproval = useRequestApproval();

  const [step, setStep] = useState<RegistrationStep>('role');
  const [selectedRole, setSelectedRole] = useState<RoleType>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';

  // Reset state when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep('role');
      setSelectedRole(null);
      setName('');
      setEmail('');
      setPhotoFile(null);
      setIsSubmitting(false);
    }
    onOpenChange(newOpen);
  };

  const handleRoleSelection = async (role: RoleType) => {
    setSelectedRole(role);
    
    if (!isAuthenticated) {
      setStep('login');
    } else if (!userProfile) {
      setStep('name');
    } else {
      setStep('details');
    }
  };

  const handleLogin = async () => {
    try {
      await login();
      // After successful login, check if user has profile
      if (!userProfile) {
        setStep('name');
      } else {
        setStep('details');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
      console.error(error);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await saveUserProfile.mutateAsync({ name: name.trim() });
      toast.success('Profile created successfully!');
      setStep('details');
    } catch (error) {
      toast.error('Failed to create profile');
      console.error(error);
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedRole === 'student') {
        let profileImageBlob: ExternalBlob | undefined = undefined;
        if (photoFile) {
          const arrayBuffer = await photoFile.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          profileImageBlob = ExternalBlob.fromBytes(uint8Array);
        }

        await saveStudentProfile.mutateAsync({
          name: userProfile?.name || name,
          email: email.trim(),
          profileImage: profileImageBlob,
          enrolledSubjects: [],
          grades: [],
          registrationDate: BigInt(Date.now()),
        });
      } else if (selectedRole === 'teacher') {
        let photoBlob: ExternalBlob | undefined = undefined;
        if (photoFile) {
          const arrayBuffer = await photoFile.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          photoBlob = ExternalBlob.fromBytes(uint8Array);
        }

        await saveTeacherProfile.mutateAsync({
          name: userProfile?.name || name,
          email: email.trim(),
          assignedSubjects: [],
          photo: photoBlob,
          registrationDate: BigInt(Date.now()),
        });
      }

      // Request approval after profile creation
      await requestApproval.mutateAsync();
      toast.success('Registration complete! Waiting for admin approval.');
      handleOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete registration');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">Join Excellence Academy</DialogTitle>
          <DialogDescription className="text-center text-base">
            Complete your registration to get started
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step === 'role' ? 'bg-primary text-primary-foreground' : 'bg-primary/50 text-primary-foreground'}`}>
                1
              </div>
              <div className={`w-16 h-1 ${step !== 'role' ? 'bg-primary' : 'bg-muted'}`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step === 'login' || step === 'name' ? 'bg-primary text-primary-foreground' : step === 'details' ? 'bg-primary/50 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                2
              </div>
              <div className={`w-16 h-1 ${step === 'details' ? 'bg-primary' : 'bg-muted'}`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step === 'details' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                3
              </div>
            </div>
          </div>

          {/* Step 1: Role Selection */}
          {step === 'role' && (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">Select Your Role</h3>
                <p className="text-muted-foreground">
                  Are you joining as a student or teacher?
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card 
                  className="cursor-pointer hover:border-primary hover:shadow-lg transition-all"
                  onClick={() => handleRoleSelection('student')}
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
                      <GraduationCap className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Student</CardTitle>
                    <CardDescription className="text-base">
                      Register as a student to enroll in subjects, view your grades, and track your academic progress.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button className="w-full">
                      Register as Student
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:border-primary hover:shadow-lg transition-all"
                  onClick={() => handleRoleSelection('teacher')}
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
                      <BookOpen className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Teacher</CardTitle>
                    <CardDescription className="text-base">
                      Register as a teacher to manage students, assign grades, and teach your subjects.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button className="w-full">
                      Register as Teacher
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 2: Login */}
          {step === 'login' && (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Login to Continue</CardTitle>
                <CardDescription>
                  You need to authenticate with Internet Identity to register as a {selectedRole}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
                    <LogIn className="h-12 w-12 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    Click the button below to securely login with Internet Identity
                  </p>
                </div>
                <Button 
                  onClick={handleLogin} 
                  className="w-full"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? 'Logging in...' : 'Login with Internet Identity'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setStep('role');
                    setSelectedRole(null);
                  }}
                >
                  Back
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2b: Name Entry (for new users) */}
          {step === 'name' && (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>What's your name?</CardTitle>
                <CardDescription>
                  Let's start by getting to know you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNameSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={saveUserProfile.isPending}>
                    {saveUserProfile.isPending ? 'Saving...' : 'Continue'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Details */}
          {step === 'details' && selectedRole && (
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>
                  {selectedRole === 'student' ? 'Student' : 'Teacher'} Registration
                </CardTitle>
                <CardDescription>
                  Complete your profile details. Your account will need admin approval before you can access the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDetailsSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll use this to contact you about your account
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="photo">Profile Photo (Optional)</Label>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload a {selectedRole === 'teacher' ? 'professional' : 'profile'} photo
                    </p>
                  </div>

                  <div className="pt-4 space-y-3">
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Submitting...' : 'Complete Registration'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setStep('role');
                        setSelectedRole(null);
                        setEmail('');
                        setPhotoFile(null);
                      }}
                    >
                      Back to Role Selection
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
