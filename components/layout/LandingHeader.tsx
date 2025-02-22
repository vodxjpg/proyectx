// components/LandingHeader.tsx
import Link from 'next/link'

export default function LandingHeader() {
  return (
    <header className="w-full bg-white shadow-sm">
      <nav className="container mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center">
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
          <Link href="/" className="text-xl font-bold">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
          </Link>
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
            <Link href="/discord" className="text-gray-600 hover:text-gray-800">
              About us
            </Link>
             <Link href="/discord" className="text-gray-600 hover:text-gray-800">
              Pricing
            </Link>
            <Link href="/models" className="text-gray-600 hover:text-gray-800">
              Contact us
            </Link>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mt-4 md:mt-0">
          <button className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition w-full md:w-auto">
            Sign in
          </button>
          <button className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition w-full md:w-auto">
            Create an account
          </button>
        </div>
      </nav>
    </header>
  )
}