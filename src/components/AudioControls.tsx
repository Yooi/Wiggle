/**
 * Audio Controls Component
 * 提供音频控制界面
 */

import { useState, useEffect, useRef } from 'react'

// 临时类型定义，避免导入错误
interface AudioDeviceInfo {
  deviceId: string
  label: string
  kind: 'audioinput' | 'audiooutput'
}

interface AudioManager {
  getVolumeLevel(): number
  toggleMute(): boolean
  getAudioDevices(): Promise<AudioDeviceInfo[]>
  getUserAudioStream(deviceId?: string): Promise<MediaStream>
}

interface AudioControlsProps {
  audioManager: AudioManager | null
  isInCall: boolean
  onMuteToggle?: (isMuted: boolean) => void
  onVolumeChange?: (level: number) => void
}

export function AudioControls({ 
  audioManager, 
  isInCall, 
  onMuteToggle, 
  onVolumeChange 
}: AudioControlsProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const [devices, setDevices] = useState<AudioDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState('')
  const volumeIntervalRef = useRef<number | null>(null)

  // 初始化音频设备列表
  useEffect(() => {
    if (audioManager) {
      loadAudioDevices()
    }
  }, [audioManager])

  // 启动音量监测
  useEffect(() => {
    if (audioManager && isInCall) {
      startVolumeMonitoring()
    } else {
      stopVolumeMonitoring()
    }

    return () => stopVolumeMonitoring()
  }, [audioManager, isInCall])

  const loadAudioDevices = async () => {
    if (!audioManager) return

    try {
      const audioDevices = await audioManager.getAudioDevices()
      setDevices(audioDevices)
      
      const defaultDevice = audioDevices.find(d => d.kind === 'audioinput')
      if (defaultDevice) {
        setSelectedDevice(defaultDevice.deviceId)
      }
    } catch (error) {
      console.error('Failed to load audio devices:', error)
    }
  }

  const startVolumeMonitoring = () => {
    if (volumeIntervalRef.current) return

    volumeIntervalRef.current = window.setInterval(() => {
      if (audioManager) {
        const level = audioManager.getVolumeLevel()
        setVolumeLevel(level)
        onVolumeChange?.(level)
      }
    }, 100) // 每100ms更新一次音量
  }

  const stopVolumeMonitoring = () => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current)
      volumeIntervalRef.current = null
      setVolumeLevel(0)
    }
  }

  const handleMuteToggle = () => {
    if (!audioManager) return

    const newMutedState = audioManager.toggleMute()
    setIsMuted(newMutedState)
    onMuteToggle?.(newMutedState)
  }

  const handleDeviceChange = async (deviceId: string) => {
    if (!audioManager) return

    try {
      setSelectedDevice(deviceId)
      // 重新获取音频流使用新设备
      await audioManager.getUserAudioStream(deviceId)
      console.log('Audio device changed to:', deviceId)
    } catch (error) {
      console.error('Failed to change audio device:', error)
    }
  }

  const getVolumeBarColor = (level: number) => {
    if (level < 30) return '#28a745' // 绿色
    if (level < 70) return '#ffc107' // 黄色
    return '#dc3545' // 红色
  }

  return (
    <div style={{ 
      padding: '15px', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
      marginBottom: '15px'
    }}>
      <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>
        🎧 音频控制
      </h4>

      {/* 静音控制 */}
      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={handleMuteToggle}
          disabled={!audioManager}
          style={{
            padding: '10px 20px',
            backgroundColor: isMuted ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: audioManager ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isMuted ? '🔇 取消静音' : '🎤 静音'}
        </button>
      </div>

      {/* 音量指示器 */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '5px', 
          fontSize: '12px',
          color: '#6c757d'
        }}>
          音量级别: {volumeLevel}%
        </label>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${volumeLevel}%`,
            height: '100%',
            backgroundColor: getVolumeBarColor(volumeLevel),
            transition: 'width 0.1s ease'
          }} />
        </div>
      </div>

      {/* 音频设备选择 */}
      <div>
        <label style={{ 
          display: 'block', 
          marginBottom: '5px', 
          fontSize: '12px',
          color: '#6c757d'
        }}>
          音频输入设备:
        </label>
        <select
          value={selectedDevice}
          onChange={(e) => handleDeviceChange(e.target.value)}
          disabled={!audioManager}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: 'white'
          }}
        >
          {devices.filter(d => d.kind === 'audioinput').map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>

      {/* 状态指示 */}
      <div style={{ 
        marginTop: '10px', 
        fontSize: '12px', 
        color: '#6c757d',
        textAlign: 'center'
      }}>
        {audioManager ? (
          isInCall ? (
            <span style={{ color: '#28a745' }}>✅ 音频系统活跃</span>
          ) : (
            <span style={{ color: '#ffc107' }}>⏸️ 音频系统就绪</span>
          )
        ) : (
          <span style={{ color: '#dc3545' }}>❌ 音频系统未初始化</span>
        )}
      </div>
    </div>
  )
}
