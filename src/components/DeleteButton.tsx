"use client";

export function DeleteButton({ action }: { action: () => void }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("¿Eliminar este proceso? Esta acción no se puede deshacer.")) {
          e.preventDefault();
        }
      }}
      className="max-w-2xl border-t pt-4"
    >
      <button className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
        Eliminar proceso
      </button>
    </form>
  );
}
