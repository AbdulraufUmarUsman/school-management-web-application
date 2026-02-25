import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle } from 'lucide-react';

export default function ApprovalPendingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-full w-fit">
            <Clock className="h-12 w-12 text-yellow-600 dark:text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">Approval Pending</CardTitle>
          <CardDescription className="text-base">
            Your registration has been submitted successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Registration Complete</p>
                <p className="text-sm text-muted-foreground">
                  Your account has been created and is awaiting admin approval.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">What's Next?</p>
                <p className="text-sm text-muted-foreground">
                  An administrator will review your registration. You'll be able to access the system once approved.
                </p>
              </div>
            </div>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            This usually takes 1-2 business days. Please check back later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
