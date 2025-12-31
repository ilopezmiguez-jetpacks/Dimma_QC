import React, { useState } from 'react';
    import { Navigate } from 'react-router-dom';
    import { Helmet } from 'react-helmet';
    import { Eye, EyeOff, User, Lock, Mail } from 'lucide-react';
    import { useAuth } from '@/contexts/SupabaseAuthContext';
    import { supabase } from '@/lib/customSupabaseClient';
    import { Button } from '@/components/ui/button';
    import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
      AlertDialogTrigger,
    } from "@/components/ui/alert-dialog";
    import { useToast } from "@/components/ui/use-toast";

    const ForgotPasswordForm = () => {
      const [email, setEmail] = useState('');
      const [loading, setLoading] = useState(false);
      const { toast } = useToast();
      const [submitted, setSubmitted] = useState(false);

      const handlePasswordReset = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        setLoading(false);
        if (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not send recovery email. Please try again.",
          });
        } else {
          setSubmitted(true);
        }
      };

      if (submitted) {
        return (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Check your Email</AlertDialogTitle>
              <AlertDialogDescription>
                If an account exists for {email}, you will receive an email with a link to reset your password.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>Got it</AlertDialogAction>
            </AlertDialogFooter>
          </>
        );
      }

      return (
        <form onSubmit={handlePasswordReset}>
          <AlertDialogHeader>
            <AlertDialogTitle>Recover Password</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your email to receive a recovery link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <label htmlFor="reset-email" className="sr-only">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="reset-email"
                name="email"
                type="email"
                required
                className="pl-10 w-full px-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Email'}
            </Button>
          </AlertDialogFooter>
        </form>
      );
    };

    const LoginPage = () => {
      const [credentials, setCredentials] = useState({ email: 'admin@qclab.com', password: 'password' });
      const [showPassword, setShowPassword] = useState(false);
      const [loading, setLoading] = useState(false);
      const { user, signIn } = useAuth();

      if (user) {
        return <Navigate to="/" replace />;
      }

      const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await signIn(credentials.email, credentials.password);
        setLoading(false);
      };

      return (
        <>
          <Helmet>
            <title>Sign In - DIMMA QC</title>
            <meta name="description" content="Access the lab quality management system." />
          </Helmet>

          <div className="min-h-screen flex bg-background">
            <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
              <div
                className="max-w-md w-full space-y-8"
              >
                <div className="text-center">
                  <div
                    className="mx-auto mb-4"
                  >
                    <img src="https://horizons-cdn.hostinger.com/770b05f8-546d-4c93-9876-b17441ae2f8f/51750a6ee84fc1f5ad8b11fe7d362ac8.jpg" alt="DIMMA QC Logo" className="w-24 h-24 mx-auto"/>
                  </div>
                  
                  <h1 className="text-3xl font-bold text-foreground mb-2">DIMMA QC</h1>
                  <p className="text-muted-foreground">Laboratory Quality Management</p>
                </div>

                <form
                  className="mt-8 space-y-6"
                  onSubmit={handleSubmit}
                >
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          className="pl-10 w-full px-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all bg-white"
                          placeholder="Enter your email"
                          value={credentials.email}
                          onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          required
                          className="pl-10 pr-10 w-full px-3 py-3 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all bg-white"
                          placeholder="Enter your password"
                          value={credentials.password}
                          onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                   <div className="text-sm text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button type="button" className="font-medium text-primary hover:text-primary/90">
                            Forgot your password?
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <ForgotPasswordForm />
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>


                  <Button
                    type="submit"
                    className="w-full medical-gradient text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </div>
            </div>

            <div className="hidden lg:block lg:w-1/2 medical-gradient relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 to-teal-900/40"></div>
              <div className="relative h-full flex items-center justify-center p-12">
                <div
                  className="text-center text-white"
                >
                  <img className="w-96 h-auto mx-auto mb-8" alt="Dimma Technology Logo" src="https://horizons-cdn.hostinger.com/770b05f8-546d-4c93-9876-b17441ae2f8f/b2b49816002405009212d0b362d3631c.jpg" />
                  
                  <h2 className="text-4xl font-bold mb-4">Quality and Precision</h2>
                  <p className="text-xl text-teal-100 max-w-md mx-auto">
                    The ultimate tool for daily quality control in your laboratory.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    };

    export default LoginPage;