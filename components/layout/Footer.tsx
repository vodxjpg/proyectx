// components/Footer.tsx
export default function Footer() {
    return (
      <footer className="w-full bg-white border-t py-4">
        <div className="container mx-auto px-6 flex justify-between items-center text-sm text-gray-600">
          <p>&copy; 2025 Trapigram</p>
          <div className="space-x-4">
            <a href="/blog" className="hover:text-gray-800">Blog</a>
            <a href="/terms-conditions" className="hover:text-gray-800">Privacy policy</a>
            <a href="/cookies-policy" className="hover:text-gray-800">Cookies policy</a>
            <a href="/terms-conditions" className="hover:text-gray-800">Terms & conditions</a>
          </div>
        </div>
      </footer>
    )
  }