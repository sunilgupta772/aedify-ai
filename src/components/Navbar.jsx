import React from 'react'
import { FaUser } from 'react-icons/fa'
import { HiMoon, HiSun } from 'react-icons/hi'
import { RiSettings3Fill } from 'react-icons/ri'

const Navbar = ({ theme, onToggleTheme }) => {
  return (
    <>
      <div className="nav flex items-center justify-between px-[100px] h-[90px] border-b-[1px]">
        <div className="logo">
         <h3 className='text-[25px] font-[700] sp-text'>Aedify AI</h3>
        </div>
        <div className="icons flex items-center gap-[15px]">
          <button className="icon" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <HiSun /> : <HiMoon />}
          </button>
          <div className="icon"><FaUser /></div>
          <div className="icon"><RiSettings3Fill /></div>
        </div>
      </div>
    </>
  )
}

export default Navbar