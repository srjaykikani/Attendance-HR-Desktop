import React from 'react'
import { Table } from "./ui/table"

const mockAttendanceData = [
  { date: '2024-03-01', clockIn: '09:00 AM', clockOut: '05:00 PM' },
  { date: '2024-03-02', clockIn: '08:55 AM', clockOut: '05:05 PM' },
  { date: '2024-03-03', clockIn: '09:02 AM', clockOut: '04:58 PM' },
]

export default function AttendanceHistory() {
  const headers = ['Date', 'Clock In', 'Clock Out']
  const rows = mockAttendanceData.map(record => [
    record.date,
    record.clockIn,
    record.clockOut
  ])

  return (
    <Table headers={headers} rows={rows} />
  )
}