"use client";

import { StackClientApp } from "@stackframe/stack";

const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
const publishableClientKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;

/** Accounts are optional: without keys the app keeps everything in the browser. */
export const authConfigured = Boolean(projectId && publishableClientKey);

export const stackApp = authConfigured
  ? new StackClientApp({
      projectId: projectId!,
      publishableClientKey: publishableClientKey!,
      tokenStore: "nextjs-cookie",
      redirectMethod: "nextjs",
      urls: {
        signIn: "/entrar",
        signUp: "/registro",
        emailVerification: "/entrar/verificar",
        forgotPassword: "/entrar/recuperar",
        passwordReset: "/entrar/nueva-clave",
        oauthCallback: "/entrar/callback",
        afterSignIn: "/mis-becas",
        afterSignUp: "/mis-becas",
        afterSignOut: "/",
        home: "/",
      },
    })
  : null;
