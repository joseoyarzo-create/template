import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useBusiness } from '@/context/BusinessContext'
import { useToast } from '@/context/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { catalogService, settingsService } from '@/services'
import type { BusinessSettingsPatch, InviteRow, MemberRow } from '@/services/settings'
import { AdminPageHeader } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Field, Input, Select, Textarea, Toggle } from '@/components/ui/Form'
import { Badge, RoleBadge, roleLabel } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback'
import { IconCopy, IconPlus, IconTrash, IconUsers } from '@/components/ui/Icons'
import { toAppError } from '@/lib/errors'
import { applyTheme } from '@/lib/theme'
import type { Business, MemberRole } from '@/types/database'

type Tab = 'negocio' | 'reservas' | 'equipo'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'negocio', label: 'Negocio' },
  { id: 'reservas', label: 'Reservas' },
  { id: 'equipo', label: 'Equipo y accesos' },
]

const ROLE_OPTIONS: MemberRole[] = ['owner', 'admin', 'staff']

interface SettingsForm {
  name: string
  legal_name: string
  tagline: string
  description: string
  address: string
  city: string
  region: string
  phone: string
  whatsapp: string
  email: string
  instagram: string
  map_url: string
  logo_url: string
  hero_image_url: string
  primary_color: string
  ink_color: string
  is_published: boolean
  booking_lead_minutes: string
  booking_max_advance_days: string
  slot_interval_minutes: string
}

function toForm(business: Business): SettingsForm {
  return {
    name: business.name || '',
    legal_name: business.legal_name || '',
    tagline: business.tagline || '',
    description: business.description || '',
    address: business.address || '',
    city: business.city || '',
    region: business.region || '',
    phone: business.phone || '',
    whatsapp: business.whatsapp || '',
    email: business.email || '',
    instagram: business.instagram || '',
    map_url: business.map_url || '',
    logo_url: business.logo_url || '',
    hero_image_url: business.hero_image_url || '',
    primary_color: business.primary_color || '#C9A227',
    ink_color: business.ink_color || '#0B0B0C',
    is_published: business.is_published,
    booking_lead_minutes: String(business.booking_lead_minutes ?? 60),
    booking_max_advance_days: String(business.booking_max_advance_days ?? 60),
    slot_interval_minutes: String(business.slot_interval_minutes ?? 15),
  }
}

/**
 * Configuración del negocio y del equipo.
 *
 * Los cambios de datos del negocio (nombre, contacto, colores, publicación) se
 * guardan en la tabla `businesses`; los miembros y las invitaciones controlan
 * quién puede acceder al panel. La autorización real la aplica RLS en Supabase.
 */
export function SettingsPage() {
  const { businessId, isOwner } = useAuth()
  const { refresh } = useBusiness()
  const toast = useToast()

  useDocumentMeta('Configuración', 'Panel de gestión')

  const [tab, setTab] = useState<Tab>('negocio')
  const [form, setForm] = useState<SettingsForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const business = useAsync(
    () => catalogService.fetchBusinessById(businessId as string),
    [businessId],
    { enabled: Boolean(businessId) },
  )

  useEffect(() => {
    if (business.data && !form) setForm(toForm(business.data))
  }, [business.data, form])

  function patchForm(patch: Partial<SettingsForm>) {
    setForm((current) => (current ? { ...current, ...patch } : current))
  }

  async function handleSaveBusiness() {
    if (!businessId || !form) return
    setError(null)
    if (form.name.trim().length < 2) {
      setError('El nombre del negocio es obligatorio.')
      return
    }

    const patch: BusinessSettingsPatch = {
      name: form.name.trim(),
      legal_name: form.legal_name.trim() || null,
      tagline: form.tagline.trim() || null,
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      region: form.region.trim() || null,
      phone: form.phone.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      email: form.email.trim() || null,
      instagram: form.instagram.trim() || null,
      map_url: form.map_url.trim() || null,
      logo_url: form.logo_url.trim() || null,
      hero_image_url: form.hero_image_url.trim() || null,
      primary_color: form.primary_color,
      ink_color: form.ink_color,
      is_published: form.is_published,
      booking_lead_minutes: Number.parseInt(form.booking_lead_minutes, 10) || 0,
      booking_max_advance_days: Number.parseInt(form.booking_max_advance_days, 10) || 30,
      slot_interval_minutes: Number.parseInt(form.slot_interval_minutes, 10) || 15,
    }

    setSaving(true)
    try {
      const updated = await settingsService.updateBusiness(businessId, patch)
      applyTheme({ primary: updated.primary_color, ink: updated.ink_color })
      toast.success('Configuración guardada.')
      void business.reload()
      void refresh()
    } catch (err) {
      setError(toAppError(err).message)
    } finally {
      setSaving(false)
    }
  }

  if (!businessId) return <ErrorBlock message="No se pudo determinar la empresa activa." />

  return (
    <div>
      <AdminPageHeader
        title="Configuración"
        description="Datos del negocio, reservas y equipo con acceso al panel."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? 'bg-brand/10 text-brand'
                : 'text-white/60 hover:bg-ink-800/70 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {business.loading ? (
        <LoadingBlock />
      ) : business.error ? (
        <ErrorBlock message={business.error} onRetry={business.reload} />
      ) : !form ? (
        <ErrorBlock message="No se pudieron cargar los datos del negocio." />
      ) : tab === 'negocio' ? (
        <BusinessTab form={form} patchForm={patchForm} />
      ) : tab === 'reservas' ? (
        <BookingSettingsTab form={form} patchForm={patchForm} />
      ) : (
        <TeamTab businessId={businessId} isOwner={isOwner} />
      )}

      {tab !== 'equipo' ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={handleSaveBusiness} loading={saving}>
            Guardar cambios
          </Button>
          {error ? <span className="text-sm text-red-300">{error}</span> : null}
        </div>
      ) : null}
    </div>
  )
}

function BusinessTab({
  form,
  patchForm,
}: {
  form: SettingsForm
  patchForm: (patch: Partial<SettingsForm>) => void
}) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Identidad" subtitle="Cómo aparece tu barbería en el sitio público." />
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre del negocio" required>
              <Input value={form.name} onChange={(e) => patchForm({ name: e.target.value })} />
            </Field>
            <Field label="Razón social (opcional)">
              <Input
                value={form.legal_name}
                onChange={(e) => patchForm({ legal_name: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Lema (opcional)" hint="Frase corta que aparece en la portada">
            <Input value={form.tagline} onChange={(e) => patchForm({ tagline: e.target.value })} />
          </Field>
          <Field label="Descripción (opcional)">
            <Textarea
              value={form.description}
              onChange={(e) => patchForm({ description: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Logotipo (URL)" hint="Imagen cuadrada o con fondo transparente">
              <Input
                value={form.logo_url}
                onChange={(e) => patchForm({ logo_url: e.target.value })}
                placeholder="https://…"
              />
            </Field>
            <Field label="Imagen de portada (URL)">
              <Input
                value={form.hero_image_url}
                onChange={(e) => patchForm({ hero_image_url: e.target.value })}
                placeholder="https://…"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Color principal" hint="Acentos, botones y detalles">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => patchForm({ primary_color: e.target.value })}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-ink-700 bg-ink-950/60"
                  aria-label="Color principal"
                />
                <Input
                  value={form.primary_color}
                  onChange={(e) => patchForm({ primary_color: e.target.value })}
                />
              </div>
            </Field>
            <Field label="Color oscuro base" hint="Fondo principal del sitio">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.ink_color}
                  onChange={(e) => patchForm({ ink_color: e.target.value })}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-ink-700 bg-ink-950/60"
                  aria-label="Color oscuro base"
                />
                <Input
                  value={form.ink_color}
                  onChange={(e) => patchForm({ ink_color: e.target.value })}
                />
              </div>
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Contacto y ubicación" subtitle="Datos que se muestran en el sitio." />
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Teléfono">
              <Input
                value={form.phone}
                onChange={(e) => patchForm({ phone: e.target.value })}
                inputMode="tel"
                placeholder="+56 9 1234 5678"
              />
            </Field>
            <Field label="WhatsApp" hint="Se usa para el botón de contacto directo">
              <Input
                value={form.whatsapp}
                onChange={(e) => patchForm({ whatsapp: e.target.value })}
                inputMode="tel"
                placeholder="+56 9 1234 5678"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => patchForm({ email: e.target.value })}
              />
            </Field>
            <Field label="Instagram (usuario)" hint="Sin @">
              <Input
                value={form.instagram}
                onChange={(e) => patchForm({ instagram: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Dirección">
            <Input value={form.address} onChange={(e) => patchForm({ address: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Comuna / Ciudad">
              <Input value={form.city} onChange={(e) => patchForm({ city: e.target.value })} />
            </Field>
            <Field label="Región">
              <Input value={form.region} onChange={(e) => patchForm({ region: e.target.value })} />
            </Field>
          </div>
          <Field label="Enlace de mapa (URL)" hint="Google Maps u otro servicio">
            <Input
              value={form.map_url}
              onChange={(e) => patchForm({ map_url: e.target.value })}
              placeholder="https://maps.google.com/…"
            />
          </Field>
        </div>
      </Card>

      <Card>
        <Toggle
          checked={form.is_published}
          onChange={(value) => patchForm({ is_published: value })}
          label="Publicar el sitio"
          description="Si está desactivado, el catálogo y la reserva no estarán visibles al público."
        />
      </Card>
    </div>
  )
}

function BookingSettingsTab({
  form,
  patchForm,
}: {
  form: SettingsForm
  patchForm: (patch: Partial<SettingsForm>) => void
}) {
  return (
    <Card>
      <CardHeader
        title="Reglas de reserva"
        subtitle="Controlan qué horas se ofrecen y con cuánta anticipación."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Anticipación mínima (min)"
          hint="Tiempo mínimo antes de una hora para reservarla"
        >
          <Input
            type="number"
            min={0}
            step={15}
            value={form.booking_lead_minutes}
            onChange={(e) => patchForm({ booking_lead_minutes: e.target.value })}
          />
        </Field>
        <Field label="Días máximos hacia adelante" hint="Hasta cuándo se puede agendar">
          <Input
            type="number"
            min={1}
            value={form.booking_max_advance_days}
            onChange={(e) => patchForm({ booking_max_advance_days: e.target.value })}
          />
        </Field>
        <Field label="Intervalo entre horas (min)" hint="Frecuencia de la grilla de horarios">
          <Input
            type="number"
            min={5}
            step={5}
            value={form.slot_interval_minutes}
            onChange={(e) => patchForm({ slot_interval_minutes: e.target.value })}
          />
        </Field>
      </div>
    </Card>
  )
}

function TeamTab({ businessId, isOwner }: { businessId: string; isOwner: boolean }) {
  const toast = useToast()
  const [inviteRole, setInviteRole] = useState<MemberRole>('admin')
  const [inviteEmail, setInviteEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [removing, setRemoving] = useState<MemberRow | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  const members = useAsync(() => settingsService.listMembers(businessId), [businessId], {
    enabled: Boolean(businessId),
  })
  const invites = useAsync(() => settingsService.listInvites(businessId), [businessId], {
    enabled: Boolean(businessId),
  })

  async function changeRole(member: MemberRow, role: MemberRole) {
    try {
      await settingsService.updateMemberRole(member.id, role)
      toast.success('Rol actualizado.')
      void members.reload()
    } catch (err) {
      toast.error(toAppError(err).message)
    }
  }

  async function handleRemove() {
    if (!removing) return
    setRemoveLoading(true)
    try {
      await settingsService.removeMember(removing.id)
      toast.success('Acceso revocado.')
      setRemoving(null)
      void members.reload()
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setRemoveLoading(false)
    }
  }

  async function createInvite() {
    setCreating(true)
    try {
      await settingsService.createInvite(businessId, {
        role: inviteRole,
        email: inviteEmail.trim() || null,
      })
      toast.success('Invitación creada.')
      setInviteEmail('')
      void invites.reload()
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setCreating(false)
    }
  }

  async function deleteInvite(invite: InviteRow) {
    try {
      await settingsService.deleteInvite(invite.id)
      toast.success('Invitación eliminada.')
      void invites.reload()
    } catch (err) {
      toast.error(toAppError(err).message)
    }
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token)
      toast.success('Código copiado.')
    } catch {
      toast.error('No se pudo copiar. Selecciona el código manualmente.')
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Miembros del panel"
          subtitle="Personas con acceso al panel de gestión y su nivel de permisos."
        />
        {members.loading ? (
          <LoadingBlock />
        ) : members.error ? (
          <ErrorBlock message={members.error} onRetry={members.reload} />
        ) : (members.data ?? []).length === 0 ? (
          <p className="text-sm text-white/55">Todavía no hay miembros registrados.</p>
        ) : (
          <ul className="divide-y divide-ink-800">
            {(members.data ?? []).map((member) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white/85">
                    {member.display_name || 'Miembro'}
                  </p>
                  <p className="truncate font-mono text-[11px] text-white/35">{member.user_id}</p>
                </div>
                <div className="flex items-center gap-3">
                  <RoleBadge role={member.role} />
                  <Select
                    value={member.role}
                    onChange={(e) => void changeRole(member, e.target.value as MemberRole)}
                    className="h-9 min-w-[150px] py-1 text-xs"
                    disabled={!isOwner}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(role)}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => setRemoving(member)}
                    className="rounded-lg p-2 text-white/55 transition hover:bg-red-500/15 hover:text-red-300"
                    aria-label="Revocar acceso"
                  >
                    <IconTrash size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!isOwner ? (
          <p className="mt-3 text-xs text-white/40">
            Solo el propietario puede cambiar roles o revocar accesos.
          </p>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Invitaciones"
          subtitle="Crea códigos de un solo uso para que nuevos administradores accedan."
        />
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Rol a otorgar">
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as MemberRole)}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Correo (opcional)" hint="Solo informativo">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="persona@correo.cl"
            />
          </Field>
          <Button onClick={createInvite} loading={creating} icon={<IconPlus size={16} />}>
            Crear
          </Button>
        </div>

        <div className="mt-5">
          {invites.loading ? (
            <LoadingBlock />
          ) : invites.error ? (
            <ErrorBlock message={invites.error} onRetry={invites.reload} />
          ) : (invites.data ?? []).length === 0 ? (
            <EmptyState
              icon={<IconUsers size={20} />}
              title="Sin invitaciones"
              description="Genera un código para entregar al nuevo administrador. Expira en 72 horas."
            />
          ) : (
            <ul className="divide-y divide-ink-800">
              {(invites.data ?? []).map((invite) => {
                const used = Boolean(invite.used_at)
                const expired = Boolean(invite.expires_at && new Date(invite.expires_at) < new Date())
                return (
                  <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-white/75">{invite.token}</p>
                      <p className="mt-1 text-[11px] text-white/40">
                        {invite.email ? `${invite.email} · ` : ''}
                        {roleLabel(invite.role)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {used ? (
                        <Badge tone="neutral">Usada</Badge>
                      ) : expired ? (
                        <Badge tone="danger">Expirada</Badge>
                      ) : (
                        <Badge tone="success">Disponible</Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => void copyToken(invite.token)}
                        className="rounded-lg p-2 text-white/55 transition hover:bg-ink-800 hover:text-white"
                        aria-label="Copiar código"
                      >
                        <IconCopy size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteInvite(invite)}
                        className="rounded-lg p-2 text-white/55 transition hover:bg-red-500/15 hover:text-red-300"
                        aria-label="Eliminar invitación"
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={handleRemove}
        loading={removeLoading}
        danger
        title="Revocar acceso"
        message={
          removing
            ? '¿Revocar el acceso de este miembro? Dejará de ver los datos del negocio inmediatamente.'
            : ''
        }
        confirmLabel="Revocar"
      />
    </div>
  )
}
