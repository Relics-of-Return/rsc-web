import { LoginForm } from '@/components/auth/LoginForm'
import { Container } from '@/components/ui/Container'

export const metadata = {
  title: 'Login',
}

export default function LoginPage() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-adventure text-4xl text-gold-500 uppercase tracking-wide">
            Log In
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Welcome back, adventurer. Enter your credentials to continue.
          </p>
        </div>

        <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-8">
          <LoginForm />
        </div>
      </div>
    </Container>
  )
}
