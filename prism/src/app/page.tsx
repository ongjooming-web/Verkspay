import Link from 'next/link'
import { Button } from '@/components/Button'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex flex-col justify-center items-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">Prism</h1>
        <p className="text-xl text-blue-100 mb-8">Simple invoicing & proposal management for freelancers</p>
        <div className="flex gap-4 justify-center">
          <Link href="/login">
            <Button variant="secondary" size="lg">
              Login
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="lg">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
