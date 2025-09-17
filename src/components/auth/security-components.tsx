"use client"

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@apollo/client'
import QRCode from 'qrcode'
import {
  Shield,
  Smartphone,
  Key,
  Copy,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  EyeOff,
  Trash2,
  MapPin,
  Monitor,
  Clock,
  AlertTriangle,
  Bell,
  X,
  RefreshCw
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  SETUP_MFA,
  VERIFY_MFA_SETUP,
  DISABLE_MFA,
  REGENERATE_BACKUP_CODES,
  GET_ACTIVE_SESSIONS,
  REVOKE_SESSION,
  type MFASetup,
  type SessionInfo
} from '@/lib/graphql/auth-mutations'
import { useAuth } from '@/lib/auth/auth-context'

// 2FA Setup Schema
const mfaVerificationSchema = z.object({
  code: z
    .string()
    .min(6, 'Code must be 6 digits')
    .max(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be 6 digits'),
})

type MFAVerificationData = z.infer<typeof mfaVerificationSchema>

// 2FA Setup Component
export function TwoFactorSetup() {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState<'setup' | 'verify' | 'backup-codes'>('setup')
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showSecret, setShowSecret] = useState(false)

  const [setupMFA, { loading: setupLoading, error: setupError }] = useMutation(SETUP_MFA, {
    onCompleted: async (data) => {
      if (data.setupMFA) {
        setSecret(data.setupMFA.secret)
        setBackupCodes(data.setupMFA.backupCodes)

        // Generate QR code
        try {
          const qrCode = await QRCode.toDataURL(data.setupMFA.qrCode)
          setQrCodeUrl(qrCode)
          setStep('verify')
        } catch (error) {
          console.error('Failed to generate QR code:', error)
        }
      }
    },
  })

  const [verifyMFASetup, { loading: verifyLoading, error: verifyError }] = useMutation(VERIFY_MFA_SETUP, {
    onCompleted: (data) => {
      if (data.verifyMFASetup) {
        updateUser(data.verifyMFASetup.user)
        setBackupCodes(data.verifyMFASetup.backupCodes)
        setStep('backup-codes')
        toast({
          title: "2FA Enabled",
          description: "Two-factor authentication has been successfully enabled for your account.",
        })
      }
    },
  })

  const [disableMFA, { loading: disableLoading, error: disableError }] = useMutation(DISABLE_MFA)

  const form = useForm<MFAVerificationData>({
    resolver: zodResolver(mfaVerificationSchema),
    defaultValues: {
      code: '',
    },
  })

  const handleSetupMFA = () => {
    setupMFA()
  }

  const handleVerifyCode = (data: MFAVerificationData) => {
    verifyMFASetup({
      variables: { token: data.code }
    })
  }

  const handleDisableMFA = () => {
    // In a real app, you'd prompt for password confirmation
    disableMFA({
      variables: { password: 'user_password' }
    })
      .then(() => {
        toast({
          title: "2FA Disabled",
          description: "Two-factor authentication has been disabled for your account.",
        })
        setStep('setup')
      })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    })
  }

  const downloadBackupCodes = () => {
    const content = backupCodes.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (user?.mfaEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-success-600" />
            <span>Two-Factor Authentication</span>
          </CardTitle>
          <CardDescription>
            Your account is protected with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Two-factor authentication is active. Your account is more secure.
            </AlertDescription>
          </Alert>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => setStep('backup-codes')}>
              <Key className="h-4 w-4 mr-2" />
              View Backup Codes
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableMFA}
              loading={disableLoading}
            >
              Disable 2FA
            </Button>
          </div>

          {disableError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {disableError.graphQLErrors?.[0]?.message || 'Failed to disable 2FA'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Two-Factor Authentication</span>
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'setup' && (
          <div className="space-y-4">
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                You'll need an authenticator app like Google Authenticator, Authy, or 1Password to set up 2FA.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">How it works:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>We'll generate a QR code for you to scan</li>
                <li>Your authenticator app will generate time-based codes</li>
                <li>You'll enter the code to verify the setup</li>
                <li>You'll receive backup codes for emergency access</li>
              </ol>
            </div>

            {setupError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {setupError.graphQLErrors?.[0]?.message || 'Failed to set up 2FA'}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleSetupMFA}
              loading={setupLoading}
              disabled={setupLoading}
            >
              <Shield className="h-4 w-4 mr-2" />
              Enable Two-Factor Authentication
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h3 className="font-medium">Scan QR Code</h3>
              {qrCodeUrl && (
                <div className="flex justify-center">
                  <img src={qrCodeUrl} alt="2FA QR Code" className="border rounded-lg" />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your authenticator app
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Or enter the secret manually:</h4>
              <div className="flex items-center space-x-2">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={secret || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(secret || '')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Verify Setup</h4>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to complete the setup
              </p>

              {verifyError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {verifyError.graphQLErrors?.[0]?.message || 'Invalid verification code'}
                  </AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleVerifyCode)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="000000"
                            maxLength={6}
                            className="text-center text-lg tracking-widest"
                            disabled={verifyLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    loading={verifyLoading}
                    disabled={verifyLoading}
                    className="w-full"
                  >
                    Verify and Enable 2FA
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        )}

        {step === 'backup-codes' && (
          <BackupCodesDisplay
            codes={backupCodes}
            onDownload={downloadBackupCodes}
            onRegenerate={() => {
              // Handle regenerate backup codes
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}

// Backup Codes Component
interface BackupCodesDisplayProps {
  codes: string[]
  onDownload: () => void
  onRegenerate: () => void
}

function BackupCodesDisplay({ codes, onDownload, onRegenerate }: BackupCodesDisplayProps) {
  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="font-medium">Backup Codes</h3>
        <p className="text-sm text-muted-foreground">
          Save these backup codes in a safe place. You can use them to access your account if you lose your phone.
        </p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Each backup code can only be used once. Keep them secure and treat them like passwords.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
        {codes.map((code, index) => (
          <div key={index} className="font-mono text-sm text-center p-2 bg-background rounded border">
            {code}
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        <Button variant="outline" onClick={onDownload} className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Download Codes
        </Button>
        <Button variant="outline" onClick={onRegenerate} className="flex-1">
          <RefreshCw className="h-4 w-4 mr-2" />
          Regenerate
        </Button>
      </div>
    </div>
  )
}

// Active Sessions Management
export function ActiveSessions() {
  const { toast } = useToast()
  const [sessions, setSessions] = useState<SessionInfo[]>([])

  const { data, loading, refetch } = useQuery(GET_ACTIVE_SESSIONS, {
    onCompleted: (data) => {
      setSessions(data.activeSessions || [])
    },
  })

  const [revokeSession] = useMutation(REVOKE_SESSION, {
    onCompleted: () => {
      toast({
        title: "Session Revoked",
        description: "The session has been successfully revoked.",
      })
      refetch()
    },
  })

  const handleRevokeSession = (sessionId: string) => {
    revokeSession({
      variables: { sessionId }
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getBrowserIcon = (browser: string) => {
    // Return appropriate icon based on browser
    return <Monitor className="h-4 w-4" />
  }

  const getLocationFromIP = (ip: string) => {
    // In a real app, you'd use a geolocation service
    return "Unknown Location"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Monitor className="h-5 w-5" />
          <span>Active Sessions</span>
        </CardTitle>
        <CardDescription>
          Manage devices and browsers where you're currently signed in
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active sessions found
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {getBrowserIcon(session.deviceInfo.browser)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">
                          {session.deviceInfo.browser} on {session.deviceInfo.platform}
                        </h4>
                        {session.isCurrentSession && (
                          <Badge variant="outline" className="text-success-600 border-success-600">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{getLocationFromIP(session.deviceInfo.ip)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Last active {formatDate(session.lastActivity)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        IP: {session.deviceInfo.ip}
                      </p>
                    </div>
                  </div>

                  {!session.isCurrentSession && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Revoke
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Security Notifications Component
interface SecurityNotification {
  id: string
  type: 'login' | 'password_change' | 'device_added' | 'suspicious_activity'
  title: string
  description: string
  timestamp: string
  read: boolean
  severity: 'low' | 'medium' | 'high'
}

export function SecurityNotifications() {
  const [notifications, setNotifications] = useState<SecurityNotification[]>([
    {
      id: '1',
      type: 'login',
      title: 'New sign-in from Chrome on Windows',
      description: 'Someone signed in to your account from a new device.',
      timestamp: new Date().toISOString(),
      read: false,
      severity: 'medium',
    },
    {
      id: '2',
      type: 'password_change',
      title: 'Password changed',
      description: 'Your account password was successfully changed.',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      severity: 'low',
    },
  ])

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    )
  }

  const getNotificationIcon = (type: string, severity: string) => {
    switch (type) {
      case 'login':
        return <Monitor className="h-4 w-4" />
      case 'password_change':
        return <Key className="h-4 w-4" />
      case 'device_added':
        return <Smartphone className="h-4 w-4" />
      case 'suspicious_activity':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-destructive'
      case 'medium':
        return 'text-warning-600'
      case 'low':
        return 'text-success-600'
      default:
        return 'text-muted-foreground'
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Security Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Stay informed about security events on your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No security notifications
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start space-x-3 p-4 border rounded-lg ${
                  !notification.read ? 'bg-muted/50' : ''
                }`}
              >
                <div className={`p-2 rounded-lg ${getSeverityColor(notification.severity)}`}>
                  {getNotificationIcon(notification.type, notification.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{notification.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {notification.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(notification.timestamp)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Security Overview Dashboard
export function SecurityDashboard() {
  const { user } = useAuth()

  const securityScore = calculateSecurityScore({
    hasPassword: true,
    hasMFA: user?.mfaEnabled || false,
    hasLinkedAccounts: user?.linkedAccounts?.length || 0,
    recentActivity: true, // Would be calculated based on actual activity
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold">{securityScore}/100</h3>
              <p className="text-muted-foreground">Security Score</p>
            </div>
            <div className={`text-right ${getScoreColor(securityScore)}`}>
              <p className="font-medium">{getScoreLabel(securityScore)}</p>
            </div>
          </div>

          <div className="w-full bg-muted rounded-full h-2 mb-4">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getScoreBarColor(securityScore)}`}
              style={{ width: `${securityScore}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SecurityCheckItem
              icon={<Key className="h-4 w-4" />}
              title="Strong Password"
              status="complete"
              description="Your password meets security requirements"
            />
            <SecurityCheckItem
              icon={<Shield className="h-4 w-4" />}
              title="Two-Factor Authentication"
              status={user?.mfaEnabled ? "complete" : "pending"}
              description={user?.mfaEnabled ? "2FA is enabled" : "Enable 2FA for better security"}
            />
            <SecurityCheckItem
              icon={<Monitor className="h-4 w-4" />}
              title="Recent Activity Review"
              status="complete"
              description="No suspicious activity detected"
            />
            <SecurityCheckItem
              icon={<Bell className="h-4 w-4" />}
              title="Security Notifications"
              status="complete"
              description="Notifications are enabled"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="2fa" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="2fa">Two-Factor Auth</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="2fa">
          <TwoFactorSetup />
        </TabsContent>

        <TabsContent value="sessions">
          <ActiveSessions />
        </TabsContent>

        <TabsContent value="notifications">
          <SecurityNotifications />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper Components
interface SecurityCheckItemProps {
  icon: React.ReactNode
  title: string
  status: 'complete' | 'pending' | 'warning'
  description: string
}

function SecurityCheckItem({ icon, title, status, description }: SecurityCheckItemProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-success-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="flex items-start space-x-3 p-3 border rounded-lg">
      <div className="p-2 rounded-lg bg-muted">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">{title}</h4>
          {getStatusIcon()}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

// Helper functions
function calculateSecurityScore(factors: {
  hasPassword: boolean
  hasMFA: boolean
  hasLinkedAccounts: number
  recentActivity: boolean
}): number {
  let score = 0

  if (factors.hasPassword) score += 30
  if (factors.hasMFA) score += 40
  if (factors.hasLinkedAccounts > 0) score += 15
  if (factors.recentActivity) score += 15

  return Math.min(score, 100)
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success-600'
  if (score >= 60) return 'text-warning-600'
  return 'text-destructive'
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-success-500'
  if (score >= 60) return 'bg-warning-500'
  return 'bg-destructive'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}