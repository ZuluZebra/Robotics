'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import {
  Menu,
  X,
  BarChart3,
  AlertCircle,
  Users,
  School,
  BookOpen,
  CreditCard,
  Settings,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { isAdmin, logout } = useAuth()

  const mainLinks = [
    {
      href: '/dashboard',
      label: 'Attendance',
      icon: BarChart3,
    },
    {
      href: '/alerts',
      label: 'Alerts',
      icon: AlertCircle,
    },
    {
      href: '/reports',
      label: 'Reports',
      icon: BarChart3,
    },
  ]

  const adminLinks = isAdmin ? [
    {
      href: '/admin/schools',
      label: 'Schools',
      icon: School,
    },
    {
      href: '/admin/classes',
      label: 'Classes',
      icon: BookOpen,
    },
    {
      href: '/admin/students',
      label: 'Students',
      icon: Users,
    },
    {
      href: '/admin/debtors',
      label: 'Debtors',
      icon: CreditCard,
    },
    {
      href: '/admin/users',
      label: 'Users',
      icon: Settings,
    },
  ] : []

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
        className="fixed top-16 left-4 z-50"
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="fixed inset-0 top-16 bg-gradient-to-b from-blue-900 to-indigo-900 text-white z-40 overflow-y-auto">
          <nav className="p-4 space-y-4">
            {/* Main Links */}
            <div>
              <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-3">
                Main
              </p>
              <div className="space-y-2">
                {mainLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)}>
                      <Button
                        variant={isActive(link.href) ? 'default' : 'ghost'}
                        className={cn(
                          'w-full justify-start text-left',
                          isActive(link.href)
                            ? 'bg-white text-blue-900 hover:bg-gray-100'
                            : 'text-blue-100 hover:bg-blue-800'
                        )}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {link.label}
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Admin Links */}
            {isAdmin && (
              <div>
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-3 mt-4">
                  Administration
                </p>
                <div className="space-y-2">
                  {adminLinks.map((link) => {
                    const Icon = link.icon
                    return (
                      <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)}>
                        <Button
                          variant={isActive(link.href) ? 'default' : 'ghost'}
                          className={cn(
                            'w-full justify-start text-left',
                            isActive(link.href)
                              ? 'bg-white text-blue-900 hover:bg-gray-100'
                              : 'text-blue-100 hover:bg-blue-800'
                          )}
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {link.label}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Logout */}
            <div className="pt-4 border-t border-blue-800">
              <Button
                onClick={() => {
                  logout()
                  setIsOpen(false)
                }}
                variant="ghost"
                className="w-full justify-start text-left text-red-200 hover:bg-red-900/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
