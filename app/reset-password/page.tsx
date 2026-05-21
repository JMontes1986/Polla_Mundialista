'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

      if (error) throw error
      setMessage('Te enviamos un correo con las instrucciones para recuperar tu cuenta.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el correo de recuperacion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md card p-6 sm:p-8">
        <Link href="/" className="text-sm font-semibold text-amber-400 hover:underline">
          Volver al inicio
        </Link>

        <h1 className="mt-6 text-3xl font-black text-white">Recuperar contrasena</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          Escribe el correo de tu cuenta y te enviaremos el enlace de recuperacion.
        </p>

        <form onSubmit={handleReset} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors text-sm"
            />
          </div>

          {message && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? 'Enviando...' : 'Enviar correo'}
          </button>
        </form>
      </section>
    </main>
  )
}
