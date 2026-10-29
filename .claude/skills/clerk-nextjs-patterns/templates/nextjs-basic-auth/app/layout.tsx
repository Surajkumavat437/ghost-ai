import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { Suspense } from 'react'

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <header>
            <Suspense>
              <Show when="signed-out">
                <SignInButton />
                <SignUpButton />
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </Suspense>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
