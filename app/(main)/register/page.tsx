import { RegisterForm } from '@/components/auth/RegisterForm'
import { Container } from '@/components/ui/Container'

export const metadata = {
  title: 'Register',
}

export default function RegisterPage() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-adventure text-4xl text-gold-500 uppercase tracking-wide">
            Create Account
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            One account works everywhere — the website and the game client.
          </p>
        </div>

        <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-8">
          <RegisterForm />
        </div>
      </div>
    </Container>
  )
}
