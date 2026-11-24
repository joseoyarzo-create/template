import { useBusiness } from '@/context/BusinessContext'
import { weekdayShortName } from '@/lib/datetime'

/**
 * Horario de atención general.
 *
 * Se calcula como la unión de los tramos horarios configurados para el personal,
 * agrupando días consecutivos con el mismo rango. Si aún no hay horarios
 * cargados, se indica que la disponibilidad se consulta al reservar.
 */
export function OpeningHours({ className }: { className?: string }) {
  const { workingHours, staff } = useBusiness()

  const daily = Array.from({ length: 7 }, (_, weekday) => {
    const ranges = workingHours.filter((wh) => wh.weekday === weekday)
    if (ranges.length === 0 || staff.length === 0) return null
    const start = ranges.reduce(
      (min, r) => (r.start_time < min ? r.start_time : min),
      ranges[0].start_time,
    )
    const end = ranges.reduce((max, r) => (r.end_time > max ? r.end_time : max), ranges[0].end_time)
    return { weekday, start: start.slice(0, 5), end: end.slice(0, 5) }
  }).filter(Boolean) as Array<{ weekday: number; start: string; end: string }>

  const grouped: Array<{ label: string; start: string; end: string }> = []
  for (const entry of daily) {
    const previous = grouped[grouped.length - 1]
    const sameRange = previous && previous.start === entry.start && previous.end === entry.end
    if (sameRange) {
      previous.label = `${previous.label.split(' a ')[0]} a ${weekdayShortName(entry.weekday)}`
    } else {
      grouped.push({ label: weekdayShortName(entry.weekday), start: entry.start, end: entry.end })
    }
  }

  if (grouped.length === 0) {
    return (
      <p className={className}>
        <span className="text-white/45">Consulta la disponibilidad al reservar tu hora.</span>
      </p>
    )
  }

  return (
    <ul className={className}>
      {grouped.map((g) => (
        <li key={g.label} className="flex justify-between gap-4">
          <span>{g.label}</span>
          <span className="text-white/85">
            {g.start} – {g.end}
          </span>
        </li>
      ))}
    </ul>
  )
}
