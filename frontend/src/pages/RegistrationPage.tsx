import { useState } from 'react';
import { useGetCallerUserProfile, useSaveCallerUserProfile, useSaveStudentProfile, useSaveTeacherProfile, useRequestApproval } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GraduationCap, BookOpen, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { ExternalBlob } from '../backend';

type RegistrationStep = 'name' | 'role' | 'details';
type RoleType = 'student' | 'teacher' | null;

export default function RegistrationPage() {
  const { data: userProfile } = useGetCallerUserProfile();
  const saveUserProfile = useSaveCallerUserProfile();
  const saveStudentProfile = useSaveStudentProfile();
  const saveTeacherProfile = useSaveTeacherProfile();
  const requestApproval = useRequestApproval();

  const [step, setStep] = useState<RegistrationStep>(userProfile ? 'role' : 'name');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleType>(null);
  const [email, setEmail] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      await saveUserProfile.mutateAsync({ name: name.trim() });
      toast.success('Profile created successfully!');
      setStep('role');
    } catch (error) {
      toast.error('Failed to create profile');
      console.error(error);
    }
  };

  const handleRoleSelection = (role: RoleType) => {
    setSelectedRole(role);
    setStep('details');
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
        await saveStudentProfile.mutateAsync({
          name: userProfile?.name || name,
          email: email.trim(),
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete registration');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Welcome to Excellence Academy</h1>
            <p className="text-lg text-muted-foreground">
              Complete your registration to get started
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step === 'name' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                1
              </div>
              <div className="w-16 h-1 bg-muted"></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step === 'role' ? 'bg-primary text-primary-foreground' : step === 'details' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                2
              </div>
              <div className="w-16 h-1 bg-muted"></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step === 'details' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                3
              </div>
            </div>
          </div>

          {/* Step 1: Name */}
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

          {/* Step 2: Role Selection */}
          {step === 'role' && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Select Your Role</h2>
                <p className="text-muted-foreground">
                  Are you joining as a student or teacher?
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
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

                  {selectedRole === 'teacher' && (
                    <div className="space-y-2">
                      <Label htmlFor="photo">Profile Photo (Optional)</Label>
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Upload a professional photo for your profile
                      </p>
                    </div>
                  )}

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
                      Back
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
