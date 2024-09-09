import { useState, useEffect } from 'react'
import { Button } from "./ui/button"
import { Clock } from 'lucide-react'

export default function ClockInOut() {
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleClockInOut = () => {
    setIsClockedIn(!isClockedIn)
  }

  return (
    <div className="flex flex-col items-center">
      <p className="text-2xl font-bold mb-4">{currentTime.toLocaleTimeString()}</p>
      <Button
        onClick={handleClockInOut}
        variant={isClockedIn ? "destructive" : "default"}
      >
        <Clock className="mr-2 h-4 w-4" />
        {isClockedIn ? 'Clock Out' : 'Clock In'}
      </Button>
    </div>
  )
}