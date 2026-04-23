import Link from "next/link";

export default function PlayHubPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <h1 className="mb-2 text-2xl font-bold text-white">Jogar — Riftbound online</h1>
        <p className="mb-8 text-sm text-gray-400">
          Crie uma sala com código ou entre com o código que o anfitrião enviou. Depois escolham os decks e abram o
          tabuleiro juntos.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/play/create"
            className="rounded-lg bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Criar sala
          </Link>
          <Link
            href="/play/join"
            className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 text-center text-sm font-medium text-gray-200 hover:bg-gray-700"
          >
            Entrar com código
          </Link>
        </div>
      </div>
    </div>
  );
}
