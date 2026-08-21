'use client';

import type { OrganizationRole } from '@prisma/client';
import { AlertTriangle, Building2, Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  getKnowledgeTransferTargets,
  movePersonalFolderToOrganization,
  movePersonalNoteToOrganization,
  type KnowledgeTransferResult,
} from '@/app/actions/knowledge';

type TransferItem = {
  type: 'note' | 'folder';
  id: string;
  name: string;
};

type TransferTarget = {
  id: string;
  name: string;
  role: OrganizationRole;
  folders: Array<{
    id: string;
    name: string;
    path: string;
    parentId: string | null;
  }>;
};

export function KnowledgeTransferDialog({
  item,
  onClose,
  onTransferred,
}: {
  item: TransferItem | null;
  onClose: () => void;
  onTransferred: (result: KnowledgeTransferResult) => void;
}) {
  const [targets, setTargets] = useState<TransferTarget[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!item) return;
    let active = true;
    setLoading(true);
    setError('');
    void getKnowledgeTransferTargets().then((result) => {
      if (!active) return;
      if (result.success) {
        const nextTargets = result.data as TransferTarget[];
        setTargets(nextTargets);
        setOrganizationId(nextTargets[0]?.id || '');
        setFolderId('');
      } else setError(result.error);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [item]);

  const target = useMemo(
    () => targets.find((organization) => organization.id === organizationId),
    [organizationId, targets]
  );

  if (!item) return null;

  const transfer = async () => {
    if (!organizationId || busy) return;
    setBusy(true);
    setError('');
    const result =
      item.type === 'note'
        ? await movePersonalNoteToOrganization({
            noteId: item.id,
            organizationId,
            folderId: folderId || null,
          })
        : await movePersonalFolderToOrganization({
            folderId: item.id,
            organizationId,
            destinationFolderId: folderId || null,
          });
    if (result.success) onTransferred(result.data);
    else setError(result.error);
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="knowledge-transfer-title"
        className="w-full max-w-lg rounded-xl border border-[#34343c] bg-[#202024] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#303036] p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#34245f] text-[#d7ccff]">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="knowledge-transfer-title"
                className="font-semibold text-white"
              >
                Mover para organização
              </h2>
              <p className="mt-1 text-xs text-[#8f8f98]">
                {item.type === 'folder' ? 'Pasta' : 'Nota'}: {item.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded p-1.5 text-[#8f8f98] hover:bg-[#2a2a30] hover:text-white disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 p-4">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-[#8f8f98]">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando
              destinos...
            </div>
          ) : targets.length ? (
            <>
              <label className="block text-xs text-[#9b9ba3]">
                Organização
                <select
                  value={organizationId}
                  onChange={(event) => {
                    setOrganizationId(event.target.value);
                    setFolderId('');
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-[#303036] bg-[#111] px-3 text-sm text-white outline-none focus:border-[#6f55d9]"
                >
                  {targets.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name} · {organization.role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-[#9b9ba3]">
                Destino no KCS
                <select
                  value={folderId}
                  onChange={(event) => setFolderId(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-[#303036] bg-[#111] px-3 text-sm text-white outline-none focus:border-[#6f55d9]"
                >
                  <option value="">Raiz do KCS</option>
                  {target?.folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.path}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <div className="text-xs leading-5 text-amber-100/90">
                    <p className="font-medium">
                      Mover para o KCS de {target?.name}?
                    </p>
                    <p className="mt-1">
                      O conteúdo deixará suas notas pessoais e ficará visível
                      aos membros autorizados. Somente administradores e
                      proprietários poderão editar o conteúdo organizacional.
                    </p>
                    {target?.role === 'MEMBER' && (
                      <p className="mt-1 font-medium text-amber-200">
                        Como MEMBER, você continuará podendo ler e comentar, mas
                        perderá a permissão de edição após a transferência.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="py-6 text-sm text-[#8f8f98]">
              Você ainda não participa de uma organização ativa.
            </p>
          )}
          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-[#303036] p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-9 rounded-md border border-[#303036] px-4 text-sm text-[#b9b9c1] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void transfer()}
            disabled={busy || loading || !organizationId}
            className="flex h-9 items-center gap-2 rounded-md bg-[#6f55d9] px-4 text-sm text-white disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Mover para organização
          </button>
        </footer>
      </div>
    </div>
  );
}

export type { TransferItem };
