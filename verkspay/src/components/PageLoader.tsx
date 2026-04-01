'use client'

export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050507]/80 backdrop-blur-sm animate-fade-in">
      {/* Pulsing logo */}
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-teal-400 flex items-center justify-center text-white text-xl animate-pulse mb-6">
        ◆
      </div>
      {/* Loading bar */}
      <div className="w-48 h-0.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-500 to-teal-400 rounded-full animate-loading-bar" />
      </div>
    </div>
  )
}
