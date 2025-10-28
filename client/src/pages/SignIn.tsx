import { SignIn as ClerkSignIn } from "@clerk/clerk-react";

export default function SignIn() {
  // QA MODE: Redirects disabled for testing
  // Just show the sign-in page without any logic

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <ClerkSignIn 
        routing="path" 
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/"
      />
    </div>
  );
}

