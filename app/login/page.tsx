"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: AuthState = {};

export default function LoginPage() {
  const [loginState, loginAction, loginPending] = useActionState(
    signIn,
    initialState
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signUp,
    initialState
  );

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="block text-center text-2xl font-bold">
          Wayne<span className="text-primary">Web</span> Flux
        </Link>

        <Tabs defaultValue="login">
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">
              Connexion
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">
              Créer mon compte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Te revoilà</CardTitle>
                <CardDescription>
                  Connecte-toi pour retrouver ta vitrine et ton agenda.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={loginAction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="ton@email.fr"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  {loginState.error && (
                    <p className="text-sm text-destructive">{loginState.error}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={loginPending}>
                    {loginPending ? "Connexion…" : "Entrer"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>2 minutes, et ta vitrine existe</CardTitle>
                <CardDescription>
                  Gratuit. Sans carte bleue. 100 crédits offerts pour créer tes
                  premiers contenus.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={signupAction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Ton prénom</Label>
                    <Input
                      id="signup-name"
                      name="name"
                      placeholder="Alex"
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="ton@email.fr"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="8 caractères minimum"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                  {signupState.error && (
                    <p className="text-sm text-destructive">{signupState.error}</p>
                  )}
                  {signupState.message && (
                    <p className="text-sm text-emerald-400">{signupState.message}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={signupPending}>
                    {signupPending ? "Création…" : "Créer ma vitrine gratuitement"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
