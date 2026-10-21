"use client";

/** Preview of the signed-out landing (sign in + request a demo) while already signed in. */
import { SignInScreen } from "@/components/auth/sign-in";
import { IndustrialDataProvider } from "@/providers/industrial-data-context";

export default function SignInPreview() {
  return (
    <IndustrialDataProvider>
      <SignInScreen />
    </IndustrialDataProvider>
  );
}
