import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useBusiness } from '@/context/BusinessContext'
import { useToast } from '@/context/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { customersService } from '@/services'
import { AdminPageHeader } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Textarea } from '@/components/ui/Form'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback'
import { BookingStatusBadge } from '@/components/ui/Badge'
import { IconPencil, IconPlus, IconTrash, IconUsers } from '@/components/ui/Icons'
import { toAppError } from '@/lib/errors'
import { formatCurrency, formatPhoneDisplay } from '@/lib/format'
import { formatDayShort, formatTime } from '@/lib/datetime'
import type { Customer } from '@/types/database'

/** Gestión de clientes: alta, edición, eliminación y ficha con su historial. */
export function CustomersPage() {
  const { businessId } = useAuth()
  const { business } = useBusiness()
  const toast = useToast()

  useDocumentMeta('Clientes', 'Panel de gestión')

  const timezone = business?.timezone || 'America/Santiago'

  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [history, setHistory] = useState<Customer | null>(null)

  const customers = useAsync(
    () => customersService.listCustomers(businessId as string, search.trim() || undefined),
    [businessId, search],
    { enabled: Boolean(businessId) },
  )

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await customersService.deleteCustomer(deleting.id)
      toast.success('Cliente eliminado.')
      setDeleting(null)
      void customers.reload()
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!businessId) return <ErrorBlock message="No se pudo determinar la empresa activa." />

  const rows = customers.data ?? []

  return (
    <div>
      <AdminPageHeader
        title="Clientes"
        description="Base de clientes del negocio y su historial de reservas."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            icon={<IconPlus size={16} />}
          >
            Nuevo cliente
          </Button>
        }
      />

      <Card padding="sm" className="mb-5">
        <Field label="Buscar cliente">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre, teléfono o correo"
          />
        </Field>
      </Card>

      {customers.loading ? (
        <LoadingBlock />
      ) : customers.error ? (
        <ErrorBlock message={customers.error} onRetry={customers.reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={20} />}
          title="Sin clientes"
          description="Los clientes se crean automáticamente al reservar o puedes agregarlos manualmente."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
              Agregar cliente
            </Button>
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-ink-800 text-left text-xs uppercase tracking-wider text-white/45">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Correo</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {rows.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setHistory(customer)}
                        className="text-left text-white/85 transition hover:text-brand"
                      >
                        {customer.full_name}
                      </button>
                      {customer.notes ? (
                        <span className="block truncate text-xs text-white/40">
                          {customer.notes}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {formatPhoneDisplay(customer.phone)}
                    </td>
                    <td className="px-4 py-3 text-white/60">{customer.email || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHistory(customer)}
                        >
                          Historial
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(customer)
                            setFormOpen(true)
                          }}
                          className="rounded-lg p-2 text-white/60 transition hover:bg-ink-800 hover:text-white"
                          aria-label="Editar cliente"
                        >
                          <IconPencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(customer)}
                          className="rounded-lg p-2 text-white/60 transition hover:bg-red-500/15 hover:text-red-300"
                          aria-label="Eliminar cliente"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-ink-800 px-4 py-3 text-xs text-white/40">
            {rows.length} cliente{rows.length === 1 ? '' : 's'}.
          </div>
        </Card>
      )}

      {formOpen ? (
        <CustomerFormModal
          businessId={businessId}
          customer={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSaved={() => {
            setFormOpen(false)
            setEditing(null)
            void customers.reload()
          }}
        />
      ) : null}

      {history ? (
        <CustomerHistoryModal
          customer={history}
          businessId={businessId}
          timezone={timezone}
          onClose={() => setHistory(null)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        danger
        title="Eliminar cliente"
        message={
          deleting
            ? `¿Eliminar a ${deleting.full_name}? Sus reservas se conservarán en el historial.`
            : ''
        }
        confirmLabel="Eliminar"
      />
    </div>
  )
}

function CustomerFormModal({
  businessId,
  customer,
  onClose,
  onSaved,
}: {
  businessId: string
  customer: Customer | null
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [fullName, setFullName] = useState(customer?.full_name || '')
  const [phone, setPhone] = useState(customer?.phone || '')
  const [email, setEmail] = useState(customer?.email || '')
  const [notes, setNotes] = useState(customer?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    if (fullName.trim().length < 2) {
      setError('Ingresa el nombre del cliente.')
      return
    }
    if (phone.replace(/\D/g, '').length < 8) {
      setError('Ingresa un teléfono válido.')
      return
    }
    setSaving(true)
    try {
      if (customer) {
        await customersService.updateCustomer(customer.id, {
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          notes: notes.trim() || null,
        })
        toast.success('Cliente actualizado.')
      } else {
        await customersService.createCustomer({
          business_id: businessId,
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          notes: notes.trim() || null,
        })
        toast.success('Cliente creado.')
      }
      onSaved()
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={customer ? 'Editar cliente' : 'Nuevo cliente'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre completo" required>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono" required>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </Field>
          <Field label="Correo (opcional)">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <Field label="Notas (opcional)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/5 px-3.5 py-2.5 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

function CustomerHistoryModal({
  customer,
  businessId,
  timezone,
  onClose,
}: {
  customer: Customer
  businessId: string
  timezone: string
  onClose: () => void
}) {
  const history = useAsync(
    () => customersService.listCustomerBookings(customer.phone, businessId),
    [customer.phone, businessId],
    { enabled: Boolean(businessId) },
  )

  return (
    <Modal open onClose={onClose} size="lg" title={customer.full_name} description="Historial de reservas">
      {history.loading ? (
        <LoadingBlock />
      ) : history.error ? (
        <ErrorBlock message={history.error} onRetry={history.reload} />
      ) : (history.data ?? []).length === 0 ? (
        <p className="text-sm text-white/55">Este cliente todavía no tiene reservas registradas.</p>
      ) : (
        <ul className="divide-y divide-ink-800">
          {(history.data ?? []).map((booking) => (
            <li key={booking.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-white/85">
                  {formatDayShort(booking.starts_at, timezone)} ·{' '}
                  {formatTime(booking.starts_at, timezone)}
                </p>
                <p className="truncate text-xs text-white/50">
                  {booking.service_name_snapshot} · {booking.staff_name_snapshot}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm text-white/70">
                  {formatCurrency(booking.price_snapshot)}
                </span>
                <BookingStatusBadge status={booking.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
