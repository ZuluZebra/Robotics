'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import {
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

export function Sidebar() {
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
    <div className="hidden md:flex md:w-64 bg-gradient-to-b from-blue-900 to-indigo-900 text-white flex flex-col h-screen shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b border-blue-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="font-bold text-blue-900">SA</span>
          </div>
          <div>
            <h2 className="font-bold text-lg">Attendance</h2>
            <p className="text-xs text-blue-200">School System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        <div>
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-3">
            Main
          </p>
          <div className="space-y-2">
            {mainLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link key={link.href} href={link.href}>
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

        {isAdmin && (
          <div>
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-3 mt-6">
              Administration
            </p>
            <div className="space-y-2">
              {adminLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link key={link.href} href={link.href}>
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
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-blue-800">
        <Button
          onClick={logout}
          variant="ghost"
          className="w-full justify-start text-left text-red-200 hover:bg-red-900/20"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  )
}
