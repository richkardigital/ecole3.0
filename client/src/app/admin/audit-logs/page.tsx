import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  Shield, Search, Eye, Filter, User, Globe, Clock, Layers, FileText
} from 'lucide-react';
import api from '@/lib/api';

interface AuditLogEntry {
  id: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: string;
  ipAddress?: string;
  userId?: string;
  user?: { firstName: string; lastName: string; email: string; role?: string };
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN'>('ALL');
  
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await api.get('/audit-logs');
        setLogs(res.data);
      } catch (error) {
        console.error('Error fetching audit logs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const actionVariant = (action: string): 'success' | 'warning' | 'danger' | 'info' => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('REGISTER') || act.includes('ADD')) return 'success';
    if (act.includes('DELETE') || act.includes('REMOVE')) return 'danger';
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('TOGGLE')) return 'warning';
    return 'info';
  };

  const handleOpenDetail = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase();
    const matchesSearch = 
      log.action.toLowerCase().includes(q) ||
      (log.entity && log.entity.toLowerCase().includes(q)) ||
      (log.user && `${log.user.firstName} ${log.user.lastName} ${log.user.email}`.toLowerCase().includes(q)) ||
      (log.ipAddress && log.ipAddress.toLowerCase().includes(q));

    const act = log.action.toUpperCase();
    const matchesAction = 
      actionFilter === 'ALL' ? true :
      actionFilter === 'CREATE' ? (act.includes('CREATE') || act.includes('REGISTER') || act.includes('ADD')) :
      actionFilter === 'UPDATE' ? (act.includes('UPDATE') || act.includes('EDIT') || act.includes('TOGGLE')) :
      actionFilter === 'DELETE' ? (act.includes('DELETE') || act.includes('REMOVE')) :
      (act.includes('LOGIN') || act.includes('AUTH'));

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Logs d'Audit" 
        description="Journal de traçabilité et historique de toutes les opérations effectuées sur la plateforme."
      />

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par action, utilisateur, IP..."
            className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 font-medium"
          />
        </div>

        {/* Action Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap">
          {[
            { key: 'ALL', label: 'Toutes' },
            { key: 'CREATE', label: 'Créations' },
            { key: 'UPDATE', label: 'Modifications' },
            { key: 'DELETE', label: 'Suppressions' },
            { key: 'LOGIN', label: 'Connexions' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setActionFilter(f.key as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                actionFilter === f.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span className="text-xs font-bold text-slate-500">Chargement des logs d'audit...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Shield className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 text-base">Aucune donnée trouvée</p>
            <p className="text-xs text-slate-400 mt-1">Les événements de sécurité s'afficheront automatiquement ici.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">Horodatage</th>
                  <th className="py-3.5 px-4">Utilisateur</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entité ciblée</th>
                  <th className="py-3.5 px-4">Adresse IP</th>
                  <th className="py-3.5 px-6 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Timestamp */}
                    <td className="py-4 px-6 font-medium text-slate-600 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="py-4 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-black shrink-0">
                          {log.user ? log.user.firstName[0] : 'S'}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">
                            {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Système'}
                          </p>
                          {log.user?.email && (
                            <p className="text-[10px] text-slate-400 font-normal">{log.user.email}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-4">
                      <Badge variant={actionVariant(log.action)} size="sm">
                        {log.action}
                      </Badge>
                    </td>

                    {/* Entity */}
                    <td className="py-4 px-4 text-xs font-semibold text-slate-700">
                      {log.entity ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono text-[11px]">
                          {log.entity}
                        </span>
                      ) : '—'}
                    </td>

                    {/* IP Address */}
                    <td className="py-4 px-4 font-mono text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>{log.ipAddress || '127.0.0.1'}</span>
                      </div>
                    </td>

                    {/* Details button */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleOpenDetail(log)}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        title="Consulter l'événement"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ───────────────────────── DETAIL MODAL ───────────────────────── */}
      {selectedLog && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="Détails du Log d'Audit"
          size="md"
          accentColor="cyan"
          footer={
            <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>
              Fermer
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <Badge variant={actionVariant(selectedLog.action)}>
                  {selectedLog.action}
                </Badge>
                <span className="text-[10px] font-mono text-slate-400">ID: {selectedLog.id.slice(0, 12)}...</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Utilisateur</span>
                  <span className="font-bold text-slate-900">
                    {selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}` : 'Système'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Horodatage</span>
                  <span className="font-bold text-slate-900">{formatDate(selectedLog.createdAt)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Entité</span>
                  <span className="font-mono text-slate-800">{selectedLog.entity || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Adresse IP</span>
                  <span className="font-mono text-slate-800">{selectedLog.ipAddress || '127.0.0.1'}</span>
                </div>
              </div>
            </div>

            {selectedLog.metadata && (
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Données associées (Metadata)
                </h4>
                <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 text-xs font-mono overflow-x-auto custom-scrollbar">
                  {JSON.stringify(typeof selectedLog.metadata === 'string' ? JSON.parse(selectedLog.metadata || '{}') : selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
