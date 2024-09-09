import { Table } from "./ui/table"

const mockScheduleData = [
  { time: '09:00 AM - 10:30 AM', task: 'Team Meeting' },
  { time: '11:00 AM - 12:30 PM', task: 'Project Work' },
  { time: '02:00 PM - 03:30 PM', task: 'Client Call' },
  { time: '04:00 PM - 05:00 PM', task: 'Documentation' },
]

export default function ScheduleViewer() {
  return (
    <Table
      headers={['Time', 'Task']}
      rows={mockScheduleData.map(item => [item.time, item.task])}
    />
  )
}