import { SignUp as ClerkSignUp, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function SignUp() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If already signed in, redirect to home
    if (isLoaded && isSignedIn) {
      setLocation('/');
    }
  }, [isLoaded, isSignedIn, setLocation]);

  // Don't show sign-up if already signed in
  if (isSignedIn) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <ClerkSignUp 
        routing="path" 
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/"
      />
    </div>
  );
}

