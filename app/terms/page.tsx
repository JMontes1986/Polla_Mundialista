import Link from 'next/link'

export const metadata = {
  title: 'Terminos | Polla Mundialista 2026',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 py-10">
      <section className="mx-auto max-w-3xl card p-6 sm:p-8">
        <Link href="/" className="text-sm font-semibold text-amber-400 hover:underline">
          Volver al inicio
        </Link>

        <h1 className="mt-6 text-3xl font-black text-white">Terminos de uso</h1>
        <p className="mt-4 text-gray-300 leading-relaxed">
          Al usar Polla Mundialista 2026 aceptas participar de forma responsable, mantener tus
          datos de acceso protegidos y respetar las reglas de puntaje definidas por la plataforma.
        </p>

        <div className="mt-8 space-y-5 text-sm leading-relaxed text-gray-400">
          <div>
            <h2 className="text-base font-bold text-white">Predicciones</h2>
            <p className="mt-2">
              Las predicciones pueden bloquearse antes del inicio de cada partido. Una vez
              bloqueadas, no podran editarse.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white">Puntajes</h2>
            <p className="mt-2">
              Los puntajes se calculan con las reglas visibles en la app. Los administradores
              pueden revisar datos o corregir resultados cuando sea necesario.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white">Pollas privadas</h2>
            <p className="mt-2">
              Los codigos de invitacion son responsabilidad de los participantes y administradores
              de cada polla.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
