import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Copy, Users, Github } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export default function Landing() {
  const [roomLink, setRoomLink] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const navigate = useNavigate()

  const generateRoom = async () => {
    setIsGenerating(true)
    
    // Generate a random room ID
    const roomId = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15)
    
    const roomUrl = `${window.location.origin}/room/${roomId}`
    
    setTimeout(() => {
      setIsGenerating(false)
      setRoomLink(roomUrl)
      toast.success('Room created')
    }, 1000)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink)
      toast.success('Link copied')
    } catch (err) {
      console.error('Failed to copy:', err)
      toast.error('Copy failed')
    }
  }

  const joinRoom = () => {
    const roomId = roomLink.split('/room/')[1]
    if (roomId) {
      navigate(`/room/${roomId}`)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Logo and GitHub */}
      <header className="flex justify-between items-center p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
            <span className="text-background font-bold text-sm">W</span>
          </div>
          <span className="text-xl font-semibold">Wiggle</span>
        </div>
        
        <a
          href="https://github.com/Yooi/WeAgent"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Github className="w-5 h-5" />
          <span className="hidden sm:inline">GitHub</span>
        </a>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Title and Description */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Voice Chat
            </h1>
            <p className="text-muted-foreground">
              P2P encrypted voice calls
            </p>
          </div>

          {/* Main Content Card */}
          <Card className="p-6 space-y-4">
            {!roomLink ? (
              <Button 
                onClick={generateRoom}
                disabled={isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5 mr-2" />
                    Create Room
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Room Link</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={roomLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono"
                    />
                    <Button
                      onClick={copyLink}
                      variant="outline"
                      size="sm"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={joinRoom}
                    className="flex-1"
                  >
                    Join Room
                  </Button>
                  <Button
                    onClick={() => setRoomLink('')}
                    variant="outline"
                    className="flex-1"
                  >
                    New Room
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
