import Link from 'next/link'

export const metadata = {
  title: 'Privacidad | Polla Mundialista 2026',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-10">
      <section className="mx-auto max-w-3xl card p-6 sm:p-8">
        <Link href="/" className="text-sm font-semibold text-amber-400 hover:underline">
          Volver al inicio
        </Link>

        <h1 className="mt-6 text-3xl font-black text-white">Politica de privacidad</h1>
        <p className="mt-4 text-gray-300 leading-relaxed">
          Polla Mundialista 2026 usa tus datos de cuenta para autenticarte, guardar tus
          predicciones, calcular puntajes y mostrar rankings dentro de las pollas en las que
          participas.
        </p>

        <div className="mt-8 space-y-5 text-sm leading-relaxed text-gray-400">
          <div>
            <h2 className="text-base font-bold text-white">Datos que se guardan</h2>
            <p className="mt-2">
              Se almacenan datos basicos como correo, nombre de usuario, pollas, predicciones,
              puntajes y actividad necesaria para operar la competencia.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white">Uso de la informacion</h2>
            <p className="mt-2">
              La informacion se usa para iniciar sesion, recuperar acceso, administrar pollas,
              bloquear predicciones a tiempo y calcular resultados.
            </p>
          </div>

          <div>
            <h2 className="text-base font-bold text-white">Seguridad</h2>
            <p className="mt-2">
              La autenticacion y el almacenamiento se apoyan en Supabase. No se deben compartir
              contrasenas ni codigos privados de acceso a pollas.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
