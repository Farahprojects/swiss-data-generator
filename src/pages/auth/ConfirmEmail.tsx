

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Loader, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import Logo from '@/components/Logo'
import { useToast } from '@/hooks/use-toast'
import { logToSupabase } from '@/utils/batchedLogManager'

/**
 * Elegant confirmation page for magic‑link & email‑change flows.
 */

const ConfirmEmail: React.FC = () => {
  // ---------------------------------------------------------------------------
  // state
  // ---------------------------------------------------------------------------
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email…')

  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const processedRef = useRef(false)

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------
  const finishSuccess = (kind: string) => {
    setStatus('success')
    const msg =
      kind === 'signup'
        ? 'Your email has been verified – you are now logged in!'
        : 'Your email has been updated – you are now logged in!'
    setMessage(msg)
    toast({ variant: 'success', title: 'Success', description: msg })
    // strip tokens so refreshes don't re‑trigger verification
    window.history.replaceState({}, '', '/auth/email')
    setTimeout(() => navigate('/dashboard'), 2800)
  }

  // ---------------------------------------------------------------------------
  // verification effect
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const verify = async () => {
      if (processedRef.current) return
      processedRef.current = true
      try {
        const hash = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hash.get('access_token')
        const refreshToken = hash.get('refresh_token')
        const code = hash.get('code')
        const hashType = hash.get('type')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
          finishSuccess(hashType === 'signup' ? 'signup' : 'email_change')
          return
        }

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error || !data.session) throw error ?? new Error('No session returned')
          finishSuccess(hashType === 'signup' ? 'signup' : 'email_change')
          return
        }

        const query = new URLSearchParams(location.search)
        const tokenHash = query.get('token_hash') || query.get('token')
        const queryType = query.get('type') ?? 'email'

        if (!tokenHash) throw new Error('Invalid link – missing token.')

        // Use whatever token type Supabase sent without validation
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: queryType as any,
        })
        if (error) throw error

        // Determine success message based on token type
        const isSignup = queryType === 'signup'
        finishSuccess(isSignup ? 'signup' : 'email_change')
      } catch (err: any) {
        logToSupabase('verification failed', {
          level: 'error',
          page: 'ConfirmEmail',
          data: { error: err?.message ?? String(err) },
        })
        setStatus('error')
        const msg = err?.message ?? 'Verification failed – link may have expired.'
        setMessage(msg)
        toast({ variant: 'destructive', title: 'Verification failed', description: msg })
      }
    }
    verify()
  }, [location.search])

  // ---------------------------------------------------------------------------
  // presentational bits
  // ---------------------------------------------------------------------------
  const Icon =
    status === 'loading' ? Loader : status === 'success' ? CheckCircle : XCircle
  const heading =
    status === 'loading' ? 'Email Verification' : status === 'success' ? 'All Set!' : 'Uh‑oh…'
  const bgGradient =
    status === 'success'
      ? 'from-green-400/10 via-emerald-100 to-white'
      : status === 'error'
      ? 'from-red-400/10 via-rose-100 to-white'
      : 'from-indigo-400/10 via-sky-100 to-white'

  return (
    <div
      className={
        'min-h-screen flex flex-col overflow-x-hidden bg-gradient-to-br ' + bgGradient
      }
    >
      {/* ------------------------------------------------------------------ */}
      {/* top bar */}
      {/* ------------------------------------------------------------------ */}
      <header className="w-full py-4 px-6 flex justify-center bg-white/70 backdrop-blur-lg shadow-sm">
        <Logo size="md" />
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* main card */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-grow grid place-items-center p-6 lg:p-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <Card className="relative overflow-hidden border border-gray-200/80 shadow-xl rounded-3xl bg-white">
            {/* subtle gradient ring */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent bg-[radial-gradient(circle_at_top_left,theme(colors.indigo.400)_0%,transparent_70%)]" />

            <CardHeader className="text-center pb-1 relative z-10 bg-white/70 backdrop-blur-sm rounded-t-3xl">
              <CardTitle className="text-3xl font-extrabold tracking-tight text-gray-900">
                {heading}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {status === 'loading'
                  ? 'Hold tight while we confirm…'
                  : status === 'success'
                  ? 'You are verified.'
                  : 'We encountered a problem.'}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col items-center gap-6 p-10 relative z-10">
              <motion.div
                animate={{ rotate: status === 'loading' ? 360 : 0 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                className={`flex items-center justify-center h-20 w-20 rounded-full ${
                  status === 'loading'
                    ? 'bg-indigo-50'
                    : status === 'success'
                    ? 'bg-emerald-50'
                    : 'bg-rose-50'
                }`}
              >
                <Icon
                  className={`h-12 w-12 ${
                    status === 'loading'
                      ? 'text-indigo-600'
                      : status === 'success'
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  } ${status === 'loading' ? 'animate-none' : ''}`}
                />
              </motion.div>

              <p className="text-center text-lg text-gray-700 max-w-xs leading-relaxed">
                {message}
              </p>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center bg-gray-50 rounded-b-3xl relative z-10 p-6">
              {status === 'success' ? (
                <Button onClick={() => navigate('/dashboard')} className="w-full sm:w-auto">
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => navigate('/login')}
                    className="w-full sm:w-auto"
                    variant="outline"
                  >
                    Return to Login
                  </Button>
                  {status === 'error' && (
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link to="/signup">Create Account</Link>
                    </Button>
                  )}
                </>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* footer */}
      {/* ------------------------------------------------------------------ */}
      <footer className="py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Theraiapi. All rights reserved.
      </footer>
    </div>
  )
}

export default ConfirmEmail
