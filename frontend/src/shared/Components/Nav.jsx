import React from 'react'
import { Link } from 'react-router'


const Nav = () => {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur-md sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-[0.25em] text-slate-950">
              SNITCH
            </span>
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
          </Link>

         
        </div>
      </header>
  )
}

export default Nav