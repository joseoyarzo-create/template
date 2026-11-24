import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { servicesService } from '@/services'
import { AdminPageHeader } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea, Toggle } from '@/components/ui/Form'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback'
import { IconPencil, IconPlus, IconScissors, IconTrash } from '@/components/ui/Icons'
import { toAppError } from '@/lib/errors'
import { formatCurrency } from '@/lib/format'
import { formatDuration } from '@/lib/datetime'
import type { Service, ServiceCategory } from '@/types/database'

/**
 * Gestión de servicios y categorías.
 * El catálogo público se alimenta de estas tablas; los precios se guardan en
 * pesos chilenos (enteros) y la duración en minutos.
 */
export function AdminServicesPage() {
  const { businessId } = useAuth()
  const toast = useToast()

  useDocumentMeta('Servicios y precios', 'Panel de gestión')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [deleting, setDeleting] = useState<Service | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  const services = useAsync(() => servicesService.listServices(businessId as string), [businessId], {
    enabled: Boolean(businessId),
  })
  const categories = useAsync(
    () => servicesService.listCategories(businessId as string),
    [businessId],
    { enabled: Boolean(businessId) },
  )

  async function handleDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await servicesService.deleteService(deleting.id)
      toast.success('Servicio eliminado.')
      setDeleting(null)
      void services.reload()
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (!businessId) return <ErrorBlock message="No se pudo determinar la empresa activa." />

  const rows = services.data ?? []
  const cats = categories.data ?? []

  return (
    <div>
      <AdminPageHeader
        title="Servicios y precios"
        description="Define los servicios, su duración y su valor."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setCategoriesOpen(true)}>
              Categorías
            </Button>
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
              icon={<IconPlus size={16} />}
            >
              Nuevo servicio
            </Button>
          </div>
        }
      />

      {services.loading ? (
        <LoadingBlock />
      ) : services.error ? (
        <ErrorBlock message={services.error} onRetry={services.reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<IconScissors size={20} />}
          title="Aún no hay servicios"
          description="Crea tu primer servicio para que aparezca en el catálogo público."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>
              Crear servicio
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((service) => {
            const category = cats.find((c) => c.id === service.category_id)
            return (
              <Card key={service.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg text-white">{service.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {category ? <Badge tone="neutral">{category.name}</Badge> : null}
                      {service.is_active ? (
                        <Badge tone="success">Activo</Badge>
                      ) : (
                        <Badge tone="danger">Inactivo</Badge>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 font-display text-lg text-brand">
                    {formatCurrency(service.price)}
                  </span>
                </div>

                {service.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-white/55">{service.description}</p>
                ) : null}

                <p className="mt-3 text-xs text-white/45">
                  Duración: {formatDuration(service.duration_minutes)}
                </p>

                <div className="mt-4 flex items-center gap-2 border-t border-ink-800 pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconPencil size={15} />}
                    onClick={() => {
                      setEditing(service)
                      setFormOpen(true)
                    }}
                  >
                    Editar
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleting(service)}
                    className="ml-auto rounded-lg p-2 text-white/55 transition hover:bg-red-500/15 hover:text-red-300"
                    aria-label="Eliminar servicio"
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
        <ServiceFormModal
          businessId={businessId}
          categories={cats}
          service={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSaved={() => {
            setFormOpen(false)
            setEditing(null)
            void services.reload()
          }}
        />
      ) : null}

      {categoriesOpen ? (
        <CategoriesModal
          businessId={businessId}
          categories={cats}
          onClose={() => setCategoriesOpen(false)}
          onChanged={() => {
            void categories.reload()
            void services.reload()
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        danger
        title="Eliminar servicio"
        message={deleting ? `¿Eliminar "${deleting.name}" del catálogo?` : ''}
        confirmLabel="Eliminar"
      />
    </div>
  )
}

function ServiceFormModal({
  businessId,
  categories,
  service,
  onClose,
  onSaved,
}: {
  businessId: string
  categories: ServiceCategory[]
  service: Service | null
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [name, setName] = useState(service?.name || '')
  const [description, setDescription] = useState(service?.description || '')
  const [categoryId, setCategoryId] = useState(service?.category_id || '')
  const [duration, setDuration] = useState(String(service?.duration_minutes ?? 30))
  const [price, setPrice] = useState(String(service?.price ?? 0))
  const [imageUrl, setImageUrl] = useState(service?.image_url || '')
  const [isActive, setIsActive] = useState(service?.is_active ?? true)
  const [sortOrder, setSortOrder] = useState(String(service?.sort_order ?? 0))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    const durationNumber = Number.parseInt(duration, 10)
    const priceNumber = Number.parseInt(price, 10)
    if (name.trim().length < 2) {
      setError('Ingresa el nombre del servicio.')
      return
    }
    if (!Number.isFinite(durationNumber) || durationNumber <= 0) {
      setError('La duración debe ser un número de minutos mayor que 0.')
      return
    }
    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      setError('El precio debe ser un número válido en pesos.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        business_id: businessId,
        name: name.trim(),
        description: description.trim() || null,
        category_id: categoryId || null,
        duration_minutes: durationNumber,
        price: priceNumber,
        image_url: imageUrl.trim() || null,
        is_active: isActive,
        sort_order: Number.parseInt(sortOrder, 10) || 0,
      }
      if (service) {
        await servicesService.updateService(service.id, payload)
        toast.success('Servicio actualizado.')
      } else {
        await servicesService.createService(payload)
        toast.success('Servicio creado.')
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
      title={service ? 'Editar servicio' : 'Nuevo servicio'}
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
        <Field label="Nombre del servicio" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Corte clásico" />
        </Field>
        <Field label="Descripción (opcional)">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Categoría">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Duración (minutos)" required hint="Ej: 30, 45, 60">
            <Input
              type="number"
              min={5}
              step={5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </Field>
          <Field label="Precio (CLP)" required hint="Solo números">
            <Input
              type="number"
              min={0}
              step={500}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Imagen (URL, opcional)">
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
          />
        </Field>
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
              label="Servicio activo"
              description="Visible en el catálogo público"
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

function CategoriesModal({
  businessId,
  categories,
  onClose,
  onChanged,
}: {
  businessId: string
  categories: ServiceCategory[]
  onClose: () => void
  onChanged: () => void
}) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function addCategory() {
    if (name.trim().length < 2) return
    setSaving(true)
    try {
      await servicesService.createCategory(businessId, name.trim(), categories.length)
      toast.success('Categoría creada.')
      setName('')
      onChanged()
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setSaving(false)
    }
  }

  async function removeCategory(id: string) {
    try {
      await servicesService.deleteCategory(id)
      toast.success('Categoría eliminada.')
      onChanged()
    } catch (err) {
      toast.error(toAppError(err).message)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Categorías de servicios"
      description="Agrupa tus servicios para ordenar el catálogo."
    >
      <div className="space-y-4">
        <div className="flex items-end gap-2">
          <Field label="Nueva categoría" className="flex-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Cortes, Barba, Color"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addCategory()
              }}
            />
          </Field>
          <Button onClick={addCategory} loading={saving} icon={<IconPlus size={16} />}>
            Agregar
          </Button>
        </div>

        {categories.length === 0 ? (
          <p className="text-sm text-white/50">Todavía no hay categorías.</p>
        ) : (
          <ul className="divide-y divide-ink-800">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm text-white/80">{category.name}</span>
                <button
                  type="button"
                  onClick={() => void removeCategory(category.id)}
                  className="rounded-lg p-2 text-white/55 transition hover:bg-red-500/15 hover:text-red-300"
                  aria-label={`Eliminar ${category.name}`}
                >
                  <IconTrash size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
