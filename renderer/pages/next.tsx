import Image from 'next/image'
import Link from 'next/link'
import { Button } from "./../components/ui/button"
import { Clock, Calendar, UserCheck, FileText } from 'lucide-react'

const features = [
  {
    name: 'Clock In/Out',
    Icon: Clock,
    description: 'Easily record your daily attendance with our simple clock in/out system.',
  },
  {
    name: 'View Schedule',
    Icon: Calendar,
    description: 'Check your work schedule and plan your week efficiently.',
  },
  {
    name: 'Attendance History',
    Icon: UserCheck,
    description: 'Review your past attendance records and track your performance.',
  },
  {
    name: 'Request Time Off',
    Icon: FileText,
    description: 'Submit and manage your time off requests seamlessly.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className='py-20 mx-auto text-center flex flex-col items-center max-w-3xl'>
          <Image
            src="/images/logo.png"
            alt="PAR Solution Logo"
            width={200}
            height={67}
            className="mb-8 dark:invert"
          />
          <h1 className='text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl'>
            Welcome to {' '}
            <span className='text-blue-600 dark:text-blue-400'>
              PAR Solution
            </span>
            {' '}Attendance Tracker
          </h1>
          <p className='mt-6 text-lg max-w-prose text-muted-foreground dark:text-gray-300'>
            Manage your attendance, view schedules, and access important work information all in one place. Designed exclusively for PAR Solution employees.
          </p>
          <div className='flex flex-col sm:flex-row gap-4 mt-6'>
            <Link href='/dashboard'>
              <Button size="lg" className="w-full sm:w-auto">Employee Dashboard</Button>
            </Link>
            <Button variant='outline' size="lg" className="w-full sm:w-auto">
              View Attendance Policy
            </Button>
          </div>
        </div>
      </div>

      <section className='border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20'>
          <div className='grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-0'>
            {features.map((feature) => (
              <div
                key={feature.name}
                className='text-center md:flex md:items-start md:text-left lg:block lg:text-center'>
                <div className='md:flex-shrink-0 flex justify-center'>
                  <div className='h-16 w-16 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'>
                    <feature.Icon className='w-1/3 h-1/3' />
                  </div>
                </div>

                <div className='mt-6 md:ml-4 md:mt-0 lg:ml-0 lg:mt-6'>
                  <h3 className='text-base font-medium text-gray-900 dark:text-white'>
                    {feature.name}
                  </h3>
                  <p className='mt-3 text-sm text-muted-foreground dark:text-gray-400'>
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}