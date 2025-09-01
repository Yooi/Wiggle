import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Users, Phone } from 'lucide-react'
import { useWiggleStore } from '@/store/wiggleStore'
import { generateCallId, createCallToken } from '@/lib/p2p/node'
import { signalingManager } from '@/lib/signaling/manager'
import { toast } from 'sonner'

export function HomePage() {
  const navigate = useNavigate()
  const { p2pNode, isInitializing, nickname, setNickname, error } = useWiggleStore()
  const [callToken, setCallToken] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const handleNicknameChange = (value: string) => {
    setNickname(value)
  }

  const createCall = async () => {
    if (!nickname.trim()) {
      toast.error('Please enter a nickname')
      return
    }

    if (!p2pNode) {
      toast.error('P2P network not ready')
      return
    }

    setIsCreating(true)
    try {
      const callId = generateCallId()
      const token = createCallToken(callId, nickname)
      
      // Initialize signaling
      signalingManager.initialize(p2pNode, nickname)
      
      // Navigate to call page
      navigate(`/call/${callId}?token=${token}`)
    } catch (error) {
      console.error('Failed to create call:', error)
      toast.error('Failed to create call')
    } finally {
      setIsCreating(false)
    }
  }

  const joinCall = async () => {
    if (!nickname.trim()) {
      toast.error('Please enter a nickname')
      return
    }

    if (!callToken.trim()) {
      toast.error('Please enter a call token')
      return
    }

    if (!p2pNode) {
      toast.error('P2P network not ready')
      return
    }

    setIsJoining(true)
    try {
      // Parse token to get call ID
      const tokenData = JSON.parse(atob(callToken))
      const callId = tokenData.callId

      if (!callId) {
        toast.error('Invalid call token')
        return
      }

      // Initialize signaling
      signalingManager.initialize(p2pNode, nickname)
      
      // Navigate to call page
      navigate(`/call/${callId}?token=${callToken}`)
    } catch (error) {
      console.error('Failed to join call:', error)
      toast.error('Invalid call token')
    } finally {
      setIsJoining(false)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Connection Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Mic className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Wiggle</h1>
          <p className="text-muted-foreground">
            Decentralized voice chat for everyone
          </p>
        </div>

        {/* Connection Status */}
        {isInitializing && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                <span className="text-sm">Connecting to P2P network...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nickname Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Nickname</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => handleNicknameChange(e.target.value)}
              disabled={isInitializing}
              maxLength={20}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-4">
          {/* Create Call */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Start New Call</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={createCall}
                disabled={isInitializing || !p2pNode || isCreating}
                className="w-full"
                size="lg"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Create Call
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Join Call */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Join Existing Call</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Paste call token here"
                value={callToken}
                onChange={(e) => setCallToken(e.target.value)}
                disabled={isInitializing}
              />
              <Button
                onClick={joinCall}
                disabled={isInitializing || !p2pNode || isJoining}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {isJoining ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Join Call
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Network Status */}
        {p2pNode && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-800">
                  Connected to P2P network
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
