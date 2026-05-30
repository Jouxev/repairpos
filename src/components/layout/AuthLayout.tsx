import { Outlet, useLocation } from 'react-router-dom'

export default function AuthLayout() {
  const location = useLocation()
  const isOnboardingPage = location.pathname === '/onboarding'

  return (
    <div
      className={`flex min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/20 ${
        isOnboardingPage ? 'items-stretch justify-stretch p-3 md:p-4 xl:p-6' : 'items-center justify-center p-4'
      }`}
    >
      <div className={`w-full ${isOnboardingPage ? 'mx-auto max-w-[1800px]' : 'max-w-md'}`}>
        <Outlet />
      </div>
    </div>
  )
}
