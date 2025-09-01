import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, MicOff, Phone, PhoneOff, Users, Copy, Check } from 'lucide-react'
import { useWiggleStore } from '@/store/wiggleStore'
import { signalingManager } from '@/lib/signaling/manager'
import { parseCallToken, createCallToken } from '@/lib/p2p/node'
import { toast } from 'sonner'

export function CallPage() {
  const { callId } = useParams<{ callId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const {
    p2pNode,
    nickname,
    isInCall,
    isMuted,
    participants,
    currentCall,
    isInitializing,
    error,
    toggleMute,
    setCurrentCall,
  } = useWiggleStore()

  const [callToken, setCallToken] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)

  useEffect(() => {
    if (!callId) {
      navigate('/')
      return
    }

    // Generate or get call token
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      const tokenData = parseCallToken(tokenParam)
      if (!tokenData || tokenData.callId !== callId) {
        toast.error('Invalid call token')
        navigate('/')
        return
      }
      setCallToken(tokenParam)
    } else {
      // Create new token for this call
      const newToken = createCallToken(callId, nickname)
      setCallToken(newToken)
    }

    // Set current call
    setCurrentCall({
      id: callId,
      participants: [],
      createdAt: new Date(),
      isActive: true,
    })
  }, [callId, searchParams, nickname, navigate, setCurrentCall])

  const joinCall = async () => {
    if (!p2pNode || !callId) {
      toast.error('Not ready to join call')
      return
    }

    setIsJoining(true)
    try {
      await signalingManager.joinCall(callId)
      toast.success('Joined call successfully')
    } catch (error) {
      console.error('Failed to join call:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to join call')
    } finally {
      setIsJoining(false)
    }
  }

  const leaveCall = async () => {
    try {
      await signalingManager.leaveCall()
      navigate('/')
    } catch (error) {
      console.error('Failed to leave call:', error)
      navigate('/')
    }
  }

  const copyCallToken = async () => {
    try {
      await navigator.clipboard.writeText(callToken)
      setTokenCopied(true)
      toast.success('Call token copied!')
      setTimeout(() => setTokenCopied(false), 2000)
    } catch {
      toast.error('Failed to copy token')
    }
  }

  const participantsList = Array.from(participants.values())

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Call: {callId}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Share this token to invite others:
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                    {callToken}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyCallToken}
                    className="shrink-0"
                  >
                    {tokenCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Status */}
        {!isInCall ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-2xl font-semibold">Ready to join call</div>
                <p className="text-muted-foreground">
                  Click the button below to join the voice chat
                </p>
                <Button
                  onClick={joinCall}
                  disabled={isInitializing || !p2pNode || isJoining}
                  size="lg"
                  className="px-8"
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
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Call Controls */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    onClick={toggleMute}
                    variant={isMuted ? "destructive" : "outline"}
                    size="lg"
                    className="px-8"
                  >
                    {isMuted ? (
                      <>
                        <MicOff className="h-4 w-4 mr-2" />
                        Unmute
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Mute
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={leaveCall}
                    variant="destructive"
                    size="lg"
                    className="px-8"
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    Leave Call
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Participants ({participantsList.length + 1})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Current user */}
                  <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2 flex-1">
                      <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                        {nickname.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{nickname} (You)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isMuted ? (
                        <MicOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Mic className="h-4 w-4 text-green-500" />
                      )}
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                    </div>
                  </div>

                  {/* Other participants */}
                  {participantsList.map((participant) => (
                    <div
                      key={participant.peerId}
                      className="flex items-center space-x-3 p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <div className="h-8 w-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground text-sm font-medium">
                          {participant.nickname.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{participant.nickname}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {participant.isMuted ? (
                          <MicOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Mic className="h-4 w-4 text-green-500" />
                        )}
                        <div
                          className={`h-2 w-2 rounded-full ${
                            participant.isConnected ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                      </div>
                    </div>
                  ))}

                  {participantsList.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Waiting for others to join...</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
