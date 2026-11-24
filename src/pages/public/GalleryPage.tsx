import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { businessConfig } from '@/config/business.config'
import { useBusiness } from '@/context/BusinessContext'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { buttonClasses } from '@/components/ui/Button'
import { EmptyState, ErrorBlock, LoadingBlock, SectionHeading } from '@/components/ui/Feedback'
import { IconChevronLeft, IconChevronRight, IconClose, IconImage } from '@/components/ui/Icons'

/**
 * Galería pública. Se habilita con businessConfig.features.gallery.
 * Las imágenes se administran desde el panel y se leen en el catálogo público.
 */
export function GalleryPage() {
  const { gallery, displayName, loading, error, ready } = useBusiness()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useDocumentMeta(`Galería — ${displayName}`, businessConfig.copy.gallerySubtitle)

  const close = useCallback(() => setActiveIndex(null), [])
  const prev = useCallback(
    () => setActiveIndex((i) => (i === null ? i : (i - 1 + gallery.length) % gallery.length)),
    [gallery.length],
  )
  const next = useCallback(
    () => setActiveIndex((i) => (i === null ? i : (i + 1) % gallery.length)),
    [gallery.length],
  )

  useEffect(() => {
    if (activeIndex === null) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowLeft') prev()
      if (event.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [activeIndex, close, prev, next])

  const active = activeIndex === null ? null : gallery[activeIndex]

  return (
    <div className="container-page py-14 sm:py-20">
      <SectionHeading
        eyebrow="Nuestro trabajo"
        title={businessConfig.copy.galleryTitle}
        subtitle={businessConfig.copy.gallerySubtitle}
      />

      {loading ? <LoadingBlock label="Cargando galería…" /> : null}

      {error && !ready ? (
        <div className="mt-10">
          <ErrorBlock message={error} />
        </div>
      ) : null}

      {ready && gallery.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={<IconImage size={22} />}
            title="Aún no hay fotografías"
            description="El negocio todavía no ha publicado imágenes en la galería."
            action={
              <Link to="/reservar" className={buttonClasses('secondary', 'md')}>
                Reservar una hora
              </Link>
            }
          />
        </div>
      ) : null}

      {gallery.length > 0 ? (
        <div className="mt-10 columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
          {gallery.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="group relative block w-full overflow-hidden rounded-xl border border-ink-800"
              aria-label={image.title ? `Ampliar: ${image.title}` : 'Ampliar imagen'}
            >
              <img
                src={image.image_url}
                alt={image.title || 'Trabajo de la barbería'}
                loading="lazy"
                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-ink-950/0 transition-colors group-hover:bg-ink-950/25" />
            </button>
          ))}
        </div>
      ) : null}

      {/* --------------------------- Visor ampliado -------------------------- */}
      {active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 animate-fade-in">
          <button
            type="button"
            onClick={close}
            aria-label="Cerrar"
            className="absolute right-4 top-4 text-white/70 transition hover:text-white"
          >
            <IconClose size={26} />
          </button>

          {gallery.length > 1 ? (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Anterior"
                className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/80 transition hover:bg-black/70 sm:left-6"
              >
                <IconChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Siguiente"
                className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/80 transition hover:bg-black/70 sm:right-6"
              >
                <IconChevronRight size={22} />
              </button>
            </>
          ) : null}

          <figure className="max-h-[88vh] max-w-5xl animate-scale-in">
            <img
              src={active.image_url}
              alt={active.title || 'Trabajo de la barbería'}
              className="max-h-[82vh] w-auto rounded-xl object-contain"
            />
            {active.title ? (
              <figcaption className="mt-3 text-center text-sm text-white/70">
                {active.title}
              </figcaption>
            ) : null}
          </figure>
        </div>
      ) : null}
    </div>
  )
}
