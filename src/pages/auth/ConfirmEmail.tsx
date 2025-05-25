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

// ---------------------------------------------------------------------------------------------------------------------
//  Confirmation page – handles magic‑link, signup & both sides of email‑change.
//  Token + type are accepted from the URL fragment (preferred) or query‑string (legacy).
// ---------------------------------------------------------------------------------------------------------------------

const ConfirmEmail: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email…')

  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const processedRef = useRef(false)

  // ---------------- helpers ------------------------------------------------------------------------------------------
  const finishSuccess = (kind: string) => {
    setStatus('success')
    const msg =
      kind === 'signup'
        ? 'Your email has been verified – you are now logged in!'
        : 'Your email has been updated – you are now logged in!'
    setMessage(msg)
    toast({ variant: 'success', title: 'Success', description: msg })

    // strip tokens so refresh / back‑button can’t re‑fire verifyOtp()
    window.history.replaceState({}, '', '/auth/email')

    setTimeout(() => navigate('/dashboard'), 2800)
  }

  // ---------------- verification effect -----------------------------------------------------------------------------
  useEffect(() => {
    const verify = async () => {
      if (processedRef.current) return
      processedRef.current = true

      try {
        // 1️⃣  check for hash‑style access / refresh tokens (magic‑link login)
        const hashParams   = new URLSearchParams(location.hash.slice(1))
        const accessToken  = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const pkceCode     = hashParams.get('code')
        const hashType     = hashParams.get('type')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          if (error) throw error
          finishSuccess(hashType === 'signup' ? 'signup' : 'email_change')
          return
        }

        if (pkceCode) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(pkceCode)
          if (error || !data.session) throw error ?? new Error('Failed PKCE exchange')
          finishSuccess(hashType === 'signup' ? 'signup' : 'email_change')
          return
        }

        // 2️⃣  token_hash for signup / email‑change -------------------------------------------------------------------
        const searchParams = new URLSearchParams(location.search)
        const tokenHash =
          hashParams.get('token_hash') ??
          searchParams.get('token_hash') ??
          searchParams.get('token')
        const tokenType =
          hashParams.get('type') ??
          searchParams.get('type') ??
          'email'

        if (!tokenHash) throw new Error('Invalid link – missing token.')

        logToSupabase('verifyOtp()', { level: 'info', page: 'ConfirmEmail', data: { tokenType } })
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: tokenType as any, // use literal Supabase sent (signup, email_change_new, etc.)
        })
        if (error) throw error

        finishSuccess(tokenType === 'signup' ? 'signup' : 'email_change')
      } catch (err: any) {
        logToSupabase('verification failed', { level: 'error', page: 'ConfirmEmail', data: { error: err?.message } })
        setStatus('error')
        const msg = err?.message ?? 'Verification failed – link may have expired.'
        setMessage(msg)
        toast({ variant: 'destructive', title: 'Verification failed', description: msg })
      }
    }

    verify()
  }, [location.hash, location.search])

  // ---------------- presentation -------------------------------------------------------------------------------------
  const Icon = status === 'loading' ? Loader : status === 'success' ? CheckCircle : XCircle
  const heading = status === 'loading' ? 'Email Verification' : status === 'success' ? 'All Set!' : 'Uh‑oh…'
  const bgGradient =
    status === 'success'
      ? 'from-emerald-50 via-white to-white' // subtle green tint on success
      : status === 'error'
      ? 'from-red-50 via-white to-white'     // red tint on failure
      : 'from-indigo-50 via-white to-white'  // brand purple tint while loading

  const brandPurple = '#7C3AED'

  return (
    <div className={`min-h-screen w-full flex flex-col bg-gradient-to-br ${bgGradient}`}>      
      {/* top bar */}
      <header className="w-full py-5 flex justify-center bg-white/80 backdrop-blur-md shadow-sm">
        <Logo size="md" />
      </header>

      {/* main */}
      <main className="flex-grow flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-lg"
        >
          <Card className="relative overflow-hidden border border-gray-200 shadow-xl rounded-3xl bg-white">
            {/* accent ring */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent bg-[radial-gradient(circle_at_top_left,theme(colors.indigo.300)_0%,transparent_70%)]" />

            <CardHeader className="text-center pb-1 relative z-10 bg-white/80 backdrop-blur-sm rounded-t-3xl">
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
                    ? 'bg-indigo-100'
                    : status === 'success'
                    ? 'bg-emerald-100'
                    : 'bg-red-100'
                }`}
              >
                <Icon
                  className={`h-12 w-12 ${
                    status === 'loading'
                      ? 'text-indigo-600'
                      : status === 'success'
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  } ${status === 'loading' ? 'animate-none' : ''}`}
                />
              </motion.div>

              <p className="text-center text-lg text-gray-700 max-w-sm leading-relaxed">
                {message}
              </p>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center bg-gray-50 rounded-b-3xl relative z-10 p-6">
              {status === 'success' ? (
                <Button style={{ background: brandPurple }} onClick={() => navigate('/dashboard')} className="w-full sm:w-auto text-white hover:opacity-90">
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button onClick={() => navigate('/login')} className="w-full sm:w-auto" variant="outline">
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

      {/* footer */}
      <footer className="py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Theraiapi. All rights reserved.
      </footer>
    </div>
  )
}

export default ConfirmEmail
