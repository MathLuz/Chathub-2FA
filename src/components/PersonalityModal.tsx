import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  PERSONALITIES,
  CUSTOM_NAME_MAX,
  CUSTOM_DESCRIPTION_MAX,
  CUSTOM_INSTRUCTIONS_MAX,
  type Personality,
  type CustomPersonalityInput,
} from '../lib/personalities';

interface PersonalityModalProps {
  selectedId: string;
  customPersonalities: Personality[];
  onSelect: (id: string) => void;
  onSaveCustom: (input: CustomPersonalityInput) => void;
  onDeleteCustom: (id: string) => void;
  onClose: () => void;
}

const EMPTY_FORM: CustomPersonalityInput = { name: '', description: '', instructions: '' };

const inputClass =
  'w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 focus:outline-none focus:border-purple-400 transition-colors placeholder:text-zinc-500 dark:placeholder:text-zinc-400 text-sm md:text-base';

export function PersonalityModal({
  selectedId,
  customPersonalities,
  onSelect,
  onSaveCustom,
  onDeleteCustom,
  onClose,
}: PersonalityModalProps) {
  // null = lista; objeto = formulário de criar/editar
  const [form, setForm] = useState<CustomPersonalityInput | null>(null);

  // Esc: no formulário volta para a lista; na lista fecha o modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (form) setForm(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [form, onClose]);

  const canSave = !!form && form.name.trim().length > 0 && form.instructions.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !canSave) return;
    onSaveCustom(form);
    setForm(null);
  };

  const handleDelete = (p: Personality) => {
    if (window.confirm(`Apagar a personalidade "${p.name}"?`)) onDeleteCustom(p.id);
  };

  const renderCard = (p: Personality) => {
    const Icon = p.icon;
    const active = p.id === selectedId;
    return (
      <div key={p.id} className="relative">
        <button
          onClick={() => onSelect(p.id)}
          className={`w-full h-full text-left p-4 rounded-xl border-2 transition-all flex gap-3 ${
            p.custom ? 'pb-10' : ''
          } ${
            active
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg shadow-purple-500/10'
              : 'border-zinc-200 dark:border-zinc-700 hover:border-purple-400/60 hover:bg-zinc-50 dark:hover:bg-zinc-700/40'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              active
                ? 'bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 text-white'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-zinc-900 dark:text-white truncate">{p.name}</span>
              {active && <Check className="w-4 h-4 text-purple-500 flex-shrink-0" />}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5 break-words">
              {p.description || 'Personalidade personalizada'}
            </p>
          </div>
        </button>
        {p.custom && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            <button
              onClick={() => setForm({ id: p.id, name: p.name, description: p.description, instructions: p.instructions })}
              className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-purple-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              title="Editar"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(p)}
              className="p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              title="Apagar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-4 z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="personality-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-zinc-300 dark:border-zinc-700 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4 p-4 md:p-5 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-start gap-2 min-w-0">
            {form && (
              <button
                onClick={() => setForm(null)}
                className="p-2 -ml-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex-shrink-0"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0">
              <h2
                id="personality-title"
                className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent"
              >
                {form ? (form.id ? 'Editar personalidade' : 'Nova personalidade') : 'Personalidade do modelo'}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {form
                  ? 'Escreva como a IA deve se comportar e responder.'
                  : 'Escolha como a IA deve responder nesta conversa.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex-shrink-0"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {form ? (
          <form onSubmit={handleSubmit} className="overflow-y-auto p-4 md:p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nome</label>
              <input
                autoFocus
                value={form.name}
                maxLength={CUSTOM_NAME_MAX}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Pirata, Revisor de textos, Coach..."
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Descrição curta <span className="text-zinc-500 font-normal">(opcional)</span>
              </label>
              <input
                value={form.description}
                maxLength={CUSTOM_DESCRIPTION_MAX}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Aparece embaixo do nome na lista"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Instruções</label>
              <textarea
                value={form.instructions}
                maxLength={CUSTOM_INSTRUCTIONS_MAX}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                rows={7}
                placeholder="Ex.: Você é um pirata bem-humorado. Responda sempre como um pirata, usando expressões do mar, mas sem deixar de ajudar de verdade."
                className={`${inputClass} resize-y min-h-[140px]`}
              />
              <div className="text-xs text-zinc-500 text-right mt-1">
                {form.instructions.length}/{CUSTOM_INSTRUCTIONS_MAX}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!canSave}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/20 transition-all"
              >
                Salvar e usar
              </button>
            </div>
          </form>
        ) : (
          <div className="overflow-y-auto p-4 md:p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{PERSONALITIES.map(renderCard)}</div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
                Suas personalidades
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customPersonalities.map(renderCard)}
                <button
                  onClick={() => setForm({ ...EMPTY_FORM })}
                  className="p-4 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-purple-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/40 text-zinc-600 dark:text-zinc-300 flex items-center justify-center gap-2 font-medium transition-all min-h-[76px]"
                >
                  <Plus className="w-5 h-5" />
                  Criar personalidade
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
