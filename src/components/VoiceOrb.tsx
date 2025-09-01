import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Radio } from 'lucide-react'

interface VoiceOrbProps {
  isActive: boolean
  isMuted: boolean
  audioLevel?: number // 0-100, external audio level input
  size?: number // orb size in pixels, default 200
}

export const VoiceOrb = ({ 
  isActive, 
  isMuted, 
  audioLevel = 0, 
  size = 200 
}: VoiceOrbProps) => {
  const [internalAudioLevel, setInternalAudioLevel] = useState(0)
  const [ripples, setRipples] = useState<Array<{ id: number; intensity: number; delay: number }>>([])
  const [responsiveSize, setResponsiveSize] = useState(size)
  const animationRef = useRef<number | null>(null)
  const rippleIdRef = useRef(0)

  // Handle responsive sizing
  useEffect(() => {
    const updateSize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 640) {
          setResponsiveSize(Math.max(size * 0.7, 140)) // Mobile - ensure minimum size
        } else if (window.innerWidth < 1024) {
          setResponsiveSize(Math.max(size * 0.85, 180)) // Tablet
        } else {
          setResponsiveSize(size) // Desktop
        }
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [size])

  // Smooth audio level interpolation
  useEffect(() => {
    if (!isActive || isMuted) {
      setInternalAudioLevel(0)
      setRipples([])
      return
    }

    // Use external audio level, only simulate if we have real activity
    const targetLevel = audioLevel > 0 ? audioLevel : 0

    if (targetLevel === 0) {
      // If no audio activity, smoothly reduce to zero and stop animation
      setInternalAudioLevel(prev => {
        const newLevel = prev * 0.95 // Gradually fade to zero
        return newLevel < 1 ? 0 : newLevel
      })
      setRipples([])
      return
    }

    const animate = () => {
      setInternalAudioLevel(prev => {
        const diff = targetLevel - prev
        return prev + diff * 0.1 // Smooth interpolation
      })

      // Generate surface ripples based on audio intensity - simplified
      if (targetLevel > 40) { // Higher threshold for fewer ripples
        setRipples(prev => {
          const newRipples = [...prev]
          
          // Very occasional ripples only
          if (Math.random() < 0.05) { // Much lower frequency
            newRipples.push({
              id: rippleIdRef.current++,
              intensity: targetLevel / 100,
              delay: 0
            })
          }

          // Update existing ripples
          return newRipples
            .map(ripple => ({ ...ripple, delay: ripple.delay + 1 }))
            .filter(ripple => ripple.delay < 50)
            .slice(-1) // Maximum 1 ripple at a time
        })
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, isMuted, audioLevel])

  // Simplified - always return circle, no edge distortion
  const generateWaterDropDistortion = () => {
    return 'circle(50%)'
  }

  const getWaterDropColors = () => {
    if (!isActive) {
      return {
        primary: '#64748b',
        secondary: '#94a3b8',
        shadow: 'rgba(100, 116, 139, 0.3)',
        surface: 'rgba(255, 255, 255, 0.1)'
      }
    }

    if (isMuted) {
      return {
        primary: '#f87171',
        secondary: '#fca5a5',
        shadow: 'rgba(248, 113, 113, 0.4)',
        surface: 'rgba(255, 255, 255, 0.15)'
      }
    }

    const intensity = internalAudioLevel / 100
    // Water-like color transitions based on activity
    return {
      primary: `hsl(${200 + intensity * 15}, ${75 + intensity * 15}%, ${55 + intensity * 15}%)`,
      secondary: `hsl(${220 + intensity * 10}, ${85 + intensity * 10}%, ${75 + intensity * 10}%)`,
      shadow: `rgba(96, 165, 250, ${0.4 + intensity * 0.3})`,
      surface: `rgba(255, 255, 255, ${0.2 + intensity * 0.3})`
    }
  }

  const colors = getWaterDropColors()

  // Calculate icon size with proper min/max bounds
  const getIconSize = () => {
    const calculatedSize = responsiveSize * 0.15
    // Ensure icon size is between 20px and 40px for optimal visibility
    return Math.max(20, Math.min(calculatedSize, 40))
  }

  const iconSize = getIconSize()

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: responsiveSize * 2, height: responsiveSize * 2 }}
    >
      {/* Simplified water surface ripples */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="absolute rounded-full border border-blue-400/40"
          style={{
            width: responsiveSize + ripple.delay * 4,
            height: responsiveSize + ripple.delay * 4,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: Math.max(0, (1 - ripple.delay / 50) * 0.6),
            transition: 'none'
          }}
        />
      ))}

      {/* Main water drop container - always circular */}
      <div
        className="relative rounded-full transition-all duration-300 ease-out"
        style={{
          width: responsiveSize,
          height: responsiveSize,
          // Simplified gradient
          background: `radial-gradient(circle at 30% 30%, ${colors.secondary}, ${colors.primary})`,
          // Simplified shadow
          boxShadow: `
            0 ${responsiveSize * 0.1}px ${responsiveSize * 0.3}px ${colors.shadow},
            inset 0 ${responsiveSize * 0.02}px ${responsiveSize * 0.05}px rgba(255, 255, 255, 0.3)
          `,
          // Subtle scale effect only
          transform: `scale(${1 + (isActive && !isMuted ? internalAudioLevel / 3000 : 0)})`,
        }}
      >
        {/* Simple highlight */}
        {isActive && !isMuted && (
          <div
            className="absolute top-[15%] left-[20%] w-[25%] h-[25%] rounded-full"
            style={{
              background: `radial-gradient(circle, 
                rgba(255, 255, 255, 0.4) 0%, 
                transparent 70%)`,
              filter: 'blur(3px)'
            }}
          />
        )}

        {/* Icon container - simplified */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex items-center justify-center rounded-full backdrop-blur-sm"
            style={{
              width: responsiveSize * 0.4,
              height: responsiveSize * 0.4,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            {isMuted ? (
              <MicOff 
                className="text-white/90" 
                size={iconSize}
                style={{ minWidth: '24px', minHeight: '24px' }}
              />
            ) : isActive ? (
              <Radio 
                className="text-white/90" 
                size={iconSize}
                style={{ 
                  minWidth: '24px', minHeight: '24px',
                  animation: internalAudioLevel > 20 ? 'pulse 2s infinite' : 'none'
                }}
              />
            ) : (
              <Mic 
                className="text-white/90" 
                size={iconSize}
                style={{ minWidth: '24px', minHeight: '24px' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Simplified animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0%, 100% { opacity: 0.9; }
            50% { opacity: 1; }
          }
        `
      }} />
    </div>
  )
}
