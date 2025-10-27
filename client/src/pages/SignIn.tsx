import { SignIn as ClerkSignIn, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function SignIn() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If already signed in, redirect to home
    if (isLoaded && isSignedIn) {
      setLocation('/');
    }
  }, [isLoaded, isSignedIn, setLocation]);

  // Don't show sign-in if already signed in
  if (isSignedIn) {
    return null;
  }

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

