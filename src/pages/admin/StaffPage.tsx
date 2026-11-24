import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { servicesService, staffService } from '@/services'
import { AdminPageHeader } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Textarea, Toggle } from '@/components/ui/Form'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback'
import { IconCheck, IconPencil, IconPlus, IconTrash, IconUsers } from '@/components/ui/Icons'
import { toAppError } from '@/lib/errors'
import { formatPhoneDisplay, initials } from '@/lib/format'
import type { Service, Staff } from '@/types/database'

/**
 * Gestión del equipo de trabajo (profesionales).
 *
 * Además del alta y la edición, permite definir qué servicios realiza cada
 * profesional. La disponibilidad del sitio público se calcula a partir de
 * estos vínculos (tabla `staff_services`).
 */
export function StaffPage() {
  const { businessId } = useAuth()
  const toast = useToast()

  useDocumentMeta('Personal', 'Panel de gestión')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [assigning, setAssigning] = useState<Staff | null>(null)
  const [deleting, setDeleting] = useState<Staff | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const staff = useAsync(() => staffService.listStaff(businessId as string), [businessId], {
    enabled: Boolean(businessId),
  })
  const services = useAsync(
    () => servicesService.listServices(businessId as string),
    [businessId],
    { enabled: Boolean(businessId) },
  )
  const links = useAsync(
    () => staffService.listStaffServices(businessId as string),
    [businessId],
    { enabled: Boolean(businessId) },
  )

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await staffService.deleteStaff(deleting.id)
      toast.success('Profesional eliminado.')
      setDeleting(null)
      void staff.reload()
      void links.reload()
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!businessId) return <ErrorBlock message="No se pudo determinar la empresa activa." />

  const rows = staff.data ?? []
  const allServices = services.data ?? []
  const allLinks = links.data ?? []

  function servicesFor(staffId: string): string[] {
    return allLinks.filter((link) => link.staff_id === staffId).map((link) => link.service_id)
  }

  return (
    <div>
      <AdminPageHeader
        title="Personal"
        description="Administra los profesionales del negocio y los servicios que realizan."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            icon={<IconPlus size={16} />}
          >
            Nuevo profesional
          </Button>
        }
      />

      {staff.loading ? (
        <LoadingBlock />
      ) : staff.error ? (
        <ErrorBlock message={staff.error} onRetry={staff.reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={20} />}
          title="Aún no hay profesionales"
          description="Agrega a tu equipo para poder asignarles servicios, horarios y reservas."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
              Agregar profesional
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((member) => {
            const assigned = servicesFor(member.id)
            return (
              <Card key={member.id} className="flex flex-col">
                <div className="flex items-start gap-4">
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.full_name}
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-brand/40 bg-brand/10 font-display text-lg text-brand">
                      {initials(member.full_name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg text-white">{member.full_name}</h3>
                    {member.title ? (
                      <p className="text-sm text-brand/90">{member.title}</p>
                    ) : null}
                    <div className="mt-2">
                      {member.is_active ? (
                        <Badge tone="success">Activo</Badge>
                      ) : (
                        <Badge tone="danger">Inactivo</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {member.bio ? (
                  <p className="mt-3 line-clamp-2 text-sm text-white/55">{member.bio}</p>
                ) : null}

                <div className="mt-3 space-y-1 text-xs text-white/45">
                  {member.phone ? <p>{formatPhoneDisplay(member.phone)}</p> : null}
                  {member.email ? <p className="truncate">{member.email}</p> : null}
                  <p>
                    {assigned.length === 0
                      ? 'Sin servicios asignados'
                      : `${assigned.length} servicio${assigned.length === 1 ? '' : 's'} asignado${assigned.length === 1 ? '' : 's'}`}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-ink-800 pt-4">
                  <Button variant="ghost" size="sm" onClick={() => setAssigning(member)}>
                    Servicios
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(member)
                      setFormOpen(true)
                    }}
                    className="ml-auto rounded-lg p-2 text-white/60 transition hover:bg-ink-800 hover:text-white"
                    aria-label="Editar profesional"
                  >
                    <IconPencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(member)}
                    className="rounded-lg p-2 text-white/60 transition hover:bg-red-500/15 hover:text-red-300"
                    aria-label="Eliminar profesional"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {formOpen ? (
        <StaffFormModal
          businessId={businessId}
          member={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSaved={() => {
            setFormOpen(false)
            setEditing(null)
            void staff.reload()
          }}
        />
      ) : null}

      {assigning ? (
        <StaffServicesModal
          member={assigning}
          services={allServices}
          selected={servicesFor(assigning.id)}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            setAssigning(null)
            void links.reload()
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        danger
        title="Eliminar profesional"
        message={
          deleting
            ? `¿Eliminar a ${deleting.full_name}? Si tiene reservas asociadas, la operación puede fallar. Considera desactivarlo en su lugar.`
            : ''
        }
        confirmLabel="Eliminar"
      />
    </div>
  )
}

function StaffFormModal({
  businessId,
  member,
  onClose,
  onSaved,
}: {
  businessId: string
  member: Staff | null
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [fullName, setFullName] = useState(member?.full_name || '')
  const [title, setTitle] = useState(member?.title || '')
  const [bio, setBio] = useState(member?.bio || '')
  const [photoUrl, setPhotoUrl] = useState(member?.photo_url || '')
  const [email, setEmail] = useState(member?.email || '')
  const [phone, setPhone] = useState(member?.phone || '')
  const [sortOrder, setSortOrder] = useState(String(member?.sort_order ?? 0))
  const [isActive, setIsActive] = useState(member?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    if (fullName.trim().length < 2) {
      setError('Ingresa el nombre del profesional.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        business_id: businessId,
        full_name: fullName.trim(),
        title: title.trim() || null,
        bio: bio.trim() || null,
        photo_url: photoUrl.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        is_active: isActive,
        sort_order: Number.parseInt(sortOrder, 10) || 0,
      }
      if (member) {
        await staffService.updateStaff(member.id, payload)
        toast.success('Profesional actualizado.')
      } else {
        await staffService.createStaff(payload)
        toast.success('Profesional creado.')
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
      size="lg"
      title={member ? 'Editar profesional' : 'Nuevo profesional'}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" required>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Diego Fuentes"
            />
          </Field>
          <Field label="Cargo o especialidad" hint="Aparece bajo su nombre">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Barbero senior"
            />
          </Field>
        </div>
        <Field label="Descripción (opcional)">
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
        </Field>
        <Field label="Fotografía (URL, opcional)">
          <Input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://…"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono (opcional)">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </Field>
          <Field label="Correo (opcional)">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Orden" hint="Menor número aparece primero">
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </Field>
          <div className="flex items-end pb-1">
            <Toggle
              checked={isActive}
              onChange={setIsActive}
              label="Profesional activo"
              description="Puede recibir reservas"
            />
          </div>
        </div>
        {error ? (
          <div className="rounded-xl border border-red-500/40 bg-red-500/5 px-3.5 py-2.5 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

function StaffServicesModal({
  member,
  services,
  selected,
  onClose,
  onSaved,
}: {
  member: Staff
  services: Service[]
  selected: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [chosen, setChosen] = useState<string[]>(selected)
  const [saving, setSaving] = useState(false)

  function toggle(serviceId: string) {
    setChosen((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await staffService.setStaffServices(member.id, chosen)
      toast.success('Servicios actualizados.')
      onSaved()
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Servicios de ${member.full_name}`}
      description="Selecciona los servicios que este profesional puede realizar."
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
      {services.length === 0 ? (
        <p className="text-sm text-white/55">
          Todavía no hay servicios creados. Crea servicios en la sección “Servicios”.
        </p>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setChosen(services.map((service) => service.id))}
              className="text-brand underline-offset-4 hover:underline"
            >
              Seleccionar todos
            </button>
            <button
              type="button"
              onClick={() => setChosen([])}
              className="text-white/50 underline-offset-4 hover:underline"
            >
              Quitar todos
            </button>
          </div>
          <ul className="space-y-1.5">
            {services.map((service) => {
              const active = chosen.includes(service.id)
              return (
                <li key={service.id}>
                  <button
                    type="button"
                    onClick={() => toggle(service.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                      active
                        ? 'border-brand/50 bg-brand/10 text-white'
                        : 'border-ink-800 bg-ink-950/40 text-white/70 hover:border-ink-700'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        active ? 'border-brand bg-brand text-ink-950' : 'border-ink-600'
                      }`}
                    >
                      {active ? <IconCheck size={13} /> : null}
                    </span>
                    <span className="flex-1">{service.name}</span>
                    <span className="text-xs text-white/40">{service.duration_minutes} min</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Modal>
  )
}
