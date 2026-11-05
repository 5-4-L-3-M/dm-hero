/**
 * The pill for an entity mention ({{npc:12}}) in rendered notes. A soft tint of the
 * entity color with the text in the normal reading color, so a paragraph full of
 * names stays easy to read.
 */
export function entityBadgeHtml(type: string, id: string | number, color: string, icon: string, labelHtml: string, clickable = true): string {
  const style = [
    `background: color-mix(in srgb, ${color} 18%, transparent)`,
    `border: 1px solid color-mix(in srgb, ${color} 45%, transparent)`,
    'color: inherit',
    'padding: 0 6px 0 4px',
    'border-radius: 6px',
    'font-size: 0.95em',
    'font-weight: 600',
    'white-space: nowrap',
    'box-decoration-break: clone',
    `cursor: ${clickable ? 'pointer' : 'default'}`,
  ].join('; ')
  return `<span class="entity-badge" data-type="${type}" data-id="${id}" style="${style}"><i class="mdi ${icon}" style="color: ${color}; margin-right: 3px; font-size: 0.95em;"></i>${labelHtml}</span>`
}

/** A player's label: their name, then the character small and muted */
export function playerBadgeLabel(characterName: string, humanName: string | null): string {
  return humanName ? `${humanName} <span style="font-weight: 400; opacity: 0.65; font-size: 0.85em;">(${characterName})</span>` : `<em>${characterName}</em>`
}
