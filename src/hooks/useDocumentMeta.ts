import { useEffect } from 'react'

/**
 * Actualiza el título y la descripción del documento.
 * Se usa para que cada empresa tenga sus metadatos SEO sin tocar index.html.
 */
export function useDocumentMeta(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title

    let metaDescription: HTMLMetaElement | null = null
    let previousDescription: string | null = null

    if (description) {
      metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription) {
        metaDescription = document.createElement('meta')
        metaDescription.setAttribute('name', 'description')
        document.head.appendChild(metaDescription)
      } else {
        previousDescription = metaDescription.getAttribute('content')
      }
      metaDescription.setAttribute('content', description)
    }

    return () => {
      document.title = previousTitle
      if (metaDescription && previousDescription !== null) {
        metaDescription.setAttribute('content', previousDescription)
      }
    }
  }, [title, description])
}
