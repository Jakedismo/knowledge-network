"use client"
/* eslint-disable react/no-unescaped-entities */

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Lock } from 'lucide-react'
import { useMutation } from '@apollo/client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { REQUEST_PASSWORD_RESET, RESET_PASSWORD } from '@/lib/graphql/auth-mutations'
import { logger } from '@/lib/logger'
import { logger } from '@/lib/logger'

// Validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

interface ForgotPasswordFormProps {
  onBackToLogin?: () => void
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const [requestPasswordReset, { loading, error }] = useMutation(REQUEST_PASSWORD_RESET, {
    onCompleted: () => {
      setIsSuccess(true)
    },
    onError: (error) => {
      logger.error('Password reset request failed:', error)
    }
  })

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setSubmittedEmail(data.email)
      await requestPasswordReset({
        variables: { email: data.email }
      })
    } catch (err) {
      // Error is handled by Apollo mutation
    }
  }

  const handleResendEmail = async () => {
    if (submittedEmail) {
      try {
        await requestPasswordReset({
          variables: { email: submittedEmail }
        })
      } catch (err) {
        logger.error('Resend failed:', err)
      }
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-success-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-success-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Check your email
          </CardTitle>
          <CardDescription>
            We've sent password reset instructions to your email address
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              We've sent a password reset link to <strong>{submittedEmail}</strong>.
              Click the link in the email to reset your password.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Didn't receive the email? Check your spam folder or
            </p>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleResendEmail}
              disabled={loading}
            >
              Resend email
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={onBackToLogin}
              className="text-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              If you continue to have problems, please{' '}
              <Link href="/support" className="underline hover:text-foreground">
                contact support
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Forgot your password?
        </CardTitle>
        <CardDescription className="text-center">
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.graphQLErrors?.[0]?.message || 'Failed to send reset email. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Enter your email"
                      leftIcon={<Mail />}
                      autoComplete="email"
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Sending reset email...' : 'Send reset email'}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={onBackToLogin}
            className="text-sm"
            disabled={loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sign in
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}


// Reset Password Form Component (for when user clicks the reset link)
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/\d/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

interface ResetPasswordFormProps {
  token: string
  onSuccess?: () => void
}

export function ResetPasswordForm({ token, onSuccess }: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const [resetPassword, { loading, error }] = useMutation(RESET_PASSWORD, {
    onCompleted: () => {
      setIsSuccess(true)
      onSuccess?.()
    },
    onError: (error) => {
      logger.error('Password reset failed:', error)
    }
  })

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await resetPassword({
        variables: {
          input: {
            token,
            password: data.password
          }
        }
      })
    } catch (err) {
      // Error is handled by Apollo mutation
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-success-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-success-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Password reset successful
          </CardTitle>
          <CardDescription>
            Your password has been successfully reset. You can now sign in with your new password.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Button asChild className="w-full">
            <Link href="/auth/login">
              Continue to sign in
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Reset your password
        </CardTitle>
        <CardDescription className="text-center">
          Enter your new password below
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.graphQLErrors?.[0]?.message || 'Failed to reset password. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Enter your new password"
                      leftIcon={<Lock />}
                      showPassword={showPassword}
                      onPasswordToggle={() => setShowPassword(!showPassword)}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Confirm your new password"
                      leftIcon={<Lock />}
                      showPassword={showConfirmPassword}
                      onPasswordToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Resetting password...' : 'Reset password'}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Remember your password?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
