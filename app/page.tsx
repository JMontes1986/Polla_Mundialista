// app/page.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '../lib/supabase/client'
import { useRouter } from 'next/navigation'

type HomePageProps = {
  searchParams?: {
    error?: string
  }
}

const authErrorMessages: Record<string, string> = {
  session: 'Tu sesion no llego al servidor. Inicia sesion de nuevo e intenta crear la polla otra vez.',
  create: 'No se pudo crear la polla. Inicia sesion de nuevo y revisa que el despliegue tenga la ultima version.',
}

export default function HomePage({ searchParams }: HomePageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pageError = searchParams?.error ? authErrorMessages[searchParams.error] : null
  const router = useRouter()
  const supabase = createClient()

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        })
        if (error) throw error
      }
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-lg text-center lg:text-left">
          {/* Logo/Badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 mb-8">
            <span className="text-amber-400 text-sm font-bold">⚽ FIFA WORLD CUP 2026</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            La mejor
            <span className="text-amber-400"> Polla</span>
            <br />
            del Mundial
          </h1>

          <p className="text-gray-400 text-lg mb-8 leading-relaxed">
            Predice resultados de los 104 partidos, compite con amigos en pollas privadas
            y sube al ranking con puntos automáticos en tiempo real.
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { icon: '🎯', text: '5 pts marcador exacto' },
              { icon: '🏆', text: 'Ranking en tiempo real' },
              { icon: '🔒', text: 'Predicciones bloqueadas' },
              { icon: '📊', text: 'Dashboard completo' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-2 text-gray-300 text-sm">
                <span className="text-xl">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Scoring rules */}
          <div className="card p-4 text-left">
            <p className="text-amber-400 font-bold text-sm mb-3">Sistema de Puntos</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Marcador exacto</span>
                <span className="text-amber-400 font-bold">5 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Ganador + dif. goles</span>
                <span className="text-green-400 font-bold">5 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Solo ganador/empate</span>
                <span className="text-blue-400 font-bold">3 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Sin acierto</span>
                <span className="text-gray-500">0 pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Form */}
      <div className="lg:w-96 xl:w-[440px] flex items-center justify-center p-8 lg:border-l border-gray-800">
        <div className="w-full max-w-sm">
          <div className="card p-8">
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-800 rounded-xl p-1 mb-8">
              {['Iniciar sesión', 'Registrarse'].map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => { setIsLogin(i === 0); setError(null) }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    (i === 0) === isLogin
                      ? 'bg-amber-500 text-gray-950'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    NOMBRE DE USUARIO
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="jugador123"
                    required={!isLogin}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                               text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none
                               focus:ring-1 focus:ring-amber-500 transition-colors text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                             text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none
                             focus:ring-1 focus:ring-amber-500 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  CONTRASEÑA
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                             text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none
                             focus:ring-1 focus:ring-amber-500 transition-colors text-sm"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {pageError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                  {pageError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? 'Cargando...' : isLogin ? 'Entrar' : 'Crear cuenta'}
              </button>
            </form>

            {isLogin && (
              <p className="text-center text-xs text-gray-500 mt-4">
                ¿Olvidaste tu contraseña?{' '}
                <Link href="/reset-password" className="text-amber-400 hover:underline">
                  Recupérala
                </Link>
              </p>
            )}
          </div>

          <p className="text-center text-xs text-gray-600 mt-6">
            Al continuar aceptas los{' '}
            <Link href="/terms" className="text-gray-400 hover:underline">términos</Link>
            {' '}y la{' '}
            <Link href="/privacy" className="text-gray-400 hover:underline">privacidad</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
